import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {runInNewContext} from 'node:vm'

const source=await readFile(new URL('./public/auth.js',import.meta.url),'utf8')
async function authPage({rejectLogin=false,saveCookie=true,search='?mode=login&next=jobs'}={}){
  const node=()=>({value:'',textContent:'',disabled:false,required:true,hidden:false,setAttribute(){}})
  const nodes=Object.fromEntries(['#auth-form','#auth-error','#auth-submit','#name-label','#register-tab','#login-tab','#auth-heading','#auth-caption'].map(id=>[id,node()]))
  const fields={'[name="name"]':{...node(),value:'Test User'},'[name="email"]':{...node(),value:'test@example.com'},'[name="password"]':{...node(),value:'Test-password-123'}}
  const form=nodes['#auth-form'];form.querySelector=s=>fields[s];form.reset=()=>{}
  const calls=[],navigations=[];let authenticated=false
  const user={id:'test-user-id',name:'Test User'}
  const fetch=async(path,options)=>{
    calls.push({path,options})
    if(path==='/api/auth/me')return new Response(JSON.stringify({user:authenticated?user:null}),{status:200})
    if(rejectLogin)return new Response(JSON.stringify({message:'Неверный email или пароль.'}),{status:401})
    authenticated=saveCookie
    return new Response(JSON.stringify({user}),{status:200})
  }
  runInNewContext(source,{document:{querySelector:s=>nodes[s]},location:{search,replace:v=>navigations.push(v)},URLSearchParams,AbortSignal,fetch})
  await new Promise(resolve=>setImmediate(resolve))
  return {nodes,fields,calls,navigations,submit:()=>form.onsubmit({preventDefault(){}})}
}

test('Login tab disables hidden name field and enters the selected step after session verification',async()=>{
  const page=await authPage()
  assert.equal(page.nodes['#name-label'].hidden,true)
  assert.equal(page.fields['[name="name"]'].required,false)
  assert.equal(page.fields['[name="name"]'].disabled,true)
  await page.submit()
  assert.deepEqual(page.navigations,['/editor?view=jobs'])
  assert.equal(page.calls.find(c=>c.path==='/api/auth/login').options.credentials,'same-origin')
  assert.equal(page.calls.filter(c=>c.path==='/api/auth/me').length,2)
})

test('Wrong credentials or blocked session remain on the form with a visible error',async()=>{
  const wrong=await authPage({rejectLogin:true})
  await wrong.submit()
  assert.equal(wrong.navigations.length,0)
  assert.equal(wrong.nodes['#auth-error'].textContent,'Неверный email или пароль.')
  assert.equal(wrong.nodes['#auth-submit'].disabled,false)
  const cookies=await authPage({saveCookie:false})
  await cookies.submit()
  assert.equal(cookies.navigations.length,0)
  assert.match(cookies.nodes['#auth-error'].textContent,/cookies/)
})

test('Registration uses the name field and never accepts arbitrary redirect URLs',async()=>{
  const page=await authPage({search:'?next=https://untrusted.example/'})
  assert.equal(page.fields['[name="name"]'].required,true)
  await page.submit()
  const request=page.calls.find(c=>c.path==='/api/auth/register')
  assert.equal(JSON.parse(request.options.body).name,'Test User')
  assert.deepEqual(page.navigations,['/editor'])
})
