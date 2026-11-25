import {renderResume} from './resume-render.js'
import {blank,templates,templateDesigns} from './model.js'

let user=null,requestVersion=0

const gallery=document.querySelector('#landing-bento-gallery')
const filters=document.querySelector('#landing-template-filters')

const categories={
  classic:{cat:'single',tag:'SINGLE COLUMN · A4'},
  graphite:{cat:'two',tag:'SLATE SIDEBAR · A4'},
  editorial:{cat:'two',tag:'MONOGRAPH · SERIF'},
  architect:{cat:'two',tag:'SWISS GRID · A4'},
  portfolio:{cat:'two',tag:'SAGE PORTFOLIO · A4'},
  monolith:{cat:'dark',tag:'DARK EDITION · MONO'},
  career:{cat:'two',tag:'TIMELINE · TWO-COL'},
  nordic:{cat:'two',tag:'NORDIC ALABASTER · A4'},
  obsidian:{cat:'dark',tag:'MIDNIGHT TECH · DARK'},
  atelier:{cat:'single',tag:'ATELIER SERIF · A4'},
  swiss:{cat:'single',tag:'TYPOGRAPHIC GRID · A4'},
  emerald:{cat:'two',tag:'EXECUTIVE RAIL · A4'}
}

function makeCandidate(cfg){
  const d=blank()
  return {
    ...d,
    fullName:cfg.name,
    targetRole:cfg.role,
    summary:cfg.summary,
    contacts:{
      email:cfg.email,
      phone:cfg.phone,
      profileUrl:cfg.url,
      city:cfg.city,
      portfolioUrls:[{id:'p1',url:cfg.workUrl}]
    },
    experience:cfg.exp.map((e,i)=>({
      id:'e'+i,role:e.role,employer:e.employer,startMonth:e.start,endMonth:e.end,current:!e.end,
      duties:e.duties,achievements:e.achievements
    })),
    skills:cfg.skills.map((label,i)=>({id:'s'+i,label})),
    hasHigherEducation:true,
    education:[{id:'ed1',kind:'higher',institution:cfg.edu[0],program:cfg.edu[1],degree:cfg.edu[2],startMonth:'2015-09',endMonth:'2019-06',status:'completed'}]
  }
}

