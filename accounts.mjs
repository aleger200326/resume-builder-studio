import {DatabaseSync} from 'node:sqlite'
import {randomBytes,randomUUID,scrypt as derive,timingSafeEqual,createHash,createCipheriv,createDecipheriv} from 'node:crypto'
import {promisify} from 'node:util'
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs'
import {join} from 'node:path'

const scrypt=promisify(derive)

function createNeonStore(connectionString){
  const endpoint='https://'+new URL(connectionString).hostname+'/sql'
  let ready=null
  async function query(sql,params=[]){
    const pgSql=sql.replace(/\?/g,(() => {let i=0;return ()=>'$'+(++i)})())
    const res=await fetch(endpoint,{
      method:'POST',
      headers:{'Content-Type':'application/json','Neon-Connection-String':connectionString},
      body:JSON.stringify({query:pgSql,params})
    })
    const text=await res.text()
    let data
    try{data=JSON.parse(text)}catch{throw new Error('Invalid Neon response')}
    if(!res.ok)throw new Error(data?.message||'Neon SQL error '+res.status)
    return data.rows||[]
  }
  function ensure(){
    if(!ready){
      ready=(async()=>{
        await query('CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,salt TEXT NOT NULL,hash TEXT NOT NULL,api_key TEXT)')
        await query('CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires BIGINT NOT NULL)')
      })().catch(e=>{ready=null;throw e})
    }
    return ready
  }
  return {
    async get(sql,params=[]){await ensure();return (await query(sql,params))[0]||null},
    async run(sql,params=[]){await ensure();await query(sql,params)}
  }
}

