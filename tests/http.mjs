import {Readable,Writable} from 'node:stream'
import {once} from 'node:events'

// Exercise the actual HTTP handler without a listening socket.
export async function dispatch(serve,path,{method='GET',body,cookie='',headers={},raw}={}){
  const text=raw??(body===undefined?'':JSON.stringify(body))
  const req=Readable.from(text?[Buffer.from(text)]:[])
  Object.assign(req,{url:path,method,socket:{remoteAddress:'127.0.0.1'},headers:{host:'localhost:4173',cookie,...(text?{'content-type':'application/json','content-length':String(Buffer.byteLength(text))}:{}),...headers}})
  const chunks=[]
  const res=new Writable({write(chunk,encoding,callback){chunks.push(Buffer.from(chunk));callback()}})
  res.headers={};res.statusCode=200
  res.setHeader=(key,value)=>{res.headers[key.toLowerCase()]=value}
  res.writeHead=(code,values)=>{res.statusCode=code;for(const [k,v] of Object.entries(values||{}))res.setHeader(k,v);res.headersSent=true}
  const finished=once(res,'finish')
  await serve(req,res)
  await finished
  const bytes=Buffer.concat(chunks)
  return {status:res.statusCode,headers:res.headers,bytes,text:bytes.toString(),json:()=>JSON.parse(bytes.toString()),cookie:res.headers['set-cookie']?.split(';')[0]}
}