const showcasePersonas={
  classic:{
    photo:'/avatars/avatar-01.jpg',
    name:'Алина Каримова',
    role:'Senior Product Manager · FinTech',
    city:'Ташкент, Узбекистан',
    email:'alina.karimova@product.uz',
    phone:'+998 90 312-44-18',
    url:'https://t.me/alina_pm_uz',
    workUrl:'https://karimova.pm/cases',
    summary:'Запускаю платёжные и B2B-продукты в Центральной Азии. Вывожу фичи от discovery-интервью до роста ключевой выручки и retention.',
    exp:[
      {role:'Senior Product Manager',employer:'Payme Business · Ташкент',start:'2023-05',end:'',duties:'B2B-эквайринг, онбординг мерчантов и отчётность.',achievements:'Сократила KYC-подключение с 4 дней до 35 минут; GMV сегмента вырос на 41%.'},
      {role:'Product Manager',employer:'Click Studio',start:'2021-02',end:'2023-04',duties:'Команда автоплатежей и подписок.',achievements:'Увеличила повторные транзакции на 24% за счёт умных напоминаний.'}
    ],
    skills:['Product Discovery','Unit Economics','SQL','A/B-тесты','B2B FinTech','CJM'],
    edu:['Вестминстерский университет (WIUT)','Business & Economics','Бакалавр']
  },
  graphite:{
    photo:'/avatars/avatar-02.jpg',
    name:'Даниил Соколов',
    role:'Backend Team Lead · Go / Distributed Systems',
    city:'Санкт-Петербург',
    email:'d.sokolov@gopher.dev',
    phone:'+7 921 514-80-22',
    url:'https://github.com/dsokolov-go',
    workUrl:'https://sokolov.dev/architecture',
    summary:'Проектирую высоконагруженные биллинговые сервисы и отказоустойчивые очереди на Go, Kafka и PostgreSQL.',
    exp:[
      {role:'Backend Team Lead',employer:'FinCore Processing',start:'2022-09',end:'',duties:'Команда из 9 инженеров, ядро платёжного шлюза.',achievements:'Снизил p99-латентность с 240 мс до 38 мс под пиковой нагрузкой 45k RPS.'},
      {role:'Senior Go Developer',employer:'CloudPay',start:'2019-11',end:'2022-08',duties:'Микросервисы идемпотентности и антифрода.',achievements:'Провёл шардирование БД без простоя продакшена.'}
    ],
    skills:['Go','PostgreSQL','Apache Kafka','gRPC','Redis','Kubernetes'],
    edu:['ИТМО','Программная инженерия','Магистр']
  },
  editorial:{
    photo:'/avatars/avatar-03.jpg',
    name:'Мадина Юсупова',
    role:'Lead UX Writer & Content Designer',
    city:'Ташкент / Удалённо',
    email:'madina@yusupova.media',
    phone:'+998 93 704-11-90',
    url:'https://t.me/madina_uxwords',
    workUrl:'https://yusupova.media/tone',
    summary:'Выстраиваю голос продукта и понятные интерфейсные тексты на русском, узбекском и английском для банков и маркетплейсов.',
    exp:[
      {role:'Lead UX Writer',employer:'Anor Digital Bank',start:'2023-01',end:'',duties:'Редполитика, онбординг кредитных продуктов и локализация.',achievements:'Переписала 18 экранов оформления карты — доля отказов снизилась на 14%.'}
    ],
    skills:['UX-копирайтинг','Tone of Voice','Локализация RU/UZ/EN','Figma','Исследования'],
    edu:['УзГУМЯ','Лингвистика и коммуникации','Бакалавр']
  },
  architect:{
    photo:'/avatars/avatar-04.jpg',
    name:'Артём Мельников',
    role:'Principal Frontend Architect (React / TS)',
    city:'Москва',
    email:'artem@melnikov.tech',
    phone:'+7 916 402-77-15',
    url:'https://github.com/amelnikov-ui',
    workUrl:'https://melnikov.tech/ds',
    summary:'Отвечаю за фронтенд-платформу, скорость рендеринга и модульные UI-киты для крупных веб-кабинетов.',
    exp:[
      {role:'Principal Frontend Architect',employer:'Alfa Workspace',start:'2022-04',end:'',duties:'Единая архитектура 9 микрофронтендов и CI/CD.',achievements:'Ускорил сборку и холодный старт на 48%, внедрил строгое покрытие тестами.'}
    ],
    skills:['TypeScript','React','Web Performance','Design Tokens','Node.js','Playwright'],
    edu:['МГТУ им. Баумана','Информатика и ВТ','Специалист']
  },
  portfolio:{
    photo:'/avatars/avatar-05.jpg',
    name:'София Ким',
    role:'Art Director & Brand Lead',
    city:'Алматы',
    email:'sofia@kimstudio.kz',
    phone:'+7 701 884-19-05',
    url:'https://behance.net/sofiakim',
    workUrl:'https://kimstudio.kz/selected',
    summary:'Создаю целостные айдентики, арт-дирекшн цифровых кампаний и дизайн-системы для технологических брендов.',
    exp:[
      {role:'Art Director',employer:'Kalypso Brand Lab',start:'2021-06',end:'',duties:'Креативное руководство 6 продуктовых запусков.',achievements:'Два клиентских кейса вошли в шорт-лист Red Dot Design Award 2025.'}
    ],
    skills:['Арт-дирекшн','Айдентика','Типографика','Figma','Motion-гайдлайны'],
    edu:['КазГАСА','Графический дизайн','Бакалавр']
  },
  monolith:{
    photo:'/avatars/avatar-06.jpg',
    name:'Илья Волков',
    role:'DevSecOps & Cloud Platform Lead',
    city:'Минск / Удалённо',
    email:'ilya@volkov.ops',
    phone:'+375 29 615-30-88',
    url:'https://github.com/ivolkov-k8s',
    workUrl:'https://volkov.ops/runbooks',
    summary:'Автоматизирую мультирегиональные Kubernetes-кластеры, observability и безопасные пайплайны выкладки.',
    exp:[
      {role:'Lead DevSecOps',employer:'Nordic Cloud Systems',start:'2022-11',end:'',duties:'Инфраструктура как код, Vault, Zero-Trust сеть.',achievements:'Довёл SLA продовых кластеров до 99.98%, сократив время деплоя в 3 раза.'}
    ],
    skills:['Kubernetes','Terraform','AWS / GCP','Prometheus','HashiCorp Vault','Linux'],
    edu:['БГУИР','Информационная безопасность','Инженер']
  },
  career:{
    photo:'/avatars/avatar-07.jpg',
    name:'Екатерина Лебедева',
    role:'HR Business Partner · R&D',
    city:'Москва',
    email:'katya@lebedeva-hr.ru',
    phone:'+7 903 245-61-09',
    url:'https://t.me/lebedeva_hrbp',
    workUrl:'https://lebedeva-hr.ru/cases',
    summary:'Сопровождаю продуктовые и инженерные департаменты: найм ключевых лидов, оценка компетенций, грейды и удержание.',
    exp:[
      {role:'Senior HRBP',employer:'TechBridge Group',start:'2022-03',end:'',duties:'Масштабирование R&D-направлений и ревью руководителей.',achievements:'Закрыла найм 110 инженеров за 9 месяцев; retention ключевых команд — 94%.'}
    ],
    skills:['HRBP','R&D-найм','Матрицы грейдов','eNPS','People Analytics'],
    edu:['НИУ ВШЭ','Управление персоналом','Магистр']
  },
  nordic:{
    photo:'/avatars/avatar-08.jpg',
    name:'Олег Назаров',
    role:'Lead Data & Product Analyst',
    city:'Новосибирск',
    email:'oleg@nazarov.data',
    phone:'+7 913 770-12-49',
    url:'https://t.me/nazarov_bi',
    workUrl:'https://nazarov.data/dbt',
    summary:'Строю витрины данных на ClickHouse и dbt, провожу каузальные эксперименты и считаю LTV по когортам.',
    exp:[
      {role:'Lead Product Analyst',employer:'Vektor Commerce',start:'2023-02',end:'',duties:'Сквозная аналитика, эксперименты и BI-витрины.',achievements:'Выявил неэффективные каналы и сэкономил $140k годового маркетингового бюджета.'}
    ],
    skills:['SQL / ClickHouse','Python','dbt','Looker / Superset','А/Б-тестирование'],
    edu:['НГУ','Прикладная математика','Бакалавр']
  },
  obsidian:{
    photo:'/avatars/avatar-09.jpg',
    name:'Азиз Абдуллаев',
    role:'Staff iOS Engineer · SwiftUI',
    city:'Ташкент',
    email:'aziz@abdullaev.dev',
    phone:'+998 97 441-89-02',
    url:'https://github.com/aziz-ios',
    workUrl:'https://abdullaev.dev/swift',
    summary:'Проектирую модульные iOS-приложения с акцентом на плавные анимации, офлайн-кэш и криптографическую безопасность.',
    exp:[
      {role:'Staff iOS Engineer',employer:'SamPay Mobile · Ташкент',start:'2023-06',end:'',duties:'Перевод клиент-банка с 2.1M MAU на SwiftUI.',achievements:'Снизил долю крашей до 0.04% и ускорил холодный запуск на 28%.'}
    ],
    skills:['Swift / SwiftUI','Combine','CoreData','Modular Architecture','CI / Fastlane'],
    edu:['ТУИТ (TUIT)','Программный инжиниринг','Бакалавр']
  },
  atelier:{
    photo:'/avatars/avatar-10.jpg',
    name:'Вероника Морозова',
    role:'Senior Architectural Designer',
    city:'Санкт-Петербург',
    email:'nika@morozova.arch',
    phone:'+7 921 309-55-41',
    url:'https://behance.net/veronikamorozova',
    workUrl:'https://morozova.arch/projects',
    summary:'Проектирую коммерческие пространства, флагманские шоурумы и авторскую мебель с полным циклом авторского надзора.',
    exp:[
      {role:'Ведущий архитектор',employer:'Бюро «Линия»',start:'2021-01',end:'',duties:'Концепции, рабочая документация BIM и надзор.',achievements:'Сдала 24 общественных интерьера общей площадью 11 000 м².'}
    ],
    skills:['Revit BIM','AutoCAD','3ds Max / Corona','Авторский надзор','Светодизайн'],
    edu:['СПбГАСУ','Архитектура','Специалист']
  },
  swiss:{
    photo:'/avatars/avatar-11.jpg',
    name:'Максим Орлов',
    role:'Head of B2B Growth & Revenue',
    city:'Ереван / Удалённо',
    email:'max@orlov.growth',
    phone:'+374 91 482-310',
    url:'https://linkedin.com/in/max-orlov',
    workUrl:'https://orlov.growth/playbook',
    summary:'Запускаю B2B-воронки и партнёрские каналы на рынках СНГ, Восточной Европы и MENA с фокусом на payback и LTV/CAC.',
    exp:[
      {role:'Head of Growth',employer:'ScaleSaaS Global',start:'2022-07',end:'',duties:'Пайплайн энтерпрайз-сделок и account-based маркетинг.',achievements:'Увеличил рекуррентную выручку с $45k до $210k MRR за 12 месяцев.'}
    ],
    skills:['B2B Growth','ABM','HubSpot / CRM','Unit Economics','GTM-стратегия'],
    edu:['РАНХиГС','Стратегический менеджмент','Магистр']
  },
  emerald:{
    photo:'/avatars/avatar-12.jpg',
    name:'Лейла Алиева',
    role:'Financial Controller · МСФО / FP&A',
    city:'Баку / Ташкент',
    email:'leyla@alieva-fin.com',
    phone:'+994 50 328-74-19',
    url:'https://linkedin.com/in/leyla-alieva',
    workUrl:'https://alieva-fin.com/audit',
    summary:'Выстраиваю управленческий учёт по МСФО, бюджетный контроль и финансовые модели для холдингов и ИТ-компаний.',
    exp:[
      {role:'Senior Financial Controller',employer:'Caspian Tech Holdings',start:'2022-05',end:'',duties:'Консолидация отчётности 7 дочерних юрлиц.',achievements:'Автоматизировала закрытие периода и сократила кассовые разрывы на 31%.'}
    ],
    skills:['МСФО / IFRS','FP&A','Финансовое моделирование','Power BI','1C / ERP'],
    edu:['АГЭУ (UNEC)','Финансы и кредит','Магистр']
  }
}