function createSqliteStore(directory){
  mkdirSync(directory,{recursive:true})
  const db=new DatabaseSync(join(directory,'accounts.sqlite'))
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,salt TEXT NOT NULL,hash TEXT NOT NULL,api_key TEXT);
    CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);`)
  return {
    async get(sql,params=[]){return db.prepare(sql).get(...params)||null},
    async run(sql,params=[]){db.prepare(sql).run(...params)}
  }
}

export function accounts(directory) {
  let master
  if(process.env.ENCRYPTION_KEY){
    const raw=process.env.ENCRYPTION_KEY.trim()
    master=Buffer.from(raw,/^[a-f0-9]{64}$/i.test(raw)?'hex':'base64')
  }else{
    mkdirSync(directory,{recursive:true})
    const keyPath=join(directory,'encryption.key')
    try{master=readFileSync(keyPath)}catch(e){if(e.code!=='ENOENT')throw e;master=randomBytes(32);writeFileSync(keyPath,master,{flag:'wx',mode:0o600})}
  }
  if(master.length!==32)throw Error('Invalid encryption key')
  const neonUrl=!process.env.DATA_DIR&&(process.env.DATABASE_URL||process.env.POSTGRES_URL)
  const store=neonUrl?createNeonStore(neonUrl):createSqliteStore(directory)
  const digest=v=>createHash('sha256').update(v).digest('hex')
  const publicUser=u=>({id:u.id,email:u.email,name:u.name,hasKey:!!u.api_key})
  async function user(req){
    const token=req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith('resume_session='))?.slice(15)
    if(!token||!/^[a-f0-9]{64}$/.test(token))return null
    return store.get('SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token=? AND s.expires>?',[digest(token),Date.now()])
  }
  function cookie(req,token,age=604800){
    const secure=process.env.COOKIE_SECURE==='true'||req.socket?.encrypted||req.headers['x-forwarded-proto']==='https'
    return `resume_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${secure?'; Secure':''}`
  }
  function encrypt(value,id){const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',master,iv);c.setAAD(Buffer.from(id));return Buffer.concat([iv,c.update(value),c.final(),c.getAuthTag()]).toString('base64')}
  function decrypt(value,id){const b=Buffer.from(value,'base64'),c=createDecipheriv('aes-256-gcm',master,b.subarray(0,12));c.setAAD(Buffer.from(id));c.setAuthTag(b.subarray(-16));return Buffer.concat([c.update(b.subarray(12,-16)),c.final()]).toString()}
  async function auth(req,res,path,body,send){
    if(path==='/api/auth/me'&&req.method==='GET'){const u=await user(req);return send(res,200,{user:u?publicUser(u):null})}
    if(path==='/api/auth/logout'&&req.method==='POST'){
      const token=req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith('resume_session='))?.slice(15)
      if(token)await store.run('DELETE FROM sessions WHERE token=?',[digest(token)])
      return send(res,200,{ok:true},{'Set-Cookie':cookie(req,'',0)})
    }
    if(path==='/api/account/profile'){
      const u=await user(req)
      if(!u)return send(res,401,{message:'Войдите в аккаунт.'})
      if(req.method!=='PATCH')return send(res,405,{message:'Метод недоступен.'})
      if(typeof body.name!=='string'||!body.name.trim()||body.name.trim().length>100||Object.keys(body).some(k=>k!=='name'))return send(res,400,{message:'Укажите имя или ник до 100 символов.'})
      await store.run('UPDATE users SET name=? WHERE id=?',[body.name.trim(),u.id])
      return send(res,200,{user:publicUser({...u,name:body.name.trim()})})
    }
    if(path==='/api/account/key'){
      const u=await user(req)
      if(!u)return send(res,401,{message:'Войдите в аккаунт.'})
      if(req.method==='DELETE'){await store.run('UPDATE users SET api_key=NULL WHERE id=?',[u.id]);return send(res,200,{hasKey:false})}
      if(req.method!=='PUT')return send(res,405,{message:'Метод недоступен.'})
      if(typeof body.key!=='string'||!/^[A-Za-z0-9._~+/=\-]{20,2048}$/.test(body.key))return send(res,400,{message:'Вставьте ключ целиком, без пробелов, звёздочек и кавычек. Поддерживаются разные форматы Google API key.'})
      await store.run('UPDATE users SET api_key=? WHERE id=?',[encrypt(body.key,u.id),u.id])
      return send(res,200,{hasKey:true})
    }
    if(!['/api/auth/register','/api/auth/login'].includes(path)||req.method!=='POST')return send(res,404,{message:'Маршрут не найден.'})
    const email=typeof body.email==='string'?body.email.trim().toLowerCase():''
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||typeof body.password!=='string'||body.password.length<10||body.password.length>128)return send(res,400,{message:'Укажите email и пароль от 10 до 128 символов.'})
    let u=await store.get('SELECT * FROM users WHERE email=?',[email])
    if(path.endsWith('/register')){
      if(typeof body.name!=='string'||!body.name.trim()||body.name.length>100)return send(res,400,{message:'Укажите имя (до 100 символов).'})
      if(u)return send(res,409,{message:'Не удалось зарегистрироваться. Попробуйте войти.'})
      const salt=randomBytes(16).toString('hex'),hash=Buffer.from(await scrypt(body.password,salt,64)).toString('hex')
      try{await store.run('INSERT INTO users(id,email,name,salt,hash) VALUES(?,?,?,?,?)',[randomUUID(),email,body.name.trim(),salt,hash])}catch{return send(res,409,{message:'Не удалось зарегистрироваться. Попробуйте войти.'})}
      u=await store.get('SELECT * FROM users WHERE email=?',[email])
    }else{
      const hash=Buffer.from(await scrypt(body.password,u?.salt||'invalid-account-salt',64))
      if(!u||!timingSafeEqual(hash,Buffer.from(u.hash,'hex')))return send(res,401,{message:'Неверный email или пароль.'})
    }
    const token=randomBytes(32).toString('hex')
    await store.run('DELETE FROM sessions WHERE expires<=?',[Date.now()])
    await store.run('INSERT INTO sessions(token,user_id,expires) VALUES(?,?,?)',[digest(token),u.id,Date.now()+604800000])
    return send(res,200,{user:publicUser(u)},{'Set-Cookie':cookie(req,token)})
  }
  return {user,auth,key:u=>u.api_key?decrypt(u.api_key,u.id):null}
}
