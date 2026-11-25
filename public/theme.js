(()=>{
  const key='resume-dark-variant-theme'
  const sunSvg='<svg class="ui-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>'
  const moonSvg='<svg class="ui-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>'
  const read=()=>{try{return localStorage.getItem(key)==='light'?'light':'dark'}catch{return 'dark'}}
  function apply(theme){
    const next=theme==='dark'?'dark':'light'
    document.documentElement.dataset.theme=next
    const dark=next==='dark'
    for(const b of document.querySelectorAll('[data-theme-toggle]')){
      b.innerHTML=dark?sunSvg:moonSvg
      b.title=dark?'Включить светлую тему':'Включить тёмную тему'
      b.setAttribute('aria-label',b.title)
      b.setAttribute('aria-pressed',String(dark))
    }
    for(const c of document.querySelectorAll('[data-theme-choice]')){
      if(c?.dataset?.themeChoice)c.setAttribute('aria-pressed',String(c.dataset.themeChoice===next))
    }
  }
  function selectTheme(next){
    const root=document.documentElement
    if(root.classList&&typeof setTimeout==='function'){
      root.classList.add('theme-transitioning')
      setTimeout(()=>root.classList.remove('theme-transitioning'),300)
    }
    try{localStorage.setItem(key,next)}catch{}
    apply(next)
  }
  function bind(){
    for(const b of document.querySelectorAll('[data-theme-toggle]'))b.onclick=()=>selectTheme(document.documentElement.dataset.theme==='dark'?'light':'dark')
    for(const c of document.querySelectorAll('[data-theme-choice]')){
      if(c?.dataset?.themeChoice)c.onclick=()=>selectTheme(c.dataset.themeChoice==='light'?'light':'dark')
    }
    apply(read())
  }
  apply(read())
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind()
  window.addEventListener('storage',e=>{if(e.key===key)apply(read())})
  window.addEventListener('pageshow',()=>apply(read()))
})()
