export const templates = {
  classic:'Классический',
  graphite:'Графит',
  editorial:'Редакционный',
  architect:'Архитектор',
  portfolio:'Портфолио',
  monolith:'Монолит',
  career:'Карьера',
  nordic:'Скандинавский',
  obsidian:'Обсидиан',
  atelier:'Ателье',
  swiss:'Швейцарский',
  emerald:'Изумруд'
}
export const templateDesigns={
  classic:{description:'Чистая типографика, имя по центру, тонкие линии',side:[],background:'#FFFFFF',ink:'#1C2229',accent:'#2D3E4E',sidebar:'#FFFFFF',sideInk:'#1C2229',header:'center'},
  graphite:{description:'Тёмная левая колонка, портрет и строгая сетка',side:['contacts','skills','education'],background:'#FFFFFF',ink:'#1E252D',accent:'#222B36',sidebar:'#222B36',sideInk:'#F4F6F9',header:'side',sidePosition:'left'},
  editorial:{description:'Кремовая бумага, крупное имя, колонка справа',side:['contacts','skills','education'],background:'#F7F1E8',ink:'#3D342B',accent:'#8C5835',sidebar:'#EAE0D2',sideInk:'#3D342B',header:'main',sidePosition:'right'},
  architect:{description:'Синий блок, модульные секции и геометрия',side:['contacts','skills'],background:'#FFFFFF',ink:'#1D2939',accent:'#24589C',sidebar:'#EAF0F8',sideInk:'#1A2D46',header:'banner',sidePosition:'left'},
  portfolio:{description:'Шалфейная колонка, большой портрет и мягкие формы',side:['contacts','skills','education'],background:'#FFFFFF',ink:'#253D32',accent:'#3E624F',sidebar:'#DCE8DE',sideInk:'#253D32',header:'side',sidePosition:'left'},
  monolith:{description:'Тёмный лист, лаймовый акцент, контрастный заголовок',side:['contacts','skills','education'],background:'#161A18',ink:'#EEF1EA',accent:'#C4E88D',sidebar:'#222925',sideInk:'#EEF1EA',header:'banner',sidePosition:'right'},
  career:{description:'Пудровая шапка, карьерная линия и боковые заметки',side:['contacts','skills','education'],background:'#FFFFFF',ink:'#3C2F35',accent:'#945369',sidebar:'#F5ECF0',sideInk:'#3C2F35',header:'banner',sidePosition:'right'},
  nordic:{description:'Холодный светлый тон, петрольный акцент и много воздуха',side:['contacts','skills','education'],background:'#F8F9FA',ink:'#1C2833',accent:'#0F4C5C',sidebar:'#E9EEF2',sideInk:'#1C2833',header:'main',sidePosition:'left'},
  obsidian:{description:'Глубокий тёмный лист с неоново-ледяной боковой колонкой',side:['contacts','skills','education'],background:'#121318',ink:'#E4E8F0',accent:'#6EA8FE',sidebar:'#1B1E26',sideInk:'#F0F2F6',header:'side',sidePosition:'right'},
  atelier:{description:'Тёплая галерейная шапка, антиква и бронзовый акцент',side:[],background:'#FCFAF6',ink:'#2A2521',accent:'#7A4928',sidebar:'#F3EDE3',sideInk:'#2A2521',header:'banner'},
  swiss:{description:'Швейцарская модульная сетка и яркий вермильоновый акцент',side:[],background:'#FFFFFF',ink:'#111111',accent:'#C93B2B',sidebar:'#F4F4F2',sideInk:'#111111',header:'main'},
  emerald:{description:'Строгая изумрудная боковая панель для руководителей',side:['contacts','skills','education'],background:'#FFFFFF',ink:'#162821',accent:'#185A43',sidebar:'#12382B',sideInk:'#F2F7F4',header:'side',sidePosition:'left'}
}
export const templateKey = id => Object.hasOwn(templates,id) ? id : id==='modern' ? 'architect' : 'classic'
export const templateAccent=(id,theme)=>id==='monolith'?({graphite:'#C4E88D',blue:'#A7C5FF',green:'#9EE3BA'}[theme]||'#C4E88D'):id==='obsidian'?({graphite:'#6EA8FE',blue:'#93C5FD',green:'#7CE7B8'}[theme]||'#6EA8FE'):theme==='graphite'?templateDesigns[id].accent:palettes[theme][1]
export const orderedSections = (sections,id) => {
  if(id==='portfolio'||id==='emerald')return ['contacts','summary','portfolio','experience','skills','education'].map(key=>sections.find(s=>s.key===key)).filter(Boolean)
  if(id==='career'||id==='swiss')return ['summary','experience','education','skills','contacts','portfolio'].map(key=>sections.find(s=>s.key===key)).filter(Boolean)
  return sections
}
export function exampleDraft() {
  const d=blank()
  const id=()=>crypto.randomUUID()
  return {
    ...d,
    isExample:true,
    fullName:'Тимур Рахимов',
    targetRole:'Senior Product Designer (UI/UX, дизайн-системы)',
    birthDate:'1998-05-14',
    showBirthDate:false,
    summary:'Проектирую веб-сервисы и мобильные приложения в финтехе и e-commerce более 5 лет. Специализируюсь на платёжных сценариях, B2B-кабинетах и масштабируемых дизайн-системах в Figma. Работаю на стыке продукта и разработки: от интервью и юзабилити-тестов до дизайн-токенов и приёмки в продакшене.',
    contacts:{
      email:'timur.rakhimov@tashkent.design',
      phone:'+998 90 418-27-64',
      profileUrl:'https://t.me/timur_rakhimov_ux',
      city:'Ташкент, Узбекистан (гибрид / удалённо)',
      portfolioUrls:[
        {id:id(),url:'https://rakhimov.design'},
        {id:id(),url:'https://rakhimov.design/samarqand-pay'},
        {id:id(),url:'https://rakhimov.design/qadam-b2b'},
        {id:id(),url:'https://rakhimov.design/atlas-ui'}
      ]
    },
    experience:[
      {
        id:id(),
        role:'Senior Product Designer',
        employer:'Samarqand Pay (финтех-платформа, Ташкент)',
        startMonth:'2024-03',
        endMonth:'',
        current:true,
        duties:'Проектирование ключевых сценариев мобильного приложения (iOS/Android) и веб-кабинета, развитие дизайн-системы, проведение регулярных юзабилити-тестов.',
        achievements:'Сократил сценарий переводов и оплаты коммунальных услуг с 6 до 3 шагов — конверсия в успешный платёж выросла с 74% до 86%. Собрал библиотеку на Figma Variables (140+ компонентов, светлая и тёмная темы), ускорив вёрстку новых экранов на 35%.'
      },
      {
        id:id(),
        role:'Product Designer',
        employer:'Qadam Market (маркетплейс и доставка, Ташкент)',
        startMonth:'2022-08',
        endMonth:'2024-02',
        current:false,
        duties:'UX/UI чекаута, трекинга заказов и кабинета партнёров; тесная работа с аналитиками и фронтендом.',
        achievements:'Пересобрал оформление заказа и карту трекинга — доля брошенных корзин снизилась на 19%. Запустил личный кабинет для 400+ локальных магазинов, сократив тикеты в поддержку по онбордингу на 28%.'
      },
      {
        id:id(),
        role:'UI/UX Designer',
        employer:'Forma Digital Studio (Ташкент)',
        startMonth:'2020-09',
        endMonth:'2022-07',
        current:false,
        duties:'Проектирование корпоративных сайтов, сервисов бронирования и аналитических дашбордов для клиентов из Узбекистана и Казахстана.',
        achievements:'Сдал 14 коммерческих проектов в срок; перевёл команду на единый стандарт спецификаций в Figma, вдвое сократив число визуальных правок на этапе QA.'
      }
    ],
    skills:[
      'Figma (Variables, Auto Layout)',
      'Дизайн-системы',
      'UX-исследования',
      'Юзабилити-тестирование',
      'Прототипирование',
      'CJM / JTBD',
      'iOS HIG & Material Design',
      'HTML / CSS',
      'Amplitude',
      'Дизайн-ревью',
      'Узбекский — родной',
      'Русский — свободно',
      'Английский — B2'
    ].map(label=>({id:id(),label})),
    hasHigherEducation:true,
    education:[
      {
        id:id(),
        kind:'higher',
        institution:'Университет Инха в Ташкенте (IUT)',
        program:'Computer and Information Engineering',
        degree:'Бакалавр',
        startMonth:'2016-09',
        endMonth:'2020-06',
        status:'completed'
      },
      {
        id:id(),
        kind:'general',
        institution:'Продуктовый курс',
        program:'Интенсив «Дизайн-системы и токены»',
        degree:'',
        startMonth:'2023-03',
        endMonth:'2023-06',
        status:'completed'
      }
    ]
  }
}
export const palettes = {graphite:['Графитовая','#374151'],blue:['Синяя','#1D4ED8'],green:['Зелёная','#166534']}
export const layouts = {desktop:'ПК и печать',mobile:'Телефон'}
export const statuses = {completed:'Завершено',ongoing:'Продолжается',incomplete:'Прервано'}
export const limits = {experience:30,education:30,skills:50,portfolioUrls:5}
export const blank = () => ({schemaVersion:1,revision:0,photo:null,fullName:'',targetRole:'',birthDate:'',showBirthDate:false,summary:'',skills:[],experience:[],education:[],hasHigherEducation:false,contacts:{email:'',phone:'',profileUrl:'',city:'',portfolioUrls:[]},appearance:{template:'classic',theme:'graphite',layout:'desktop'}})
export const clean = value => typeof value === 'string' ? value.trim() : ''
export const filled = (row,keys) => keys.some(key => clean(row[key]))
export const expKeys = ['role','employer','startMonth','endMonth','duties','achievements']
export const eduKeys = ['institution','program','degree','startMonth','endMonth']
export const monthText = s => /^\d{4}-\d{2}$/.test(s) ? s.slice(5) + '.' + s.slice(0,4) : ''
export const birthText = s => /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.split('-').reverse().join('.') : ''
export const phoneValue = s => clean(s).replace(/[\s()-]/g,'')
export function httpUrl(s) {
  try { const u = new URL(clean(s)); return ['http:','https:'].includes(u.protocol) && u.hostname && !u.username && !u.password ? u.href : '' } catch { return '' }
}
const emailValid = s => /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/u.test(s)
const monthValid = s => /^\d{4}-(0[1-9]|1[0-2])$/.test(s) && !s.startsWith('0000')
export function localDate() {
  const d = new Date()
  return [d.getFullYear(),d.getMonth()+1,d.getDate()].map(i=>String(i).padStart(2,'0')).join('-')
}
export function validate(d) {
  const errors = {}
  if (!clean(d.fullName)) errors.fullName='Укажите имя и фамилию.'
  else if (!/^[\p{Script=Latin}\p{Script=Cyrillic}][\p{Script=Latin}\p{Script=Cyrillic}\p{M} ’'\-]*$/u.test(clean(d.fullName))) errors.fullName='Используйте буквы, пробелы, дефисы или апострофы.'
  if (!clean(d.targetRole)) errors.targetRole='Укажите желаемую должность.'
  if(d.birthDate) {
    const dt = new Date(d.birthDate + 'T00:00:00Z')
    if (!birthText(d.birthDate) || !Number.isFinite(+dt) || dt.toISOString().slice(0,10)!==d.birthDate || d.birthDate>localDate() || d.birthDate.startsWith('0000')) errors.birthDate='Укажите действительную дату рождения.'
  }
  const {email, phone, profileUrl, portfolioUrls} = d.contacts
  if (clean(email) && !emailValid(clean(email))) errors['contacts.email']='Проверьте адрес email.'
  if (clean(phone) && !/^\+?\d{7,15}$/.test(phoneValue(phone))) errors['contacts.phone']='Введите телефон с 7–15 цифрами.'
  if (clean(profileUrl) && !httpUrl(profileUrl)) errors['contacts.profileUrl']='Введите ссылку с http:// или https://.'
  if (![email,phone,profileUrl].some(clean)) errors['contacts.email']='Укажите хотя бы один способ связи.'
  for (const r of portfolioUrls) if (clean(r.url) && !httpUrl(r.url)) errors['portfolioUrls.'+r.id+'.url']='Введите ссылку с http:// или https://.'
  for (const r of d.experience) if (filled(r,expKeys)) {
    const k='experience.'+r.id+'.'
    if (!clean(r.role)) errors[k+'role']='Укажите должность.'
    if (!clean(r.employer)) errors[k+'employer']='Укажите компанию.'
    if (!monthValid(r.startMonth)) errors[k+'startMonth']='Укажите месяц начала.'
    if (!r.current && !monthValid(r.endMonth)) errors[k+'endMonth']='Укажите месяц окончания.'
    else if (!r.current && r.endMonth && r.endMonth<r.startMonth) errors[k+'endMonth']='Окончание должно быть позже начала или совпадать с ним.'
  }
  for (const r of d.education) if ((r.kind==='general'||d.hasHigherEducation) && filled(r,eduKeys)) {
    const k='education.'+r.id+'.'
    if (!clean(r.institution)) errors[k+'institution']='Укажите учебное заведение.'
    if (!clean(r.program)) errors[k+'program']='Укажите программу или специальность.'
    if (!monthValid(r.startMonth)) errors[k+'startMonth']='Укажите месяц начала.'
    if ((r.status!=='ongoing'||r.endMonth) && !monthValid(r.endMonth)) errors[k+'endMonth']='Укажите месяц окончания.'
    else if (r.endMonth && r.endMonth<r.startMonth) errors[k+'endMonth']='Окончание должно быть позже начала или совпадать с ним.'
  }
  return errors
}
export function aiInput(d) {
  const take=(r,keys)=>Object.fromEntries(keys.map(k=>[k,clean(r[k])]))
  return {
    targetRole:clean(d.targetRole),skills:d.skills.map(x=>clean(x.label)).filter(Boolean),
    experience:d.experience.filter(r=>filled(r,expKeys)).map(r=>({...take(r,['id',...expKeys]),endMonth:r.current||!r.endMonth?null:r.endMonth,current:r.current})),
    education:d.education.filter(r=>(r.kind==='general'||d.hasHigherEducation)&&filled(r,eduKeys)).map(r=>({...take(r,['id','kind','status',...eduKeys]),endMonth:r.endMonth||null}))
  }
}
const line = (value,kind='text',url='') => ({text:clean(value),kind,url})
const section = (key,title,entries) => ({key,title,entries:entries.map(e=>e.filter(x=>x.text)).filter(e=>e.length)})
const join = (...parts) => parts.map(clean).filter(Boolean).join(' · ')
const period = (a,b) => [monthText(a),b].filter(Boolean).join(' — ')
export function resumeView(d) {
  const c=d.contacts
  const contacts = [line(c.email,'text',emailValid(clean(c.email))?'mailto:'+clean(c.email):''),line(c.phone,'text',/^\+?\d{7,15}$/.test(phoneValue(c.phone))?'tel:'+phoneValue(c.phone):''),line(c.profileUrl,'text',httpUrl(c.profileUrl)),line(c.city)]
  return {
    name:clean(d.fullName),role:clean(d.targetRole),birthDate:d.showBirthDate?birthText(d.birthDate):'',
    sections:[
      section('contacts','Контакты',[contacts]),
      section('summary','О себе',[[line(d.summary)]]),
      section('portfolio','Портфолио',[c.portfolioUrls.map(r=>line(r.url,'text',httpUrl(r.url)))]),
      section('experience','Опыт работы',d.experience.filter(r=>filled(r,expKeys)).map(r=>[line(join(r.role,r.employer),'strong'),line(period(r.startMonth,r.current?'По настоящее время':monthText(r.endMonth)),'meta'),line(r.duties),line(r.achievements)])),
      section('skills','Навыки',[[line(d.skills.map(r=>clean(r.label)).filter(Boolean).join(' · '))]]),
      section('education','Образование',d.education.filter(r=>(r.kind==='general'||d.hasHigherEducation)&&filled(r,eduKeys)).map(r=>[line(r.institution,'strong'),line(join(r.program,r.kind==='higher'?r.degree:'')),line(join(period(r.startMonth,monthText(r.endMonth)),statuses[r.status]),'meta')]))
    ].filter(s=>s.entries.length)
  }
}
export const isSidebar = s => ['contacts','skills'].includes(s.key)
