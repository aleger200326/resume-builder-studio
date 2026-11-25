import {renderResume} from './resume-render.js'
import {initJobBoards} from './jobs.js'
import {blank,clean,localDate,validate,aiInput,resumeView,isSidebar,orderedSections,templateKey,exampleDraft,templates,templateDesigns,palettes,layouts,statuses,limits} from './model.js'
import {readDraft,writeDraft,clearDraft} from './storage.js'
import {buildPdf} from './pdf.js'
import {currentUser,accountAPI} from './account.js'

const $=(selector,root=document)=>root.querySelector(selector)
const $$=(selector,root=document)=>Array.from(root.querySelectorAll(selector))
const node=(tag,props={},...children)=>{
  const element=document.createElement(tag)
  for(const [key,value] of Object.entries(props)){
    if(key==='data')Object.assign(element.dataset,value)
    else if(key==='class')element.className=value
    else if(key.startsWith('aria-')||key==='role')element.setAttribute(key,value)
    else element[key]=value
  }
  element.append(...children)
  return element
}
const svgIcon=(d)=>{
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg')
  svg.setAttribute('class','ui-icon')
  svg.setAttribute('viewBox','0 0 24 24')
  svg.setAttribute('aria-hidden','true')
  const p=document.createElementNS('http://www.w3.org/2000/svg','path')
  p.setAttribute('d',d)
  svg.append(p)
  return svg
}
const button=(label,props={})=>node('button',{type:'button',...props},label)
const form=$('#form'), workspace=$('.workspace'), dialog=$('#dialog'), modal=$('#modal')
const scroll={editor:0,preview:0,split:0}
let draft=blank(), savedRevision=0, saveTimer, queue=Promise.resolve(), saveEpoch=0, conflict=false, clearing=false
let loaded=false, photoUrl='', selectedPhoto=null, suggestions=[], hints=[], request=null, exporting=false, fontPromise
let triedExport=false, aiState=''
let reviewRequest=null, reviewSource='',reviewData=null
$('#account-name').textContent=currentUser?.name||''
function updateKeyLabel(){$('#account-settings').textContent=currentUser?.hasKey?'Google API key · подключён':'Подключить Google API key'}
updateKeyLabel()
$('#logout').onclick=async()=>{
  try{
    clearTimeout(saveTimer)
    if(loaded&&!conflict)await persist(structuredClone(draft),saveEpoch)
    await accountAPI('/api/auth/logout','POST')
    location.replace('/')
  }catch(e){status(e.message)}
}
$('#account-settings').onclick=()=>{
  const field=node('input',{type:'password',autocomplete:'off',maxLength:2048,placeholder:'Вставьте Google API key',spellcheck:false})
  const state=node('p',{role:'status',class:'field-note'},currentUser.hasKey?'Ключ сохранён. Для замены введите новый.':'Ключ ещё не подключён.')
  const save=button('Сохранить ключ',{class:'primary'}),remove=button('Удалить ключ',{class:'secondary',disabled:!currentUser.hasKey}),check=button('Проверить подключение',{class:'secondary',disabled:!currentUser.hasKey})
  check.onclick=async()=>{check.disabled=true;state.textContent='Проверяем доступ к Google…';try{const result=await accountAPI('/api/account/key/check','POST');state.textContent=result.message}catch(e){state.textContent=e.message}finally{check.disabled=!currentUser.hasKey}}
  save.onclick=async()=>{
    save.disabled=true
    try{await accountAPI('/api/account/key','PUT',{key:field.value.trim()});field.value='';currentUser.hasKey=true;remove.disabled=false;check.disabled=false;updateKeyLabel();state.textContent='Ключ сохранён. Нажмите «Проверить подключение» для проверки доступа к Gemini.'}catch(e){state.textContent=e.message}finally{save.disabled=false}
  }
  remove.onclick=async()=>{
    remove.disabled=true
    try{await accountAPI('/api/account/key','DELETE');currentUser.hasKey=false;check.disabled=true;updateKeyLabel();state.textContent='Ключ удалён.'}catch(e){state.textContent=e.message;remove.disabled=false}
  }
  openDialog('Личный Google API key',node('p',{},'1. Откройте Google AI Studio под своим Google-аккаунтом.'),node('a',{href:'https://aistudio.google.com/apikey',target:'_blank',rel:'noopener noreferrer',class:'text-button'},'Получить ключ в Google AI Studio ↗'),node('p',{},'2. Создайте ключ и вставьте его здесь. Лимиты и расходы относятся к вашему Google-проекту.'),node('label',{},'Новый ключ',field),node('p',{class:'field-note'},'Сохраняется в зашифрованном виде на сервере, не возвращается в браузер и используется только для запросов вашего аккаунта.'),state,node('div',{class:'dialog-actions'},save,check,remove))
}

function safePref(key,value) {
  try { if(value!==undefined)localStorage.setItem(key,value);else return localStorage.getItem(key) } catch {}
}
function status(message){$('#save').textContent=message}
function pathValue(path,value){
  const keys=path.split('.'), field=keys.pop()
  let target=draft
  for(const key of keys){
    if(key==='portfolioUrls'&&target===draft)target=draft.contacts.portfolioUrls
    else target=Array.isArray(target)?target.find(item=>item.id===key):target?.[key]
  }
  if(!target)return
  if(value!==undefined)target[field]=value
  return target[field]
}
function markChanged() {
  if(!loaded||clearing)return
  if(!conflict)status('Сохраняем…')
  clearTimeout(saveTimer)
  const snapshot=structuredClone(draft), epoch=saveEpoch
  saveTimer=setTimeout(()=>persist(snapshot,epoch),160)
}
function persist(snapshot,epoch,force=false) {
  queue=queue.then(async()=>{
    if(epoch!==saveEpoch||(conflict&&!force))return
    try {
      const result=await writeDraft(snapshot,force?undefined:savedRevision)
      if(epoch!==saveEpoch)return
      if(result.conflict){showConflict();return}
      savedRevision=result.revision
      conflict=false
      status('Сохранено на этом устройстве')
    }catch{status('Черновик не сохранён')}
  })
  return queue
}
function showConflict(){
  conflict=true
  const link=button('Черновик изменился в другой вкладке',{class:'text-button'})
  link.onclick=()=>{
    const actions=node('div',{class:'dialog-actions'})
    const local=button('Заменить своим',{class:'secondary'})
    const remote=button('Загрузить сохранённый',{class:'secondary'})
    remote.onclick=async()=>{
      try{
        const current=await readDraft()
        closeDialog();resetTransient();assign(current)
      }catch{status('Не удалось загрузить черновик')}
    }
    local.onclick=()=>{closeDialog();persist(structuredClone(draft),saveEpoch,true)}
    actions.append(remote,local)
    openDialog('Черновик изменился',node('p',{},'В другой вкладке сохранена новая версия. Выберите, какую версию использовать.'),actions)
  }
  $('#save').replaceChildren(link)
}
function resetTransient(){
  reviewRequest?.abort();reviewRequest=null;reviewData=null;reviewSource='';$('#review-results').replaceChildren();$('#review-status').textContent='';clearReviewMarks()
  $('#review-resume').disabled=false;$('#review-resume').textContent='Проанализировать резюме'
  saveEpoch++
  clearTimeout(saveTimer)
  request?.abort()
  request=null; suggestions=[]; hints=[]; aiState=''; triedExport=false
}
function assign(current){
  savedRevision=current?.revision??0
  draft=current?.schemaVersion===1&&!current.cleared?current:blank()
  conflict=false
  originalExampleDraft=null
  draft.appearance.template=templateKey(draft.appearance.template)
  renderAll()
  status(current?.schemaVersion===1&&!current.cleared?'Сохранено на этом устройстве':'Черновик на этом устройстве')
}

