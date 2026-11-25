export async function accountAPI(path,method='GET',body){
  const headers=body?{'Content-Type':'application/json'}:{}
  if(path!=='/api/auth/me')headers['X-Account-Id']=currentUser?.id||''
  const response=await fetch(path,{method,headers,body:body?JSON.stringify(body):undefined,cache:'no-store'})
  const value=await response.json()
  if(response.status===401&&path!=='/api/auth/login'){location.replace('/auth');throw Error('Войдите в аккаунт.')}
  if(!response.ok)throw Error(value.message||'Не удалось выполнить запрос.')
  return value
}
export const currentUser=(await accountAPI('/api/auth/me')).user
if(!currentUser)location.replace('/auth')
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload()})