const arrowUpRightSvg=()=>{
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg')
  svg.setAttribute('class','ui-icon')
  svg.setAttribute('viewBox','0 0 24 24')
  svg.setAttribute('aria-hidden','true')
  const path=document.createElementNS('http://www.w3.org/2000/svg','path')
  path.setAttribute('d','M7 17 17 7M7 7h10v10')
  svg.append(path)
  return svg
}

function renderBentoGallery(filter='all'){
  if(!gallery)return
  const keys=Object.keys(templates).filter(k=>filter==='all'||categories[k]?.cat===filter)
  const cards=keys.map(key=>{
    const persona=showcasePersonas[key]||showcasePersonas.classic
    const draft=makeCandidate(persona)
    const card=document.createElement('a')
    card.className='showcase-card editorial-card--interactive'
    card.href='/editor?view=example&template='+encodeURIComponent(key)
    card.dataset.productLink=''
    card.dataset.productView='example'
    card.dataset.productTemplate=key

    const stage=document.createElement('div')
    stage.className='showcase-stage'
    const wrap=document.createElement('div')
    wrap.className='showcase-paper-wrap'
    const paper=document.createElement('div')
    stage.inert=true
    renderResume(paper,{...draft,appearance:{...draft.appearance,template:key}},{photoUrl:persona.photo})
    wrap.append(paper)
    stage.append(wrap)

    const meta=document.createElement('div')
    meta.className='showcase-meta'
    const info=document.createElement('div')
    const tag=document.createElement('span')
    tag.className='mono'
    tag.textContent=(categories[key]?.tag||'A4 TEMPLATE')+' · '+persona.name.toUpperCase()
    const title=document.createElement('h3')
    title.textContent=templates[key]
    const desc=document.createElement('p')
    desc.textContent=templateDesigns[key]?.description||''
    info.append(tag,title,desc)

    const circle=document.createElement('span')
    circle.className='action-circle'
    circle.setAttribute('aria-hidden','true')
    circle.append(arrowUpRightSvg())

    meta.append(info,circle)
    card.append(stage,meta)
    return card
  })
  gallery.replaceChildren(...cards)
  updateLinks()
}