const examples={role:'Менеджер проектов',employer:'Студия «Вектор»',duties:'Планировал релизы и согласовывал требования с командой.',achievements:'Сократил срок согласования с пяти до трёх дней.',institution:'Название университета или колледжа',program:'Менеджмент',degree:'Бакалавр',label:'Например, планирование проектов',url:'https://example.com/portfolio'}
function loadExample(template=null){
  if(!loaded||clearing)return
  async function apply(){
    closeDialog()
    let portrait=null
    try{portrait=await getDemoPortrait()}catch{status('Не удалось загрузить портрет примера. Можно добавить фото вручную.')}
    if(!originalExampleDraft)originalExampleDraft=structuredClone(draft)
    resetTransient()
    draft={...exampleDraft(),photo:portrait,appearance:{...draft.appearance,...(template?{template}:{})}}
    renderAll()
    markChanged()
    status('Пример заполнения загружен')
  }
  const hasContent=draft.photo||draft.experience.length||draft.education.length||draft.skills.length||
    [draft.fullName,draft.targetRole,draft.summary,draft.birthDate,...Object.values(draft.contacts).filter(x=>typeof x==='string')].some(clean)||draft.contacts.portfolioUrls.length
  if(!hasContent){apply();return}
  const use=button('Загрузить пример',{class:'secondary'})
  use.onclick=apply
  openDialog('Загрузить пример?',node('p',{},'Поля заполнятся демонстрационными данными. В этой вкладке можно вернуться к текущему черновику.'),node('div',{class:'dialog-actions'},use))
}
let originalExampleDraft=null
$('#load-example').onclick=()=>loadExample()
let demoPortraitPromise
function getDemoPortrait(){
  if(!demoPortraitPromise)demoPortraitPromise=fetch('/demo-portrait.jpg').then(r=>{if(!r.ok)throw Error('portrait');return r.blob()}).catch(e=>{demoPortraitPromise=null;throw e})
  return demoPortraitPromise
}
const params=new URLSearchParams(location.search)
const demoDraft=exampleDraft()
demoDraft.appearance.template=templates[params.get('template')]?params.get('template'):'graphite'
function renderShowroom(){
  $('#demo-template-name').textContent=templates[demoDraft.appearance.template]
  renderResume($('#demo-paper'),demoDraft,{photoUrl:'/demo-portrait.jpg'})
  const cards=Object.keys(templates).map(key=>{
    const card=button('',{class:'template-card','aria-pressed':String(demoDraft.appearance.template===key),'aria-label':templates[key]+'. '+templateDesigns[key].description})
    const frame=node('div',{class:'thumb-window','aria-hidden':'true',inert:true}),paper=node('div')
    renderResume(paper,{...demoDraft,appearance:{...demoDraft.appearance,template:key}},{photoUrl:'/demo-portrait.jpg'})
    frame.append(paper)
    card.append(frame,node('span',{class:'template-title'},templates[key]),node('span',{class:'template-description'},templateDesigns[key].description))
    card.onclick=()=>{
      const gallery=$('#template-gallery'),left=gallery.scrollLeft
      demoDraft.appearance.template=key;renderShowroom();gallery.scrollLeft=left
      gallery.querySelector('[aria-pressed=true]')?.focus({preventScroll:true})
    }
    return card
  })
  $('#template-gallery').replaceChildren(...cards)
}
function showProductView(example){
  document.body.classList.remove('jobs-active');$('#jobs-step').hidden=true;$('#view-jobs').setAttribute('aria-pressed','false')
  document.body.classList.toggle('demo-active',example)
  $('#showroom').hidden=!example
  $('#view-example').setAttribute('aria-pressed',String(example))
  $('#view-editor').setAttribute('aria-pressed',String(!example))
  if(example)renderShowroom()
  window.scrollTo(0,0)
}
$('#view-editor').onclick=()=>showProductView(false)
$('#view-example').onclick=()=>showProductView(true)
let jobsUseExample=false
function showJobs(example=false){
  jobsUseExample=example===true
  document.body.classList.remove('demo-active');document.body.classList.add('jobs-active')
  $('#showroom').hidden=true;$('#jobs-step').hidden=false
  $('#view-jobs').setAttribute('aria-pressed','true');$('#view-editor').setAttribute('aria-pressed','false');$('#view-example').setAttribute('aria-pressed','false')
  $('#portfolio-step-heading').textContent=jobsUseExample?'Портфолио примера':'Твоё портфолио'
  $('#jobs-download').textContent=jobsUseExample?'Скачать пример PDF':'Скачать моё резюме'
  renderPortfolioStep();window.scrollTo(0,0)
}
function renderPortfolioStep(){
  const target=jobsUseExample?demoDraft:draft,rows=target.contacts.portfolioUrls
  $('#step-portfolio-links').replaceChildren(...rows.map((row,index)=>{
    const field=node('input',{type:'url',value:row.url,maxLength:2048,placeholder:'https://…','aria-label':'Ссылка на работу '+(index+1)})
    field.oninput=()=>{row.url=field.value;if(!jobsUseExample){controls();changed()}}
    const remove=button('Удалить ссылку',{class:'text-button'})
    remove.onclick=()=>{target.contacts.portfolioUrls=rows.filter(x=>x.id!==row.id);renderPortfolioStep();if(!jobsUseExample){renderList('portfolioUrls');changed()}}
    return node('div',{class:'portfolio-link-row'},node('label',{},'Ссылка на работу '+(index+1),field),remove)
  }))
  $('#step-add-link').disabled=rows.length>=limits.portfolioUrls
}
$('#step-add-link').onclick=()=>{
  const target=jobsUseExample?demoDraft:draft
  if(!loaded||target.contacts.portfolioUrls.length>=limits.portfolioUrls)return
  target.contacts.portfolioUrls.push({id:crypto.randomUUID(),url:''});renderPortfolioStep();if(!jobsUseExample){renderList('portfolioUrls');changed()}
  $('#step-portfolio-links').lastElementChild?.querySelector('input')?.focus()
}
$('#view-jobs').onclick=()=>showJobs()
$('#resume-next').onclick=()=>showJobs()
$('#demo-next').onclick=()=>{
  if(!loaded)return
  showJobs(true)
}
$('#jobs-back').onclick=()=>{if(jobsUseExample)showProductView(true);else{showProductView(false);setTab('preview')}}
async function downloadExample(control){
  control.disabled=true
  try{const photo=await getDemoPortrait();beginExport({...structuredClone(demoDraft),photo})}catch{status('Не удалось загрузить портрет. Попробуй ещё раз.');$('#jobs-download-status').textContent='Не удалось загрузить портрет. Попробуй ещё раз.'}finally{control.disabled=false}
}
$('#demo-download').onclick=()=>downloadExample($('#demo-download'))
$('#jobs-download').onclick=()=>jobsUseExample?downloadExample($('#jobs-download')):beginExport()
initJobBoards()
$('#demo-apply').onclick=()=>{
  if(!loaded)return
  draft.appearance.template=demoDraft.appearance.template
  renderAppearance();renderPreview();markChanged();showProductView(false);setTab('preview')
}
$('#demo-copy').onclick=()=>{
  if(!loaded)return
  showProductView(false);setTab('editor');loadExample(demoDraft.appearance.template)
}
if(new URLSearchParams(location.search).get('view')==='example')showProductView(true)
function renderExampleNotice(){
  const notice=$('#example-notice')
  notice.hidden=!draft.isExample
  const undo=$('#undo-example')
  undo.hidden=!originalExampleDraft
}
$('#undo-example').onclick=()=>{
  if(!originalExampleDraft)return
  resetTransient()
  draft=originalExampleDraft
  originalExampleDraft=null
  renderAll();markChanged()
}
function control(label,path,{kind='text',max=160,placeholder=examples[path.split('.').at(-1)]||'',options,disabled=false}={}){
  let input
  if(kind==='textarea')input=node('textarea',{rows:3,maxLength:max,placeholder,value:pathValue(path)||'',disabled})
  else if(kind==='select'){
    input=node('select',{disabled})
    for(const [value,text] of Object.entries(options))input.add(new Option(text,value))
    input.value=pathValue(path)
  } else if(kind==='checkbox')input=node('input',{type:'checkbox',checked:!!pathValue(path),disabled})
  else input=node('input',{type:kind,maxLength:max,placeholder,value:pathValue(path)||'',disabled})
  input.dataset.path=path
  return kind==='checkbox'?node('label',{class:'check'},input,label):node('label',{},label,input)
}
const recordLabels={experience:'Место работы',education:'Образование',higher:'Высшее образование'}
const listFor=key=>key==='portfolioUrls'?draft.contacts.portfolioUrls:key==='higher'?draft.education:draft[key]
const visibleFor=key=>listFor(key).filter(r=>key==='education'?r.kind==='general':key==='higher'?r.kind==='higher':true)
function listButton(iconPath,label,key,row,index,disabled){
  return node('button',{type:'button',class:'icon',title:label,'aria-label':label,disabled,data:{list:key,id:row.id,index}},svgIcon(iconPath))
}
function reorderRemove(key,row,index,count){
  return [
    listButton('M12 19V5M5 12l7-7 7 7','Переместить выше',key,row,'up',index===0),
    listButton('M12 5v14M5 12l7 7 7-7','Переместить ниже',key,row,'down',index===count-1),
    listButton('M18 6 6 18M6 6l12 12','Удалить запись',key,row,'remove',false)
  ]
}
function renderList(key){
  const host=$('#'+key)
  const rows=visibleFor(key)
  const target=key==='higher'?'education':key
  if(key==='higher'&&!draft.hasHigherEducation){
    host.replaceChildren()
    $('[data-add=education]').disabled=draft.education.length>=limits.education
    return
  }
  const elements=rows.map((row,index)=>{
    const path=target+'.'+row.id+'.'
    if(key==='skills'||key==='portfolioUrls'){
      const id=key==='skills'?'label':'url'
      const label=key==='skills'?'Навык '+(index+1):'Ссылка '+(index+1)
      return node('div',{class:'compact'},control(label,path+id,{kind:key==='skills'?'text':'url',max:key==='skills'?100:2048}),node('div',{class:'record-head'},...reorderRemove(key,row,index,rows.length)))
    }
    const education=key!=='experience'
    const first=education?control('Учебное заведение',path+'institution'):control('Должность',path+'role')
    const second=education?control('Программа или специальность',path+'program'):control('Компания',path+'employer')
    const fields=[node('div',{class:'pair'},first,second)]
    if(key==='higher')fields.push(control('Степень',path+'degree'))
    fields.push(node('div',{class:'pair'},control('Начало',path+'startMonth',{kind:'month'}),control('Окончание',path+'endMonth',{kind:'month',disabled:!education&&row.current})))
    if(education)fields.push(control('Статус',path+'status',{kind:'select',options:statuses}))
    else fields.push(control('По настоящее время',path+'current',{kind:'checkbox'}),control('Обязанности',path+'duties',{kind:'textarea',max:2000}),node('div',{data:{suggestion:'duties:'+row.id}}),control('Достижения',path+'achievements',{kind:'textarea',max:2000}),node('div',{data:{suggestion:'achievements:'+row.id}}))
    return node('div',{class:'record'},node('div',{class:'record-head'},node('h3',{},recordLabels[key]+' '+(index+1)),node('div',{},...reorderRemove(key,row,index,rows.length))),node('div',{class:'record-fields'},...fields))
  })
  if(key==='higher')elements.push(node('button',{type:'button',class:'text-button',data:{add:key},disabled:draft.education.length>=limits.education},svgIcon('M12 5v14M5 12h14'),node('span',{},'Добавить вуз')))
  host.replaceChildren(...elements)
  const add=$('[data-add="'+key+'"]')
  if(add)add.disabled=listFor(key).length>=limits[target]
  if(key==='education'||key==='higher')for(const control of $$('[data-add=education],[data-add=higher]'))control.disabled=draft.education.length>=limits.education
}
function controls(){
  for(const input of $$('[data-path]',form)){
    const value=pathValue(input.dataset.path)
    if(input.type==='checkbox')input.checked=!!value
    else input.value=value??''
  }
  $('[data-path="birthDate"]').max=localDate()
}
function renderAll(){
  for(const key of ['experience','skills','education','higher','portfolioUrls'])renderList(key)
  renderExampleNotice();controls();renderPhoto();renderAppearance();renderPreview();renderAI();showErrors()
}
function updateTabIndicator(){
  const tabsWrap=$('.workspace-tabs')
  if(!tabsWrap)return
  const active=workspace.dataset.tab||'split'
  const mobile=window.innerWidth<1024
  const idx=mobile?(active==='preview'?1:0):(active==='editor'?0:active==='preview'?2:1)
  tabsWrap.style.setProperty('--tab-index',String(idx))
}
function setTab(next,animate=true){
  if(workspace.dataset.tab===next){updateTabIndicator();return}
  scroll[workspace.dataset.tab]=window.scrollY
  workspace.dataset.tab=next
  for(const tab of $$('.tabs button'))tab.setAttribute('aria-pressed',String(tab.dataset.tab===next))
  updateTabIndicator()
  if(animate){
    workspace.classList.remove('tab-change')
    void workspace.offsetWidth
    workspace.classList.add('tab-change')
  }
  window.scrollTo(0,scroll[next]||0)
}
const syncMobileTab=()=>{
  if(window.innerWidth<1024&&workspace.dataset.tab==='split')setTab('editor',false)
  else updateTabIndicator()
}
syncMobileTab()
window.addEventListener('resize',syncMobileTab)
function renderPreview(animate=false){renderResume(document.querySelector('#paper'),draft,{photoUrl,animate})}
$('#zoom-paper').onclick=()=>{
  const zoom=$('#zoom-paper'), stage=$('.stage')
  const active=stage.classList.toggle('zoomed')
  zoom.setAttribute('aria-pressed',String(active))
  zoom.textContent=active?'Уместить лист':'Увеличить лист'
}
function renderAppearance(){
  for(const [host,items,field] of [['layouts',layouts,'layout'],['templates',templates,'template'],['palettes',palettes,'theme']]){
    const area=$('#'+host), focused=document.activeElement?.dataset?.option
    const controls=Object.entries(items).map(([key,label])=>{
      const caption=Array.isArray(label)?label[0]:label
      const b=button(caption,{'aria-pressed':String(draft.appearance[field]===key),data:{option:key}})
      if(field==='template')b.title=templateDesigns[key].description
      if(field==='template')b.prepend(node('i',{class:'mini '+key,'aria-hidden':'true'}))
      if(field==='theme'){
        const swatch=node('i',{class:'swatch','aria-hidden':'true'})
        swatch.style.setProperty('--swatch',label[1]);b.prepend(swatch)
      }
      b.onclick=()=>{
        const changed=draft.appearance[field]!==key
        draft.appearance[field]=key
        for(const child of area.children)child.setAttribute('aria-pressed',String(child===b))
        renderPreview(changed&&field!=='theme');markChanged()
      }
      return b
    })
    area.replaceChildren(...controls)
    if(focused)controls.find(b=>b.dataset.option===focused)?.focus()
  }
}
function showErrors(errors=triedExport?validate(draft):{}){
  for(const element of $$('[data-path]',form)){
    const message=errors[element.dataset.path]
    const id='err-'+element.dataset.path.replace(/[^a-z0-9]/gi,'-')
    const old=document.getElementById(id)
    if(message){
      const note=old||node('small',{class:'error',id})
      note.textContent=message
      if(!old)element.after(note)
      element.setAttribute('aria-invalid','true')
      element.setAttribute('aria-describedby',id)
    }else{
      old?.remove();element.removeAttribute('aria-invalid');element.removeAttribute('aria-describedby')
    }
  }
}
function changed(){
  if(reviewData&&reviewSource!==reviewSnapshot()){$('#review-status').textContent='Резюме изменилось после анализа. Повторите проверку.';clearReviewMarks()}
  renderPreview();markChanged();showErrors();$('#generate').disabled=!clean(draft.targetRole)||!!request
}
form.addEventListener('input',event=>{
  const input=event.target
  if(!input.dataset.path||input.type==='file')return
  pathValue(input.dataset.path,input.type==='checkbox'?input.checked:input.value)
  if(input.dataset.path==='hasHigherEducation') renderList('higher')
  if(input.dataset.path.endsWith('.current')){
    const end=input.dataset.path.replace(/current$/,'endMonth')
    const field=$('[data-path="'+end+'"]')
    field.disabled=input.checked
    if(input.checked){pathValue(end,'');field.value=''}
  }
  if(suggestions.length) refreshSuggestionState()
  changed()
})
form.addEventListener('submit',e=>e.preventDefault())
form.addEventListener('click',event=>{
  const target=event.target.closest('button')
  if(!target)return
  if(target.dataset.add){
    const key=target.dataset.add, rows=listFor(key), limit=limits[key==='higher'?'education':key]
    if(rows.length>=limit)return
    const row={id:crypto.randomUUID()}
    if(key==='experience')Object.assign(row,{role:'',employer:'',startMonth:'',endMonth:'',duties:'',achievements:'',current:false})
    if(key==='education'||key==='higher')Object.assign(row,{kind:key==='higher'?'higher':'general',institution:'',program:'',degree:'',startMonth:'',endMonth:'',status:'completed'})
    if(key==='skills')row.label=''
    if(key==='portfolioUrls')row.url=''
    rows.push(row)
    renderList(key);renderAI();changed()
    const created=$('input[data-path*=".'+row.id+'."]')
    created?.closest('.record,.compact')?.classList.add('record-new')
    created?.focus()
  }
  if(target.dataset.list){
    const {list:key,id,index:action}=target.dataset
    const rows=listFor(key), displayed=visibleFor(key), index=displayed.findIndex(r=>r.id===id)
    const i=rows.indexOf(displayed[index])
    if(i<0)return
    if(action==='remove')rows.splice(i,1)
    else{
      const j=rows.indexOf(displayed[index+(action==='up'?-1:1)])
      if(j<0)return
      ;[rows[i],rows[j]]=[rows[j],rows[i]]
    }
    renderList(key);renderAI();changed()
    const replacement=$('[data-list="'+key+'"][data-id="'+id+'"][data-index="'+action+'"]:not(:disabled)')
    ;(replacement||$('[data-add="'+key+'"]'))?.focus()
  }
})
document.addEventListener('click',event=>{
  const button=event.target.closest('button[data-tab],button[data-download]')
  if(!button)return
  if(button.dataset.tab)setTab(button.dataset.tab)
  else beginExport()
})
function closeDialog(){
  if(dialog.open)dialog.close()
}
function openDialog(title,...content){
  const heading=node('h2',{id:'dialog-title'},title)
  dialog.setAttribute('aria-labelledby','dialog-title')
  modal.replaceChildren(heading,...content)
  if(!dialog.open)dialog.showModal()
}
$('#close').onclick=closeDialog
$('#clear').onclick=()=>{
  const remove=button('Очистить',{class:'secondary'})
  const cancel=button('Отмена',{class:'text-button'})
  cancel.onclick=closeDialog
  remove.onclick=async()=>{
    clearing=true;remove.disabled=true;resetTransient()
    await queue
    try {
      const result=await clearDraft()
      closeDialog();assign({revision:result.revision});setTab('editor');window.scrollTo(0,0)
    }catch{status('Не удалось очистить черновик');closeDialog();renderAI()}
    finally{clearing=false}
  }
  openDialog('Очистить черновик?',node('p',{},'Данные резюме и его оформление будут удалены с этого устройства.'),node('div',{class:'dialog-actions'},remove,cancel))
}

