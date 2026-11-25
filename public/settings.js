import {currentUser,accountAPI} from './account.js'
const $=s=>document.querySelector(s)
if(currentUser){
  $('#profile-name').value=currentUser.name;$('#profile-email').value=currentUser.email
  function keyState(text){$('#key-state').textContent=text||(currentUser.hasKey?'Ключ сохранён. Можно проверить подключение.':'Ключ пока не подключён.');$('#key-delete').disabled=!currentUser.hasKey;$('#key-check').disabled=!currentUser.hasKey}
  keyState()
  $('#key-check').onclick=async()=>{const control=$('#key-check');control.disabled=true;$('#key-state').textContent='Проверяем доступ к Google…';try{const result=await accountAPI('/api/account/key/check','POST');keyState(result.message)}catch(e){keyState(e.message)}}
  $('#profile-form').onsubmit=async e=>{
    e.preventDefault();$('#profile-save').disabled=true
    try{const value=await accountAPI('/api/account/profile','PATCH',{name:$('#profile-name').value.trim()});Object.assign(currentUser,value.user);$('#profile-status').textContent='Профиль сохранён. Новый ник отображается на главной.'}catch(e){$('#profile-status').textContent=e.message}finally{$('#profile-save').disabled=false}
  }
  $('#key-form').onsubmit=async e=>{
    e.preventDefault();$('#key-save').disabled=true
    try{await accountAPI('/api/account/key','PUT',{key:$('#profile-key').value.trim()});$('#profile-key').value='';currentUser.hasKey=true;keyState('Ключ сохранён. Нажми «Проверить подключение», чтобы проверить доступ к Gemini.')}catch(e){keyState(e.message)}finally{$('#key-save').disabled=false}
  }
  $('#key-delete').onclick=async()=>{
    $('#key-delete').disabled=true
    try{await accountAPI('/api/account/key','DELETE');currentUser.hasKey=false;keyState('Ключ удалён.')}catch(e){keyState(e.message)}
  }
  $('#settings-logout').onclick=async()=>{try{await accountAPI('/api/auth/logout','POST');location.replace('/')}catch(e){$('#logout-status').textContent=e.message}}
}
