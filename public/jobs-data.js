// Direct public job-search links. No resume, contacts or API keys are sent in URLs.
export const jobRegions={all:'Все площадки',uz:'Узбекистан',ru:'Россия',world:'Зарубежные',remote:'Удалённая работа'}
export const jobBoards=[
  {name:'hh.uz',url:'https://hh.uz/search/vacancy',icon:'hh',color:'#D9363E',region:'uz',description:'Вакансии и резюме в Узбекистане',tags:['Все профессии']},
  {name:'hh.ru',url:'https://hh.ru/search/vacancy',icon:'hh',color:'#D9363E',region:'ru',description:'Поиск вакансий по профессии, городу и опыту',tags:['Все профессии']},
  {name:'SuperJob',url:'https://www.superjob.ru/',icon:'SJ',color:'#13875B',region:'ru',description:'Вакансии компаний и поиск по городам',tags:['Все профессии']},
  {name:'Работа.ру',url:'https://www.rabota.ru/',icon:'Р',color:'#2374C8',region:'ru',description:'Работа в России и предложения рядом с домом',tags:['Все профессии']},
  {name:'Зарплата.ру',url:'https://zarplata.ru/',icon:'З',color:'#946400',region:'ru',description:'Вакансии в городах России',tags:['Все профессии']},
  {name:'Хабр Карьера',url:'https://career.habr.com/vacancies',icon:'Х',color:'#526A78',region:'ru',description:'Работа для специалистов в IT',tags:['IT','Digital']},
  {name:'getmatch',url:'https://getmatch.ru/',icon:'gm',color:'#6452C7',region:'ru',description:'IT-вакансии и карьерные подборки',tags:['IT','Digital']},
  {name:'GeekJob',url:'https://geekjob.ru/',icon:'GJ',color:'#33353E',region:'ru',description:'IT, дизайн, маркетинг и digital',tags:['IT','Digital']},
  {name:'Авито Работа',url:'https://www.avito.ru/rossiya/vakansii',icon:'А',color:'#6755B9',region:'ru',description:'Вакансии и подработка по регионам России',tags:['Все профессии']},
  {name:'Работа России',url:'https://trudvsem.ru/',icon:'РР',color:'#245B92',region:'ru',description:'Государственный портал вакансий',tags:['Все профессии']},
  {name:'Ishkop',url:'https://ishkop.uz/',icon:'ik',color:'#157965',region:'uz',description:'Поиск работы в Ташкенте и других городах',tags:['Все профессии']},
  {name:'OLX Работа',url:'https://www.olx.uz/rabota/',icon:'olx',color:'#166266',region:'uz',description:'Вакансии и предложения работы в Узбекистане',tags:['Все профессии']},
  {name:'LinkedIn Jobs',url:'https://www.linkedin.com/jobs/',icon:'in',color:'#0A66C2',region:'world',description:'Вакансии компаний и профессиональная сеть',tags:['Международные']},
  {name:'Indeed',url:'https://www.indeed.com/',icon:'i',color:'#2557A7',region:'world',description:'Международный поиск работы по должности и городу',tags:['Все профессии']},
  {name:'Glassdoor',url:'https://www.glassdoor.com/Job/index.htm',icon:'g',color:'#087B4F',region:'world',description:'Вакансии, отзывы о компаниях и зарплаты',tags:['Международные']},
  {name:'Wellfound',url:'https://wellfound.com/jobs',icon:'W',color:'#913D42',region:'world',description:'Работа в стартапах и технологических компаниях',tags:['Стартапы','IT']},
  {name:'Remote OK',url:'https://remoteok.com/',icon:'R',color:'#BC3F37',region:'remote',description:'Удалённые вакансии в разных специализациях',tags:['Удалённо']},
  {name:'We Work Remotely',url:'https://weworkremotely.com/',icon:'ww',color:'#B74436',region:'remote',description:'Удалённая работа в разработке, дизайне и поддержке',tags:['Удалённо','Digital']},
  {name:'Remotive',url:'https://remotive.com/',icon:'re',color:'#865928',region:'remote',description:'Удалённые роли с фильтрами по стране и направлению',tags:['Удалённо','Есть платные функции']},
  {name:'Working Nomads',url:'https://www.workingnomads.com/jobs',icon:'wn',color:'#446B96',region:'remote',description:'Подборки удалённых вакансий',tags:['Удалённо','Есть платные функции']},
  {name:'Jobspresso',url:'https://jobspresso.co/',icon:'J',color:'#9E422E',region:'remote',description:'Удалённые вакансии в IT, маркетинге и дизайне',tags:['Удалённо']},
  {name:'FlexJobs',url:'https://www.flexjobs.com/',icon:'F',color:'#215D9A',region:'remote',description:'Удалённая и гибридная работа с гибким графиком',tags:['Удалённо','Платные функции']},
  {name:'Built In',url:'https://builtin.com/jobs',icon:'bi',color:'#356AC2',region:'world',description:'Технологические компании и профессиональные роли',tags:['IT','США']},
  {name:'Dice',url:'https://www.dice.com/',icon:'D',color:'#AC2936',region:'world',description:'Работа в технологиях и IT',tags:['IT','США']},
  {name:'The Muse',url:'https://www.themuse.com/search',icon:'M',color:'#287A78',region:'world',description:'Поиск работы и знакомство с компаниями',tags:['Международные']},
  {name:'ZipRecruiter',url:'https://www.ziprecruiter.com/',icon:'Z',color:'#38653E',region:'world',description:'Вакансии компаний и подбор предложений',tags:['Все профессии','США']},
  {name:'Reed',url:'https://www.reed.co.uk/jobs',icon:'r',color:'#913A91',region:'world',description:'Вакансии в Великобритании',tags:['Великобритания']},
  {name:'Totaljobs',url:'https://www.totaljobs.com/jobs',icon:'tj',color:'#286AA0',region:'world',description:'Поиск работы по направлениям и городам',tags:['Великобритания']},
  {name:'CV-Library',url:'https://www.cv-library.co.uk/',icon:'CV',color:'#365C87',region:'world',description:'Поиск вакансий и база резюме',tags:['Великобритания']},
  {name:'Jobstreet',url:'https://www.jobstreet.com/',icon:'js',color:'#6F3368',region:'world',description:'Региональные площадки для поиска работы в Азии',tags:['Азия']}
]
export function filterBoards(query='',region='all'){
  const q=query.trim().toLocaleLowerCase()
  return jobBoards.filter(b=>(region==='all'||b.region===region)&&(!q||[b.name,new URL(b.url).hostname,b.description,jobRegions[b.region],...b.tags].join(' ').toLocaleLowerCase().includes(q)))
}
