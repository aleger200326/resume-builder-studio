import {filterBoards,jobRegions} from './jobs-data.js'
export function initJobBoards(){
  const search=document.querySelector('#jobs-search'),list=document.querySelector('#jobs-list'),filters=document.querySelector('#jobs-filters'),count=document.querySelector('#jobs-count')
  let region='all'
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n}
  const arrowSvg=()=>{
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg')
    svg.setAttribute('class','ui-icon')
    svg.setAttribute('viewBox','0 0 24 24')
    svg.setAttribute('aria-hidden','true')
    const p=document.createElementNS('http://www.w3.org/2000/svg','path')
    p.setAttribute('d','M7 17 17 7M7 7h10v10')
    svg.append(p)
    return svg
  }
  function render(){
    const boards=filterBoards(search.value,region)
    count.textContent='Площадок: '+boards.length+' из 30'
    list.replaceChildren(...boards.map(board=>{
      const row=el('a','job-row');row.href=board.url;row.target='_blank';row.rel='noopener noreferrer';row.setAttribute('aria-label',board.name+' — открыть вакансии в новой вкладке')
      const icon=el('span','job-logo',board.icon);icon.style.backgroundColor=board.color;icon.setAttribute('aria-hidden','true')
      const copy=el('div','job-copy'),title=el('div','job-title');title.append(el('strong','',board.name),el('span','job-domain',new URL(board.url).hostname.replace(/^www\./,'')))
      copy.append(title,el('p','',board.description))
      const tags=el('div','job-tags');for(const tag of board.tags)tags.append(el('span','',tag))
      const arrow=el('span','job-arrow');arrow.setAttribute('aria-hidden','true');arrow.append(arrowSvg())
      row.append(icon,copy,tags,arrow);return row
    }))
    if(!boards.length)list.append(el('p','jobs-empty','Ничего не найдено. Попробуйте другое название или фильтр.'))
  }
  for(const [id,label] of Object.entries(jobRegions)){
    const b=el('button','',label);b.type='button';b.setAttribute('aria-pressed',String(id==='all'))
    b.onclick=()=>{region=id;for(const c of filters.children)c.setAttribute('aria-pressed',String(c===b));render()};filters.append(b)
  }
  search.addEventListener('input',render);render()
}
