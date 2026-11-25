import {orderedSections,templateKey,templateDesigns,templateAccent} from './model.js'
const ascii = new TextEncoder()
const pt = mm => mm*72/25.4
const num = n => Number(n.toFixed(3))
const hex = (n,length=4) => n.toString(16).padStart(length,'0')
const color = h => [1,3,5].map(i=>num(parseInt(h.slice(i,i+2),16)/255)).join(' ')
const utf16 = c => Array.from({length:c.length},(_,i)=>hex(c.charCodeAt(i))).join('')
const bytes = s => ascii.encode(s)
const join = chunks => {
  const result=new Uint8Array(chunks.reduce((n,c)=>n+c.length,0))
  let offset=0
  for (const chunk of chunks) {result.set(chunk,offset);offset+=chunk.length}
  return result
}

function readFont(buffer) {
  const v=new DataView(buffer)
  const u16=o=>v.getUint16(o), i16=o=>v.getInt16(o), u32=o=>v.getUint32(o)
  const table={}
  for(let i=0;i<u16(4);i++){
    const pos=12+i*16
    const tag=String.fromCharCode(...new Uint8Array(buffer,pos,4))
    table[tag]=u32(pos+8)
  }
  for (const t of ['head','hhea','hmtx','cmap']) if (!table[t]) throw new Error('Invalid TTF font')
  const head=table.head, hhea=table.hhea, cmap=table.cmap
  const unit=u16(head+18), scaled=n=>Math.round(n*1000/unit), metrics=u16(hhea+34)
  let map4,map12
  for(let i=0;i<u16(cmap+2);i++){
    const record=cmap+4+i*8
    const platform=u16(record), sub=cmap+u32(record+4), format=u16(sub)
    if(platform!==0&&platform!==3)continue
    if(format===12)map12=sub
    if(format===4)map4=sub
  }
  if(!map12&&!map4)throw new Error('Missing Unicode cmap')
  function glyph(cp) {
    if(map12){
      let low=0,high=u32(map12+12)-1
      while(low<=high){
        const mid=(low+high)>>1, pos=map12+16+mid*12
        const start=u32(pos), end=u32(pos+4)
        if(cp<start)high=mid-1
        else if(cp>end)low=mid+1
        else return u32(pos+8)+cp-start
      }
    }
    if(!map4||cp>65535)return 0
    const size=u16(map4+6)/2, end=map4+14, start=end+size*2+2, delta=start+size*2, offset=delta+size*2
    for(let i=0;i<size;i++)if(cp<=u16(end+i*2)){
      if(cp<u16(start+i*2))return 0
      const shift=i16(delta+i*2), pointer=offset+i*2, range=u16(pointer)
      if(!range)return (cp+shift)&65535
      const g=u16(pointer+range+(cp-u16(start+i*2))*2)
      return g?(g+shift)&65535:0
    }
    return 0
  }
  const glyphWidth=g=>scaled(u16(table.hmtx+Math.min(g,metrics-1)*4))
  return {glyph,glyphWidth,bbox:[36,38,40,42].map(o=>scaled(i16(head+o))),ascent:scaled(i16(hhea+4)),descent:scaled(i16(hhea+6))}
}

function writer() {
  const objects=[null]
  const reserve=()=>objects.push(null)-1
  const set=(id,value)=>{objects[id]=typeof value==='string'?bytes(value):value;return id}
  const add=value=>set(reserve(),value)
  const stream=(data,attrs='')=>join([bytes('<< '+attrs+' /Length '+data.length+' >>\nstream\n'),data,bytes('\nendstream')])
  function emit(root) {
    const chunks=[bytes('%PDF-1.7\n'),new Uint8Array([37,226,227,207,211,10])]
    const offsets=[0]
    let size=chunks[0].length+chunks[1].length
    for(let i=1;i<objects.length;i++){
      offsets.push(size)
      const parts=[bytes(i+' 0 obj\n'),objects[i],bytes('\nendobj\n')]
      chunks.push(...parts)
      size+=parts.reduce((n,c)=>n+c.length,0)
    }
    const xref='xref\n0 '+offsets.length+'\n0000000000 65535 f \n'+offsets.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')
    chunks.push(bytes(xref+'trailer\n<< /Size '+offsets.length+' /Root '+root+' 0 R >>\nstartxref\n'+size+'\n%%EOF\n'))
    return join(chunks)
  }
  return {reserve,set,add,stream,emit}
}