function renderPhoto(){
  if(selectedPhoto!==draft.photo){
    if(photoUrl)URL.revokeObjectURL(photoUrl)
    photoUrl=draft.photo?URL.createObjectURL(draft.photo):''
    selectedPhoto=draft.photo
  }
  const picker=node('input',{type:'file',accept:'image/jpeg,image/png',hidden:true})
  const add=button(photoUrl?'Заменить фото':'Добавить фото',{class:'secondary'})
  const error=node('p',{class:'error',role:'status'})
  const part=node('div',{class:'photo-control'})
  if(photoUrl){
    const remove=button('Удалить',{class:'text-button'})
    remove.onclick=()=>{draft.photo=null;renderPhoto();changed();$('#photo button')?.focus()}
    part.append(node('img',{src:photoUrl,alt:'Фото соискателя'}),add,remove)
  }else part.append(add)
  add.onclick=()=>picker.click()
  picker.onchange=async()=>{
    const file=picker.files[0]
    picker.value=''
    if(!file)return
    if(!['image/jpeg','image/png'].includes(file.type)||file.size>5*1024*1024){
      error.textContent='Выберите фото JPEG или PNG до 5 МБ.';return
    }
    try { await cropPhoto(file) }catch{error.textContent='Не удалось открыть изображение.'}
  }
  $('#photo').replaceChildren(picker,part,error)
}
async function cropPhoto(file){
  const buffer=new Uint8Array(await file.slice(0,8).arrayBuffer())
  const jpeg=buffer[0]===255&&buffer[1]===216&&buffer[2]===255
  const png=[137,80,78,71,13,10,26,10].every((b,i)=>buffer[i]===b)
  if((file.type==='image/jpeg'&&!jpeg)||(file.type==='image/png'&&!png))throw new Error('Bad image')
  const cropEpoch=saveEpoch, image=await createImageBitmap(file)
  if(cropEpoch!==saveEpoch){image.close();return}
  let cx=.5,cy=.5
  const canvas=node('canvas',{width:300,height:220,'aria-label':'Область фото, нажмите для перемещения обрезки'})
  const result=node('canvas',{width:360,height:360,'aria-label':'Предпросмотр фото'})
  const zoom=node('input',{type:'range',min:'1',max:'3',step:'.05',value:'1'})
  const horizontal=node('input',{type:'range',min:'0',max:'100',value:'50'})
  const vertical=node('input',{type:'range',min:'0',max:'100',value:'50'})
  const scale=Math.min(300/image.width,220/image.height), w=image.width*scale,h=image.height*scale, x=(300-w)/2,y=(220-h)/2
  function paint(){
    const ctx=canvas.getContext('2d'), out=result.getContext('2d')
    const size=Math.min(image.width,image.height)/Number(zoom.value)
    const sx=Math.max(0,Math.min(image.width-size,cx*image.width-size/2))
    const sy=Math.max(0,Math.min(image.height-size,cy*image.height-size/2))
    ctx.clearRect(0,0,300,220);ctx.drawImage(image,x,y,w,h)
    ctx.strokeStyle='white';ctx.lineWidth=2;ctx.strokeRect(x+sx*scale,y+sy*scale,size*scale,size*scale)
    out.fillStyle='white';out.fillRect(0,0,360,360);out.drawImage(image,sx,sy,size,size,0,0,360,360)
  }
  canvas.onpointerdown=e=>{
    const r=canvas.getBoundingClientRect()
    cx=Math.max(0,Math.min(1,((e.clientX-r.left)*300/r.width-x)/w))
    cy=Math.max(0,Math.min(1,((e.clientY-r.top)*220/r.height-y)/h))
    horizontal.value=String(cx*100);vertical.value=String(cy*100);paint()
  }
  horizontal.oninput=()=>{cx=Number(horizontal.value)/100;paint()}
  vertical.oninput=()=>{cy=Number(vertical.value)/100;paint()}
  zoom.oninput=paint
  const save=button('Применить обрезку',{class:'secondary'})
  save.onclick=()=>{
    save.disabled=true
    result.toBlob(blob=>{
      if(!blob){save.disabled=false;return}
      if(!dialog.open||cropEpoch!==saveEpoch)return
      draft.photo=blob;closeDialog();renderPhoto();changed();$('#photo button')?.focus()
    },'image/jpeg',.9)
  }
  const cancel=button('Отмена',{class:'text-button'})
  cancel.onclick=closeDialog
  dialog.addEventListener('close',()=>image.close(),{once:true})
  openDialog('Обрезать фото',node('div',{class:'crop-images'},canvas,result),node('label',{},'Масштаб',zoom),node('label',{},'Положение по горизонтали',horizontal),node('label',{},'Положение по вертикали',vertical),node('div',{class:'dialog-actions'},save,cancel))
  paint()
}