if(gallery){
  renderBentoGallery('all')
  if(filters){
    for(const btn of filters.querySelectorAll('button')){
      btn.addEventListener('click',()=>{
        const f=btn.dataset.tplFilter||'all'
        for(const b of filters.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b===btn))
        renderBentoGallery(f)
      })
    }
  }
}

const slot=document.querySelector('#landing-account')
const create=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n}
const link=(text,href,cls)=>{const a=create('a',text,cls);a.href=href;return a}
const darkCta=(text,href)=>{
  const a=create('a',null,'lp-dark-btn')
  a.href=href
  a.append(create('span',text),arrowUpRightSvg())
  return a
}

function renderAccount(){
  if(!slot)return
  slot.replaceChildren()
  if(!user){slot.append(link('Войти','/auth?mode=login','lp-login-link'),darkCta('Открыть редактор','/auth'));return}
  const menu=create('details',null,'profile-menu'),toggle=create('summary',null,'profile-toggle lp-profile-toggle')
  toggle.append(create('span',Array.from(user.name)[0]?.toUpperCase()||'Я','profile-avatar'),create('span',user.name,'profile-nickname'))
  const content=create('div',null,'profile-dropdown lp-profile-dropdown')
  content.append(create('p',user.email,'profile-email'),link('Моё резюме','/editor'),link('Настройки аккаунта','/settings'),link('Площадки для работы','/editor?view=jobs'))
  const logout=create('button','Выйти из аккаунта');logout.type='button'
  const status=create('p',null,'profile-error');status.setAttribute('role','status')
  logout.onclick=async()=>{
    logout.disabled=true
    try{const r=await fetch('/api/auth/logout',{method:'POST',headers:{'X-Account-Id':user.id}});if(!r.ok)throw Error();user=null;renderAccount();updateLinks()}catch{status.textContent='Не удалось выйти. Попробуйте ещё раз.';logout.disabled=false}
  }
  content.append(logout,status);menu.append(toggle,content);slot.append(menu,darkCta('В редактор','/editor'))
  menu.addEventListener('keydown',e=>{if(e.key==='Escape'){menu.open=false;toggle.focus()}})
}

