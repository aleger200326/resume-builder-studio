import {resumeView,templateKey,templateDesigns,templateAccent,orderedSections} from './model.js'
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n}
function sectionNode(section){
  const n=el('section','resume-'+section.key)
  n.append(el('h3','',section.title))
  for(const entry of section.entries){
    const row=el('div','entry')
    for(const line of entry){
      const p=el('p',line.kind==='meta'?'meta':'')
      if(line.url){const a=el('a','',line.text);a.href=line.url;a.target='_blank';a.rel='noopener noreferrer';p.append(a)}
      else if(line.kind==='strong')p.append(el('strong','',line.text))
      else p.textContent=line.text
      row.append(p)
    }
    n.append(row)
  }
  return n
}
export function renderResume(host,draft,{photoUrl='',animate=false}={}){
  const view=resumeView(draft),key=templateKey(draft.appearance.template),design=templateDesigns[key]
  const mobile=draft.appearance.layout==='mobile'
  host.className='paper resume-design '+key+' '+(mobile?'mobile':'desktop')+(animate?' animated':'')
  for(const [name,value] of Object.entries({ink:design.ink,accent:templateAccent(key,draft.appearance.theme),background:design.background,sidebar:design.sidebar,sideInk:design.sideInk}))host.style.setProperty('--cv-'+name,value)
  const sheet=el('article','sheet cv-sheet'),header=el('header','cv-identity')
  if(photoUrl){const img=el('img','cv-photo');img.src=photoUrl;img.alt='Портрет соискателя';header.append(img)}
  const identity=el('div','cv-name');identity.append(el('h2','',view.name||'Имя и фамилия'),el('p','role',view.role||'Желаемая должность'))
  if(view.birthDate)identity.append(el('p','meta',view.birthDate))
  header.append(identity)
  const side=el('aside','cv-sidebar'),main=el('div','cv-main'),content=el('div','cv-content')
  const sections=orderedSections(view.sections,key)
  for(const section of sections)(design.side.includes(section.key)?side:main).append(sectionNode(section))
  if(design.header==='side')side.prepend(header)
  else if(design.header==='main')main.prepend(header)
  else sheet.append(header)
  if(design.side.length){content.append(side,main);sheet.append(content)}else sheet.append(main)
  host.replaceChildren(sheet)
}
