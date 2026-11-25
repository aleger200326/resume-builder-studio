import {currentUser} from './account.js'
const request = indexedDB.open('resume-builder-'+(currentUser?.id||'unauthenticated'),1)
const db = new Promise((resolve,reject)=>{
  request.onupgradeneeded=()=>request.result.createObjectStore('drafts')
  request.onsuccess=()=>resolve(request.result)
  request.onerror=()=>reject(request.error)
  request.onblocked=()=>reject(new Error('blocked'))
})
async function access(action,next,expected) {
  const d=await db
  return new Promise((resolve,reject)=>{
    const transaction=d.transaction('drafts',action==='read'?'readonly':'readwrite')
    const store=transaction.objectStore('drafts')
    const query=store.get('current')
    let result
    query.onsuccess=()=>{
      const current=query.result
      if (action==='read') {result=current;return}
      if (expected!==undefined&&(current?.revision??0)!==expected){result={conflict:true};return}
      if (action==='clear')store.put({revision:(current?.revision??0)+1,cleared:true},'current')
      else store.put({...next,revision:(current?.revision??0)+1},'current')
      result={revision:(current?.revision??0)+1}
    }
    transaction.oncomplete=()=>resolve(result)
    transaction.onerror=()=>reject(transaction.error)
    transaction.onabort=()=>reject(transaction.error)
  })
}
export const readDraft=()=>access('read')
export const writeDraft=(d,revision)=>access('write',d,revision)
export const clearDraft=revision=>access('clear',null,revision)