const intentKey=s=>s.target==='summary'?'summary':s.target+':'+s.entryId
const intentPath=s=>s.target==='summary'?'summary':'experience.'+s.entryId+'.'+s.target
let aiSource=''
function refreshSuggestionState(){
  const stale=JSON.stringify(aiInput(draft))!==aiSource
  for(const item of $$('.suggestion-stale')){
    item.textContent=stale?'Исходные данные изменились. Проверьте формулировку или повторите генерацию.':''
  }
}
function renderAI(){
  $('#generate').disabled=!!request
  $('#ai-status').textContent=aiState
  $('#ai-hints').replaceChildren(...hints.map(text=>node('p',{class:'field-note'},text)))
  for(const host of $$('[data-suggestion]')){
    const item=suggestions.find(s=>intentKey(s)===host.dataset.suggestion)
    if(!item){host.replaceChildren();continue}
    const path=intentPath(item)
    const original=pathValue(path)||''
    const apply=(text,confirmed=false)=>{
      if(pathValue(path)===undefined)return
      if(!confirmed&&pathValue(path)!==item.before){
        const keep=button('Заменить текст',{class:'secondary'})
        keep.onclick=()=>{closeDialog();apply(text,true)}
        openDialog('Заменить изменённый текст?',node('p',{},'Поле было отредактировано после запуска генерации.'),node('div',{class:'dialog-actions'},keep))
        return
      }
      pathValue(path,text)
      const input=$('[data-path="'+path+'"]')
      if(input)input.value=text
      suggestions=suggestions.filter(x=>x!==item);renderAI();changed()
      input?.focus()
    }
    const accept=button('Принять',{class:'text-button'})
    accept.onclick=()=>apply(item.text)
    const edit=button('Изменить и принять',{class:'text-button'})
    edit.onclick=()=>{
      const text=node('textarea',{rows:6,value:item.text,maxLength:2000})
      const confirm=button('Принять',{class:'secondary'})
      confirm.onclick=()=>{closeDialog();apply(text.value)}
      openDialog('Изменить формулировку',node('label',{},'Текст для резюме',text),node('div',{class:'dialog-actions'},confirm))
      text.focus()
    }
    const reject=button('Отклонить',{class:'text-button'})
    reject.onclick=()=>{suggestions=suggestions.filter(x=>x!==item);renderAI();$('[data-path="'+path+'"]')?.focus()}
    host.replaceChildren(node('div',{class:'suggestion'},...(original?[node('strong',{},'Текущий текст'),node('p',{},original)]:[]),node('strong',{},'Предложение ИИ'),node('p',{},item.text),node('p',{class:'field-note suggestion-stale'}),node('div',{class:'suggestion-actions'},accept,edit,reject)))
  }
  refreshSuggestionState()
}
function buildLocalSuggestions(input){
  const role=clean(input.targetRole), skills=input.skills.slice(0,5), exp=input.experience||[], edu=input.education||[]
  const hints=[], out=[]
  const metricRe=/\d+%|\d+\s*(мс|ч|дн|мес|л|x|раз|млн|тыс|k|m|π|п\.п\.)/i
  const parts=[role||'Специалист']
  if(exp.length)parts.push('с опытом в «'+exp[0].employer+'»')
  if(skills.length)parts.push('ключевые навыки: '+skills.slice(0,4).join(', '))
  if(edu.length)parts.push('профильная подготовка: '+edu[0].institution)
  if(role||skills.length||exp.length){
    const summaryText=parts.join('; ')+'. '+(exp.some(e=>metricRe.test(e.achievements))?'Ориентируюсь на измеримый продуктовый результат и прозрачную работу с командой.':'Фокусируюсь на качестве выполнения задач, сроках и аккуратной передаче результата команде.')
    out.push({target:'summary',entryId:null,text:summaryText})
  }
  for(const row of exp){
    if(row.duties.trim()){
      const cleanDuties=row.duties.trim().replace(/\s+/g,' ').replace(/\.$/,'')
      out.push({target:'duties',entryId:row.id,text:'Ответственность в '+row.employer+': '+cleanDuties.charAt(0).toLowerCase()+cleanDuties.slice(1)+'.'})
    }
    if(row.achievements.trim()){
      const cleanAch=row.achievements.trim().replace(/\s+/g,' ').replace(/\.$/,'')
      out.push({target:'achievements',entryId:row.id,text:'Результат ('+(row.role||role||'роль')+'): '+cleanAch.charAt(0).toLowerCase()+cleanAch.slice(1)+'.'})
    }else hints.push('В записи «'+row.employer+'» добавьте измеримый итог: что ускорилось, выросло или сократилось.')
  }
  if(!exp.length)hints.push('Добавьте коммерческий опыт, стажировку или учебный проект с конкретным результатом.')
  if(skills.length<5)hints.push('Укажите 5–8 прикладных инструментов и технологий для лучшего прохождения фильтров.')
  return {suggestions:out,hints:hints.slice(0,5)}
}