export function buildPdf(view,appearance,fontBytes,photo) {
  const font=readFont(fontBytes), pdf=writer(), root=pdf.reserve(), pageTree=pdf.reserve(), textFont=pdf.reserve()
  const template=templateKey(appearance.template), mobile=appearance.layout==='mobile'
  const dark=(template==='monolith'||template==='obsidian')&&!appearance.printLight
  const design={...templateDesigns[template]}
  if((template==='monolith'||template==='obsidian')&&appearance.printLight)Object.assign(design,{background:'#FFFFFF',ink:'#25313D',sidebar:'#EAF0E8',sideInk:'#25313D',accent:'#476755'})
  const editorial=template==='editorial'||template==='atelier', career=template==='career'||template==='swiss'
  const W=pt(mobile?105:210), H=pt(mobile?186:297), M=pt(mobile?8:14)
  const body=mobile?10:9.4, accent=(template==='monolith'||template==='obsidian')&&appearance.printLight?design.accent:templateAccent(template,appearance.theme)
  const primary=design.ink, muted=dark?'#C6CED0':'#5D6265'
  const background=design.background
  const rectangle=(x,y,w,h,tint)=>color(tint)+' rg '+[x,H-y-h,w,h].map(num).join(' ')+' re f'
  const used=new Map(), pages=[]
  let page
  function newPage(){
    page={commands:[],annotations:[],cursor:M}
    if(background)page.commands.push(rectangle(0,0,W,H,background))
    pages.push(page)
  }
  const charData=c=>{
    if(!used.has(c)){
      const glyph=font.glyph(c.codePointAt(0))
      used.set(c,{cid:used.size+1,glyph,width:font.glyphWidth(glyph)})
    }
    return used.get(c)
  }
  const width=(s,size)=>Array.from(s).reduce((w,c)=>w+charData(c).width,0)*size/1000
  const wrap=(text,size,limit)=>text.replace(/\r/g,'').split('\n').flatMap(paragraph=>{
    let line=''
    const result=[]
    for(const word of paragraph.trim().split(/\s+/u)){
      const next=line?line+' '+word:word
      if(width(next,size)<=limit){line=next;continue}
      if(line)result.push(line)
      line=''
      for(const c of word){
        if(line&&width(line+c,size)>limit){result.push(line);line=''}
        line+=c
      }
    }
    result.push(line)
    return result
  })
  function draw(s,x,y,size,tint,url='',bold=false){
    if(!s)return
    const encoded=Array.from(s,c=>hex(charData(c).cid)).join('')
    const c=color(tint)
    page.commands.push('BT /F1 '+size+' Tf '+c+' rg '+(bold?c+' RG 0.26 w 2 Tr ':'0 Tr ')+'1 0 0 1 '+num(x)+' '+num(H-y-size)+' Tm <'+encoded+'> Tj ET')
    if(url)page.annotations.push({rect:[x,H-y-size-2,x+width(s,size),H-y+2],url})
  }
  function paragraph(s,x,w,size,tint,leading,url='',bold=false){
    for(const row of wrap(s,size,w)){
      if(page.cursor+leading>H-M)newPage()
      draw(row,x,page.cursor,size,tint,url,bold)
      page.cursor+=leading
    }
  }
  let image
  newPage()
  if(photo)image=pdf.add(pdf.stream(photo.data,'/Type /XObject /Subtype /Image /Width '+photo.width+' /Height '+photo.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode'))
  function photoAt(x,y,size,round=false){
    if(!image)return
    let clip=''
    if(round){const cx=x+size/2,cy=H-y-size/2,r=size/2,k=r*.5522848;clip=[cx+r,cy,'m',cx+r,cy+k,cx+k,cy+r,cx,cy+r,'c',cx-k,cy+r,cx-r,cy+k,cx-r,cy,'c',cx-r,cy-k,cx-k,cy-r,cx,cy-r,'c',cx+k,cy-r,cx+r,cy-k,cx+r,cy,'c W n'].map(v=>typeof v==='number'?num(v):v).join(' ')+' '}
    page.commands.push('q '+clip+size+' 0 0 '+size+' '+num(x)+' '+num(H-y-size)+' cm /Photo Do Q')
  }
  function identity(x,w,{stack=false,center=false,ink=primary,titleInk=accent}={}){
    const start=page.cursor,photoSize=editorial?W*.27:stack?w*.88:(mobile?50:90)
    if(photo&&!editorial){photoAt(center?x+(w-photoSize)/2:stack?x:x+w-photoSize,start,photoSize,center||career);if(stack||center)page.cursor+=photoSize+18}
    const textWidth=photo&&!stack&&!center?w-photoSize-18:w
    const nameSize=mobile?(stack?19:22):stack?25:editorial?37:template==='monolith'?34:30
    for(const row of wrap(view.name,nameSize,textWidth)){
      if(page.cursor+nameSize*1.2>H-M)newPage()
      draw(row,center?x+(w-width(row,nameSize))/2:x,page.cursor,nameSize,titleInk,'',!editorial);page.cursor+=nameSize*1.2
    }
    page.cursor+=7
    for(const row of wrap(view.role,body+1,textWidth)){draw(row,center?x+(w-width(row,body+1))/2:x,page.cursor,body+1,ink);page.cursor+=(body+1)*1.4}
    if(view.birthDate)paragraph(view.birthDate,x,textWidth,body,ink,body*1.35)
    if(photo&&editorial){page.cursor+=14;photoAt(x,page.cursor,photoSize);page.cursor+=photoSize+8}
    if(photo&&!stack&&!center)page.cursor=Math.max(page.cursor,start+photoSize)
    page.cursor+=22
  }
  function sections(items,x,w,ink=primary,headingInk=accent,meta=muted) {
    for(const section of items){
      const needed=(body+1)*1.45+body*1.4
      if(page.cursor+needed>H-M)newPage()
      paragraph(section.title,x,w,body+1,headingInk,(body+1)*1.45,'',true)
      if(!career)page.commands.push(rectangle(x,page.cursor+2,w,.5,headingInk))
      page.cursor+=8
      const timeline=career&&['experience','education'].includes(section.key)
      for(const entry of section.entries){
        if(timeline){
          if(page.cursor+body*1.38>H-M)newPage()
          page.commands.push(rectangle(x,page.cursor,2,body*1.35,accent))
        }
        const offset=timeline?8:0
        for(const line of entry){const size=section.key==='contacts'?body*.9:body;paragraph(line.text,x+offset,w-offset,size,line.kind==='meta'?meta:ink,size*1.42,line.url,line.kind==='strong')}
        page.cursor+=5
      }
      page.cursor+=editorial?16:10
    }
  }
  const ordered=orderedSections(view.sections,template)
  const side=ordered.filter(s=>design.side.includes(s.key)), main=ordered.filter(s=>!design.side.includes(s.key))
  let start=M
  if(['banner','center'].includes(design.header)){
    const banner=template==='architect'?accent:template==='career'?'#EEDCE2':template==='atelier'?design.sidebar:background
    identity(M,W-2*M,{center:design.header==='center',ink:template==='architect'?'#FFFFFF':primary,titleInk:template==='architect'?'#FFFFFF':career?primary:accent})
    start=page.cursor
    if(design.header==='banner')page.commands.splice(1,0,rectangle(0,0,W,start-8,banner))
  }else if(!design.side.length){
    identity(M,W-2*M,{center:false,ink:primary,titleInk:accent})
  }
  if(design.side.length){
    const sideW=W*(template==='portfolio'||template==='emerald'?.36:template==='architect'?.30:.33),right=design.sidePosition==='right'
    const sideX=right?W-sideW+M*.65:M*.65, sideWidth=sideW-M*1.3
    const mainX=right?M:sideW+M*.75,mainWidth=W-sideW-M*1.75
    const cover=page;page.cursor=start+(design.header==='side'?8:12)
    if(design.header==='side')identity(sideX,sideWidth,{stack:true,ink:design.sideInk,titleInk:design.sideInk})
    sections(side,sideX,sideWidth,design.sideInk,design.sideInk,design.sideInk)
    const sidebarPages=pages.splice(1)
    page=cover;page.cursor=start+(design.header==='main'||design.header==='side'?8:12)
    if(design.header==='main')identity(mainX,mainWidth,{stack:true})
    sections(main,mainX,mainWidth)
    sidebarPages.forEach((sidePage,i)=>{const j=i+1;if(!pages[j])pages.push(sidePage);else{pages[j].commands.push(...sidePage.commands);pages[j].annotations.push(...sidePage.annotations)}})
    pages.forEach((p,i)=>{const top=i===0&&design.header==='banner'?start:0;p.commands.splice(1,0,rectangle(right?W-sideW:0,top,sideW,H-top,design.sidebar))})
  }else sections(ordered,M,W-M*2)
  const embedded=pdf.add(pdf.stream(new Uint8Array(fontBytes),'/Length1 '+fontBytes.byteLength))
  const descriptor=pdf.add('<< /Type /FontDescriptor /FontName /ResumeSans /Flags 32 /FontBBox ['+font.bbox.join(' ')+'] /ItalicAngle 0 /Ascent '+font.ascent+' /Descent '+font.descent+' /CapHeight '+font.ascent+' /StemV 80 /FontFile2 '+embedded+' 0 R >>')
  const glyphs=new Uint8Array((used.size+1)*2), gv=new DataView(glyphs.buffer)
  const widths=[], entries=[]
  for(const [char,data] of used){
    gv.setUint16(data.cid*2,data.glyph)
    widths.push(data.width)
    entries.push('<'+hex(data.cid)+'> <'+utf16(char)+'>')
  }
  const cidMap=pdf.add(pdf.stream(glyphs))
  const descendant=pdf.add('<< /Type /Font /Subtype /CIDFontType2 /BaseFont /ResumeSans /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor '+descriptor+' 0 R /CIDToGIDMap '+cidMap+' 0 R /W [1 ['+widths.join(' ')+']] >>')
  let cmap='/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /ResumeUnicode def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <ffff>\nendcodespacerange\n'
  for(let i=0;i<entries.length;i+=100){
    const group=entries.slice(i,i+100)
    cmap+=group.length+' beginbfchar\n'+group.join('\n')+'\nendbfchar\n'
  }
  cmap+='endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend'
  const unicode=pdf.add(pdf.stream(bytes(cmap)))
  pdf.set(textFont,'<< /Type /Font /Subtype /Type0 /BaseFont /ResumeSans /Encoding /Identity-H /DescendantFonts ['+descendant+' 0 R] /ToUnicode '+unicode+' 0 R >>')
  const pageIds=pages.map(p=>{
    const content=pdf.add(pdf.stream(bytes(p.commands.join('\n'))))
    const annotations=p.annotations.map(a=>{
      const uri=Array.from(bytes(a.url),i=>hex(i,2)).join('')
      return pdf.add('<< /Type /Annot /Subtype /Link /Rect ['+a.rect.map(num).join(' ')+'] /Border [0 0 0] /A << /S /URI /URI <'+uri+'> >> >>')+' 0 R'
    })
    return pdf.add('<< /Type /Page /Parent '+pageTree+' 0 R /MediaBox [0 0 '+num(W)+' '+num(H)+'] /Resources << /Font << /F1 '+textFont+' 0 R >>'+(image?' /XObject << /Photo '+image+' 0 R >>':'')+' >> /Contents '+content+' 0 R /Annots ['+annotations.join(' ')+'] >>')
  })
  pdf.set(pageTree,'<< /Type /Pages /Count '+pageIds.length+' /Kids ['+pageIds.map(i=>i+' 0 R').join(' ')+'] >>')
  pdf.set(root,'<< /Type /Catalog /Pages '+pageTree+' 0 R >>')
  return pdf.emit(root)
}
