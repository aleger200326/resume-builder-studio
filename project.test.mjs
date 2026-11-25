import assert from 'node:assert/strict'
import {test} from 'node:test'
import {mkdtemp,readFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {DatabaseSync} from 'node:sqlite'
import {dispatch} from './tests/http.mjs'
import {blank,aiInput,resumeView,validate,templates,templateDesigns,exampleDraft} from './public/model.js'
import {buildPdf} from './public/pdf.js'
import {jobBoards,filterBoards} from './public/jobs-data.js'

process.env.DATA_DIR=await mkdtemp(join(tmpdir(),'resume-tests-'))
const {serve}=await import('./server.mjs')
const request=(path,options)=>dispatch(serve,path,options)

test('Required fields, privacy filtering, and Timur demo',()=>{
  assert.deepEqual(validate(exampleDraft()),{})
  assert.equal(exampleDraft().fullName,'Тимур Рахимов')
  assert.equal(exampleDraft().isExample,true)
  assert.equal(Object.keys(templates).length,12)
  const d=blank()
  assert.deepEqual(Object.keys(validate(d)),['fullName','targetRole','contacts.email'])
  Object.assign(d,{fullName:'Анна Иванова',targetRole:'Менеджер',birthDate:'1995-12-20'})
  d.contacts.email='anna@example.com'
  d.education.push({id:'h',kind:'higher',institution:'МГУ',program:'Финансы',degree:'Бакалавр',startMonth:'2012-09',endMonth:'2016-06',status:'completed'})
  assert.deepEqual(validate(d),{})
  assert.equal(resumeView(d).birthDate,'')
  assert.equal(aiInput(d).education.length,0)
  assert.deepEqual(Object.keys(aiInput(d)),['targetRole','skills','experience','education'])
  d.showBirthDate=true;d.hasHigherEducation=true
  assert.equal(resumeView(d).birthDate,'20.12.1995')
  assert.equal(aiInput(d).education[0].institution,'МГУ')
})

test('Landing, authenticated editor, API and PDF for all templates',async()=>{
  assert.match((await request('/')).text,/<title>Конструктор резюме<\/title>/)
  assert.equal((await request('/editor')).status,302)
  const registration=await request('/api/auth/register',{method:'POST',body:{name:'PDF test',email:'pdf@example.com',password:'Test-password-123'}})
  assert.equal(registration.status,200)
  const cookie=registration.cookie
  const editor=(await request('/editor',{cookie})).text
  assert.match(editor,/review-resume/)
  assert.match(editor,/id="view-example"/)
  assert.match(editor,/id="demo-paper"/)
  for(const path of ['/auth','/auth.js','/account.js','/css/tokens.css','/css/base.css','/css/components.css','/css/motion.css','/css/pages.css','/resume-render.js','/resume-designs.css'])assert.equal((await request(path)).status,200)
  const portrait=await request('/demo-portrait.jpg')
  assert.equal(portrait.status,200)
  assert.equal(portrait.headers['content-type'],'image/jpeg')
  assert.equal(portrait.bytes.readUInt16BE(0),0xffd8)
  const api=body=>request('/api/v1/resume/suggestions',{method:'POST',cookie,body})
  const sample={targetRole:'Менеджер',skills:[],experience:[],education:[]}
  assert.equal((await api({...sample,fullName:'Анна'})).status,400)
  assert.equal((await api(sample)).json().suggestions.length,0)
  assert.equal((await api({...sample,skills:['Отчёты']})).json().code,'key_required')
  const font=await request('/pdf-font.ttf')
  assert.equal(font.status,200)
  const fontBytes=font.bytes.buffer.slice(font.bytes.byteOffset,font.bytes.byteOffset+font.bytes.length)
  const d=exampleDraft();d.summary='Строка отчёта. '.repeat(130)
  for(const layout of ['mobile','desktop'])for(const template of Object.keys(templates)){
    const out=Buffer.from(buildPdf(resumeView(d),{layout,theme:'green',template},fontBytes,{data:portrait.bytes,width:360,height:360})).toString('latin1')
    assert.ok(out.startsWith('%PDF-1.7'))
    assert.match(out,/\/ToUnicode \d+ 0 R/)
    assert.match(out,/<\w+> <0410>/)
    assert.match(out,/\/Subtype \/Link/)
    assert.match(out,/\/Subtype \/Image/)
    assert.match(out,layout==='mobile'?/\/MediaBox \[0 0 297\.638 527\.244\]/:/\/MediaBox \[0 0 595\.276 841\.89\]/)
    const xref=Number(out.match(/startxref\n(\d+)/)[1]);assert.equal(out.slice(xref,xref+4),'xref')
    if(layout==='mobile')assert.match(out,/\/Type \/Pages \/Count [2-9]/)
  }
})

test('Each template declares a distinct visual composition without dropping resume sections',()=>{
  const combinations=new Set()
  for(const id of Object.keys(templates)){
    const design=templateDesigns[id]
    combinations.add(JSON.stringify([design.header,design.sidePosition,design.background,design.sidebar]))
    const source=resumeView(exampleDraft()).sections
    const side=source.filter(s=>design.side.includes(s.key)),main=source.filter(s=>!design.side.includes(s.key))
    assert.deepEqual([...side,...main].map(s=>s.key).sort(),source.map(s=>s.key).sort())
  }
  assert.equal(combinations.size,Object.keys(templates).length)
})

test('Home keeps the signed-in session; profile edits stay within the account',async()=>{
  const signup=await request('/api/auth/register',{method:'POST',body:{name:'Old nickname',email:'profile@example.com',password:'Test-password-123'}})
  assert.equal(signup.status,200)
  const cookie=signup.cookie,id=signup.json().user.id
  const home=await request('/',{cookie})
  assert.equal(home.status,200)
  assert.match(home.text,/id="landing-account"/)
  assert.match(home.text,/src="\/landing.js"/)
  assert.equal(home.headers['set-cookie'],undefined)
  assert.equal((await request('/api/auth/me',{cookie})).json().user.id,id)
  assert.equal((await request('/settings')).status,302)
  assert.equal((await request('/settings',{cookie})).status,200)
  const profile=body=>request('/api/account/profile',{method:'PATCH',cookie,headers:{'x-account-id':id},body})
  assert.equal((await profile({name:' Georgy Design '})).json().user.name,'Georgy Design')
  assert.equal((await request('/api/auth/me',{cookie})).json().user.name,'Georgy Design')
  assert.equal((await profile({name:'Another user',id:'another-id'})).status,400)
  assert.equal((await profile({name:'   '})).status,400)
  assert.equal((await request('/api/account/profile',{method:'PATCH',body:{name:'Anonymous'}})).status,401)
  assert.equal((await request('/api/account/profile',{method:'PATCH',cookie,headers:{'x-account-id':'another-id'},body:{name:'Intruder'}})).status,401)
  assert.equal((await request('/api/auth/me',{cookie})).json().user.name,'Georgy Design')
  for(const path of ['/settings.js','/jobs.js','/jobs-data.js','/landing.js'])assert.equal((await request(path)).status,200)
  const editor=(await request('/editor',{cookie})).text
  const ids=[...editor.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1])
  assert.equal(new Set(ids).size,ids.length,'Every UI control has a unique id')
  assert.match(editor,/id="jobs-step"/)
  assert.match(editor,/id="demo-download"/)
})