function buildLocalReview(input,summary,question){
  const role=clean(input.targetRole), exp=input.experience||[], skills=input.skills||[], edu=input.education||[]
  const metricRe=/\d+/
  const hasMetrics=exp.some(e=>metricRe.test(e.achievements))
  const secRole={section:'targetRole',level:role.length>=6?'excellent':'good',reason:role.length>=6?'Должность сформулирована чётко: рекрутер сразу понимает уровень и профиль.':'Должность указана слишком коротко.',advice:role.length>=6?'При необходимости уточните грейд или ключевую специализацию в скобках.':'Уточните стек или специализацию (например: «Senior Product Designer (UI/UX)»).'}
  const secSum={section:'summary',level:summary.length>=120?'excellent':summary.length>=40?'good':'weak',reason:summary.length>=120?'Раздел «О себе» даёт целостный контекст о специализации и подходе.':summary.length>=40?'Описание базовое, не хватает акцента на ключевых сильных сторонах.':'Блок «О себе» почти не заполнен.',advice:'Сформулируйте 2–3 предложения: опыт, главная специализация и 1 измеримый фокус. Готовый вариант можно принять выше по кнопке «Принять».'}
  const secExp={section:'experience',level:exp.length>=2&&hasMetrics?'excellent':exp.length>=1?'good':'weak',reason:exp.length?(hasMetrics?'Опыт содержит конкретные места работы и измеримые достижения.':'Места работы указаны, но достижения можно усилить цифрами.'):'Опыт работы пока не добавлен.',advice:exp.length?'Для каждой ключевой роли выделите итог в формате «действие → метрика/эффект».':'Добавьте проекты, фриланс или учебные кейсы с конкретными задачами.'}
  const secSkills={section:'skills',level:skills.length>=6?'excellent':skills.length>=3?'good':'weak',reason:skills.length>=6?'Достаточно ключевых навыков ('+skills.length+') для поиска по базе и ATS.':'Навыков мало ('+skills.length+'): резюме хуже находится рекрутерами.',advice:'Сгруппируйте 6–12 релевантных инструментов, методов и языков под целевую вакансию.'}
  const secEdu={section:'education',level:edu.length>=1?'excellent':'good',reason:edu.length>=1?'Образование или профильные курсы подтверждены.': 'Блок образования не обязателен, но усиливает профиль для ряда компаний.',advice:edu.length>=1?'Держите в приоритете профильные программы и недавние интенсивы.':'При желании включите вуз или профильные курсы.'}
  const sections=[secRole,secSum,secExp,secSkills,secEdu]
  const scoreMap={weak:8,good:15,excellent:20}
  const score=Math.min(100,sections.reduce((acc,s)=>acc+scoreMap[s.level],0))
  const localSug=buildLocalSuggestions(input)
  let answer='Встроенный разбор проверил 5 ключевых блоков резюме строго по вашим фактам (итого '+score+' / 100).'
  if(question){
    answer='По вашему вопросу («'+question+'»): опирайтесь на реальные факты из блоков «'+ (role||'должность') +'» и '+ (exp.length?'опыт в «'+exp[0].employer+'»':'учебные/пет-проекты') +'. Вынесите измеримый результат в первую строку достижений и примите предложенные ниже правки.'
  }
  return {score,answer,sections,suggestions:localSug.suggestions,hints:localSug.hints}
}