function updateLinks(){
  for(const a of document.querySelectorAll('a[data-product-link]')){
    const view=['example','jobs'].includes(a.dataset.productView)?a.dataset.productView:''
    const tpl=a.dataset.productTemplate||''
    const params=new URLSearchParams()
    if(user){
      if(view)params.set('view',view)
      if(tpl)params.set('template',tpl)
      a.href='/editor'+(params.size?'?'+params.toString():'')
    }else{
      if(view)params.set('next',view)
      if(tpl)params.set('template',tpl)
      a.href='/auth'+(params.size?'?'+params.toString():'')
    }
  }
}

async function refreshAccount(){
  const version=++requestVersion
  try{
    const r=await fetch('/api/auth/me',{cache:'no-store'});if(!r.ok)throw Error()
    const value=await r.json();if(version!==requestVersion)return
    user=value.user;renderAccount();updateLinks()
  }catch{if(slot)slot.replaceChildren(link('Войти','/auth?mode=login','lp-login-link'))}
}

document.addEventListener('click',e=>{const menu=slot?.querySelector('details');if(menu&&!menu.contains(e.target))menu.open=false})
window.addEventListener('pageshow',refreshAccount)
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshAccount()})
refreshAccount()

/* Scroll Reveal */
const revealNodes=document.querySelectorAll('[data-reveal],[data-rule]')
if(typeof IntersectionObserver==='function'){
  const observer=new IntersectionObserver(entries=>{
    for(const entry of entries){
      if(!entry.isIntersecting)continue
      if(entry.target.hasAttribute('data-reveal'))entry.target.dataset.reveal='visible'
      if(entry.target.hasAttribute('data-rule'))entry.target.dataset.rule='visible'
      observer.unobserve(entry.target)
    }
  },{threshold:0.01,rootMargin:'0px 0px 180px 0px'})
  for(const node of revealNodes)observer.observe(node)
}else{
  for(const node of revealNodes){
    if(node.hasAttribute('data-reveal'))node.dataset.reveal='visible'
    if(node.hasAttribute('data-rule'))node.dataset.rule='visible'
  }
}