test('Job directory has 30 distinct HTTPS destinations and regional search',()=>{
  assert.equal(jobBoards.length,30)
  assert.equal(new Set(jobBoards.map(b=>b.url)).size,30)
  for(const board of jobBoards){
    const url=new URL(board.url)
    assert.equal(url.protocol,'https:');assert.equal(url.search,'');assert.equal(url.username,'');assert.equal(url.password,'')
    assert.ok(board.icon&&board.description)
  }
  assert.equal(filterBoards('hh.uz').length,1)
  assert.equal(filterBoards('','uz').length,3)
  assert.equal(filterBoards('Узбекистан').length,3)
  assert.equal(filterBoards('','remote').length,6)
  assert.equal(filterBoards('non-existent-directory-name').length,0)
})

test('New Google key formats are encrypted and checked with Google without sending a resume',async t=>{
  const signup=await request('/api/auth/register',{method:'POST',body:{name:'Key test',email:'key-format@example.com',password:'Test-password-123'}})
  const cookie=signup.cookie
  assert.equal(signup.status,200)
  const key='AQ.'+'test_only_not_a_real_key_'.repeat(3)
  assert.equal((await request('/api/account/key',{method:'PUT',cookie,body:{key}})).status,200)
  assert.equal((await request('/api/account/key',{method:'PUT',cookie,body:{key:'bad\nheader'}})).status,400)
  assert.equal((await request('/api/account/key/check',{method:'POST'})).status,401)
  const original=globalThis.fetch
  t.after(()=>{globalThis.fetch=original})
  let status=200,calls=0
  globalThis.fetch=async(url,options)=>{
    calls++;assert.match(String(url),/^https:\/\/generativelanguage.googleapis.com\/v1beta\/models\//)
    assert.equal(options.headers['x-goog-api-key'],key)
    assert.equal(options.body,undefined)
    return new Response('{}',{status})
  }
  const check=()=>request('/api/account/key/check',{method:'POST',cookie})
  const valid=await check()
  assert.equal(valid.status,200);assert.equal(valid.json().ok,true)
  assert.ok(!valid.text.includes(key))
  status=403;assert.equal((await check()).json().code,'google_key')
  status=429;assert.equal((await check()).json().code,'google_quota')
  assert.equal(calls,3)
})

test('Account isolation, encrypted keys, Gemini output validation, CSRF and logout',async t=>{
  const register=email=>request('/api/auth/register',{method:'POST',body:{name:'Test',email,password:'Test-password-123'}})
  const a=await register('a@example.com'),b=await register('b@example.com')
  assert.equal(a.status,200);assert.equal(b.status,200)
  assert.match(a.headers['set-cookie'],/HttpOnly; SameSite=Strict/)
  const me=cookie=>request('/api/auth/me',{cookie})
  assert.equal((await me(a.cookie)).json().user.id,a.json().user.id)
  const keyA='AIza'+'a'.repeat(35),keyB='AIza'+'b'.repeat(35)
  const put=(cookie,key)=>request('/api/account/key',{method:'PUT',cookie,body:{key}})
  assert.equal((await put('',keyA)).status,401)
  assert.equal((await put(a.cookie,keyA)).status,200)
  assert.equal((await me(b.cookie)).json().user.hasKey,false)
  assert.equal((await put(b.cookie,keyB)).status,200)
  const db=new DatabaseSync(join(process.env.DATA_DIR,'accounts.sqlite'),{readOnly:true})
  const stored=db.prepare('SELECT api_key,hash FROM users').all();db.close()
  assert.ok(stored.every(row=>row.api_key!==keyA&&row.api_key!==keyB&&row.hash!=='Test-password-123'))
  assert.ok(!(await me(a.cookie)).text.includes(keyA))
  assert.equal((await request('/api/account/key',{method:'GET',cookie:a.cookie})).status,405)
  assert.equal((await request('/api/account/key',{method:'PUT',cookie:a.cookie,body:{key:keyB},headers:{origin:'https://attacker.example'}})).status,403)
  assert.equal((await request('/api/account/key',{method:'PUT',cookie:b.cookie,body:{key:keyA},headers:{'x-account-id':a.json().user.id}})).status,401)
  const input={...aiInput(exampleDraft()),summary:exampleDraft().summary,message:'Как усилить резюме?'}
  assert.equal((await request('/api/v1/resume/review',{method:'POST',body:input})).status,401)
  const review={score:78,answer:'Покажите учебные проекты.',sections:['targetRole','summary','experience','skills','education'].map((section,i)=>({section,level:['weak','good','excellent'][i%3],reason:'Конкретные факты.',advice:'Уточните задачи.'})),suggestions:[{target:'summary',entryId:null,text:'Проектирую сайты в Figma.'}],hints:['Какие проекты завершены?']}
  const realFetch=globalThis.fetch,captured=[]
  t.after(()=>{globalThis.fetch=realFetch})
  let providerPayload=review,providerStatus=200
  globalThis.fetch=async(url,options)=>{
    assert.match(String(url),/^https:\/\/generativelanguage.googleapis.com\/v1beta\/models\//)
    captured.push({key:options.headers['x-goog-api-key'],body:JSON.parse(options.body)})
    return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(providerPayload)}]}}]}),{status:providerStatus})
  }
  const analyze=cookie=>request('/api/v1/resume/review',{method:'POST',cookie,body:input})
  assert.equal((await analyze(a.cookie)).json().score,78)
  assert.equal((await analyze(b.cookie)).json().sections[0].level,'weak')
  assert.deepEqual(captured.slice(0,2).map(x=>x.key),[keyA,keyB])
  const sent=captured[0].body.contents[0].parts[0].text
  assert.ok(!sent.includes('timur.rakhimov@tashkent.design'));assert.ok(!sent.includes('Тимур Рахимов'))
  providerPayload={...review,sections:[...review.sections.slice(0,4),review.sections[0]]}
  assert.equal((await analyze(a.cookie)).status,502)
  providerPayload={...review,suggestions:[{target:'duties',entryId:'other-user-id',text:'Invented'}]}
  assert.equal((await analyze(a.cookie)).status,502)
  providerStatus=429
  assert.equal((await analyze(b.cookie)).json().code,'google_quota')
  assert.equal((await request('/api/v1/resume/review',{method:'POST',cookie:b.cookie,body:null})).status,400)
  assert.equal((await request('/api/account/key',{method:'DELETE',cookie:b.cookie})).status,200)
  assert.equal((await me(a.cookie)).json().user.hasKey,true)
  assert.equal((await me(b.cookie)).json().user.hasKey,false)
  assert.equal((await request('/api/auth/logout',{method:'POST',cookie:a.cookie})).status,200)
  assert.equal((await me(a.cookie)).json().user,null)
  const login=await request('/api/auth/login',{method:'POST',body:{email:'a@example.com',password:'Test-password-123'}})
  assert.equal(login.status,200);assert.equal(login.json().user.hasKey,true)
  assert.equal((await request('/api/auth/login',{method:'POST',body:{email:'a@example.com',password:'Wrong-password-123'}})).status,401)
  const storage=await readFile(new URL('public/storage.js',import.meta.url),'utf8')
  assert.match(storage,/resume-builder-.*currentUser\?\.id/)
})
