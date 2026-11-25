import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {runInNewContext} from 'node:vm'
const source=await readFile(new URL('./public/theme.js',import.meta.url),'utf8')
function page(storage){
  const button={setAttribute(k,v){this[k]=v}},root={dataset:{}},events={}
  runInNewContext(source,{document:{documentElement:root,readyState:'complete',querySelectorAll:()=>[button]},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},window:{addEventListener:(k,v)=>events[k]=v}})
  return {root,button,events}
}
test('Editor pages begin dark, share explicit theme choices, and synchronize between tabs',()=>{
  const storage=new Map([['resume-theme','light']])
  const landing=page(storage)
  assert.equal(landing.root.dataset.theme,'dark')
  landing.button.onclick()
  assert.equal(landing.root.dataset.theme,'light')
  assert.equal(storage.get('resume-dark-variant-theme'),'light')
  const login=page(storage)
  assert.equal(login.root.dataset.theme,'light')
  login.button.onclick()
  landing.events.storage({key:'resume-dark-variant-theme'})
  assert.equal(landing.root.dataset.theme,'dark')
  assert.equal(page(storage).root.dataset.theme,'dark')
})
