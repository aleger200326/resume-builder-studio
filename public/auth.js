const form=document.querySelector('#auth-form'),error=document.querySelector('#auth-error'),submit=document.querySelector('#auth-submit')
const nameInput=form.querySelector('[name="name"]'),emailInput=form.querySelector('[name="email"]'),passwordInput=form.querySelector('[name="password"]')
async function authRequest(path,options={}){
  let response
  try{response=await fetch(path,{...options,credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000)})}catch{throw Error('Нет связи с сервером. Откройте сайт по адресу http://127.0.0.1:4173 и повторите попытку.')}
  let value
  try{value=await response.json()}catch{throw Error('Сервер вернул неверный ответ. Перезапустите start.cmd и откройте сайт по рабочему адресу.')}
  if(!response.ok)throw Error(value.message||'Не удалось войти.')
  return value
}
let mode='register'
const query=new URLSearchParams(location.search)
const nextView=query.get('next'), nextTemplate=query.get('template')
const destParams=new URLSearchParams()
if(['example','jobs'].includes(nextView))destParams.set('view',nextView)
if(nextTemplate)destParams.set('template',nextTemplate)
const destination='/editor'+(destParams.size?'?'+destParams.toString():'')
function switchMode(next){
  mode=next;error.textContent=''
  document.querySelector('#name-label').hidden=mode==='login'
  nameInput.required=mode==='register'
  nameInput.disabled=mode==='login'
  passwordInput.autocomplete=mode==='register'?'new-password':'current-password'
  document.querySelector('#register-tab').setAttribute('aria-pressed',String(mode==='register'))
  document.querySelector('#login-tab').setAttribute('aria-pressed',String(mode==='login'))
  document.querySelector('#auth-heading').textContent=mode==='register'?'Создать аккаунт':'С возвращением'
  document.querySelector('#auth-caption').textContent=mode==='register'?'Начните с резюме, которое хочется отправить.':'Продолжите работу над своим резюме.'
  const labelNode=submit.querySelector?.('.btn-label')||submit
  labelNode.textContent=mode==='register'?'Создать аккаунт':'Войти в редактор'
}
document.querySelector('#register-tab').onclick=()=>switchMode('register')
document.querySelector('#login-tab').onclick=()=>switchMode('login')
if(new URLSearchParams(location.search).get('mode')==='login')switchMode('login')
const togglePassword=document.querySelector('#toggle-password')
if(togglePassword){
  togglePassword.onclick=()=>{
    const show=passwordInput.type==='password'
    passwordInput.type=show?'text':'password'
    togglePassword.setAttribute('aria-pressed',String(show))
    togglePassword.setAttribute('aria-label',show?'Скрыть пароль':'Показать пароль')
  }
}
authRequest('/api/auth/me').then(v=>{if(v.user)location.replace(destination)}).catch(()=>{})
form.onsubmit=async event=>{
  event.preventDefault();error.textContent='';submit.disabled=true
  try{
    const value=await authRequest('/api/auth/'+mode,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:nameInput.value,email:emailInput.value,password:passwordInput.value})})
    const session=await authRequest('/api/auth/me')
    if(!session.user||session.user.id!==value.user?.id)throw Error('Браузер не сохранил вход. Разрешите cookies для этого сайта и повторите попытку.')
    form.reset();location.replace(destination)
  }catch(e){error.textContent=e.message}finally{submit.disabled=false}
}
