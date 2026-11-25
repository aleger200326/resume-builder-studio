import {serve} from '../server.mjs'

export default async function handler(req,res){
  return serve(req,res)
}