async function generate(){
  if(request||!clean(draft.targetRole)){if(!clean(draft.targetRole)){aiState='Сначала укажите желаемую должность.';renderAI()}return}
  const controller=new AbortController()
  request=controller
  const input=aiInput(draft), source=JSON.stringify(input)
  const before=new Map([['summary',draft.summary],...draft.experience.flatMap(r=>[['duties:'+r.id,r.duties],['achievements:'+r.id,r.achievements]])])
  const timeout=setTimeout(()=>controller.abort(),35000)
  if(!currentUser.hasKey){
    const value=buildLocalSuggestions(input)
    aiSource=source
    suggestions=value.suggestions.filter(s=>before.has(intentKey(s))&&pathValue(intentPath(s))!==undefined).map(s=>({...s,before:before.get(intentKey(s))}))
    hints=value.hints
    aiState=suggestions.length?'Готово (встроенный редактор без Google API key).':'Заполните опыт или навыки для рекомендаций.'
    request=null;clearTimeout(timeout);renderAI();return
  }
  aiState='Готовим формулировки…';renderAI()
  try{
    const response=await fetch('/api/v1/resume/suggestions',{method:'POST',headers:{'content-type':'application/json','X-Account-Id':currentUser.id},body:source,signal:controller.signal})
    const value=await response.json()
    if(!response.ok){
      if(response.status===429&&response.headers.get('Retry-After'))throw new Error('Повторите через '+response.headers.get('Retry-After')+' с.')
      throw new Error(value.message||'Не удалось подготовить текст. Попробуйте ещё раз.')
    }
    if(request!==controller)return
    aiSource=source
    suggestions=value.suggestions.filter(s=>before.has(intentKey(s))&&pathValue(intentPath(s))!==undefined).map(s=>({...s,before:before.get(intentKey(s))}))
    hints=value.hints
    aiState=suggestions.length?'Предложения готовы.':''
  }catch(error){
    if(request===controller){
      const fallback=buildLocalSuggestions(input)
      aiSource=source
      suggestions=fallback.suggestions.filter(s=>before.has(intentKey(s))&&pathValue(intentPath(s))!==undefined).map(s=>({...s,before:before.get(intentKey(s))}))
      hints=fallback.hints
      aiState='Google недоступен ('+error.message+'), поэтому сработала локальная редактура.'
    }
  }finally{
    clearTimeout(timeout)
    if(request===controller){request=null;renderAI()}
  }
}
$('#generate').onclick=()=>{
  if(!clean(draft.targetRole)){aiState='Сначала укажите желаемую должность.';renderAI();$('[data-path="targetRole"]')?.focus();return}
  if(!currentUser.hasKey||safePref('resume-ai-notice')==='seen'){generate();return}
  const proceed=button('Продолжить',{class:'secondary'})
  proceed.onclick=()=>{safePref('resume-ai-notice','seen');closeDialog();generate()}
  openDialog('Перед генерацией',node('p',{},'ИИ получит должность, навыки, опыт и образование. Личные сведения, которые вы сами написали в этих разделах, также будут переданы.'),node('p',{},'Поля имени, фото, даты рождения и контактов не отправляются.'),node('div',{class:'dialog-actions'},proceed))
}
const sectionNames={targetRole:'Желаемая должность',summary:'О себе',experience:'Опыт',skills:'Навыки',education:'Образование'}
const levelNames={weak:'Слабое место',good:'Хорошо',excellent:'Отлично'}
function reviewSnapshot(){return JSON.stringify({...aiInput(draft),summary:draft.summary})}
function clearReviewMarks(){for(const el of $$('[data-review-level]')){delete el.dataset.reviewLevel;el.querySelector('.review-badge')?.remove()}}
function displayReview(value){
  clearReviewMarks()
  const host=$('#review-results')
  host.replaceChildren(node('div',{class:'review-score'},node('strong',{},String(value.score)),node('span',{},'/ 100 · оценка качества текста')),node('p',{class:'field-note'},'Оценка ИИ субъективна и не предсказывает решение работодателя.'),node('p',{class:'coach-answer'},value.answer))
  for(const item of value.sections){
    const field=item.section==='summary'||item.section==='targetRole'?$('[data-path="'+item.section+'"]').closest('label'):$('[data-review-section="'+item.section+'"]')
    if(field){field.dataset.reviewLevel=item.level;field.append(node('span',{class:'review-badge '+item.level},levelNames[item.level]))}
    const jump=button('Перейти к разделу',{class:'text-button'})
    jump.onclick=()=>{setTab('editor');field?.scrollIntoView({behavior:'smooth',block:'center'});field?.querySelector('input,textarea')?.focus({preventScroll:true})}
    host.append(node('article',{class:'review-card '+item.level},node('span',{class:'review-badge '+item.level},levelNames[item.level]),node('h3',{},sectionNames[item.section]),node('p',{},item.reason),node('p',{class:'review-advice'},item.advice),jump))
  }
  if(value.hints.length)host.append(node('h3',{},'Что стоит уточнить'),...value.hints.map(h=>node('p',{class:'field-note'},h)))
}
$('#review-resume').onclick=async()=>{
  if(reviewRequest)return
  const state=$('#review-status'),control=$('#review-resume')
  if(!clean(draft.targetRole)){state.textContent='Сначала укажите желаемую должность в разделе 01.';$('[data-path="targetRole"]')?.focus();return}
  const source=reviewSnapshot(),parsed=JSON.parse(source),question=$('#coach-question').value.trim(),input={...parsed,message:question}
  const before=new Map([['summary',draft.summary],...draft.experience.flatMap(r=>[['duties:'+r.id,r.duties],['achievements:'+r.id,r.achievements]])])
  if(!currentUser.hasKey){
    const value=buildLocalReview(parsed,draft.summary,question)
    reviewSource=source;reviewData=value;displayReview(value)
    if(value.suggestions.length){aiSource=JSON.stringify(aiInput(draft));suggestions=value.suggestions.filter(s=>before.has(intentKey(s))).map(s=>({...s,before:before.get(intentKey(s))}));hints=value.hints;renderAI()}
    state.textContent='Разбор готов (встроенный редактор). Для анализа через Gemini можно подключить свой Google API key в шапке.'
    return
  }
  if(!$('#review-consent').checked){state.textContent='Подтвердите передачу выбранных разделов Google (или отключите ключ для локального разбора).';$('#review-consent').focus();return}
  const controller=new AbortController();reviewRequest=controller
  const timeout=setTimeout(()=>controller.abort(),35000)
  control.disabled=true;control.textContent='Анализируем…';state.textContent='Помощник читает резюме и готовит рекомендации.'
  try{
    const response=await fetch('/api/v1/resume/review',{method:'POST',headers:{'Content-Type':'application/json','X-Account-Id':currentUser.id},body:JSON.stringify(input),signal:controller.signal})
    const value=await response.json()
    if(!response.ok)throw Error(value.message||'Не удалось получить анализ.')
    if(reviewRequest!==controller)return
    if(source!==reviewSnapshot()){state.textContent='Резюме изменилось во время анализа. Повторите проверку.';return}
    reviewSource=source;reviewData=value;displayReview(value)
    if(value.suggestions.length){aiSource=JSON.stringify(aiInput(draft));suggestions=value.suggestions.map(s=>({...s,before:before.get(intentKey(s))}));hints=value.hints;renderAI()}
    state.textContent='Анализ готов. Предложения текста можно принять в соответствующих разделах.'
  }catch(e){
    if(reviewRequest===controller){
      const fallback=buildLocalReview(parsed,draft.summary,question)
      reviewSource=source;reviewData=fallback;displayReview(fallback)
      if(fallback.suggestions.length){aiSource=JSON.stringify(aiInput(draft));suggestions=fallback.suggestions.filter(s=>before.has(intentKey(s))).map(s=>({...s,before:before.get(intentKey(s))}));hints=fallback.hints;renderAI()}
      state.textContent='Google недоступен ('+e.message+'), показан встроенный разбор без потери данных.'
    }
  }
  finally{clearTimeout(timeout);if(reviewRequest===controller){reviewRequest=null;control.disabled=false;control.textContent='Проанализировать резюме'}}
}
async function getFont(){
  if(!fontPromise)fontPromise=fetch('/pdf-font.ttf').then(response=>{
    if(!response.ok)throw new Error('Не удалось загрузить шрифт PDF.')
    return response.arrayBuffer()
  }).catch(error=>{fontPromise=null;throw error})
  return fontPromise
}
function beginExport(exportDraft=draft){
  if(exporting||!loaded)return
  if(exportDraft===draft)triedExport=true
  const errors=validate(exportDraft)
  if(exportDraft===draft)showErrors(errors)
  if(Object.keys(errors).length){
    if(exportDraft!==draft){openDialog('Проверьте пример',node('p',{},Object.values(errors)[0]));return}
    showProductView(false)
    setTab('editor')
    requestAnimationFrame(()=>$('[aria-invalid=true]',form)?.focus())
    return
  }
  const options=node('div')
  for(const [key,label] of [['mobile','Для телефона'],['desktop','Для ПК и печати']]){
    options.append(node('label',{class:'export-option'},node('input',{type:'radio',name:'export-layout',value:key,checked:key===exportDraft.appearance.layout}),label))
  }
  const printOption=node('input',{type:'checkbox'})
  if(exportDraft.appearance.template==='monolith')options.append(node('label',{class:'export-option'},printOption,'Светлый фон для печати'))
  const submit=button('Скачать PDF',{class:'primary'})
  const result=node('div',{role:'status',class:'field-note'})
  submit.onclick=async()=>{
    if(exporting)return
    const layout=$('input[name=export-layout]:checked',options).value
    const snapshot=structuredClone(exportDraft)
    const view=resumeView(snapshot)
    exporting=true;submit.disabled=true;submit.textContent='Готовим PDF…';result.replaceChildren()
    for(const input of $$('input',options))input.disabled=true
    try{
      const font=await getFont()
      const photo=snapshot.photo?{data:new Uint8Array(await snapshot.photo.arrayBuffer()),width:360,height:360}:null
      const data=buildPdf(view,{...snapshot.appearance,layout,printLight:printOption.checked},font,photo)
      const url=URL.createObjectURL(new Blob([data],{type:'application/pdf'}))
      const name=view.name.replace(/[<>:"/\\|?*\x00-\x1F]/g,' ').trim()
      const filename='Резюме — '+name+' — '+(layout==='mobile'?'телефон':'ПК')+'.pdf'
      const link=node('a',{href:url,download:filename},'Скачать ещё раз')
      result.replaceChildren(node('p',{},'PDF готов. Если браузер открыл его, сохраните файл из просмотра.'),link)
      link.click()
      setTimeout(()=>URL.revokeObjectURL(url),120000)
    }catch{
      result.replaceChildren(node('p',{class:'error'},'Не удалось создать PDF. Попробуйте ещё раз.'))
    }finally{
      exporting=false;submit.disabled=false;submit.textContent='Скачать PDF'
      for(const input of $$('input',options))input.disabled=false
    }
  }
  openDialog('Скачать PDF',options,node('div',{class:'dialog-actions'},submit),result)
}
form.inert=true
readDraft().then(assign).catch(()=>{
  renderAll();status('Черновик не может сохраниться в этом браузере')
}).finally(()=>{loaded=true;form.inert=false;if(new URLSearchParams(location.search).get('view')==='jobs')showJobs();else if(document.body.classList.contains('jobs-active'))renderPortfolioStep()})


