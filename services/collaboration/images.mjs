export const MAX_REQUEST_BYTES=8*1024*1024
const MAX_IMAGE_BYTES=5*1024*1024
const invalid=message=>Object.assign(new Error(message),{status:400})
export async function boundedText(request){
 if(Number(request.headers.get('Content-Length'))>MAX_REQUEST_BYTES)throw Object.assign(new Error('保存请求超过 8 MB，请缩小图片或分拆文档。'),{status:413})
 if(!request.body)return ''
 const reader=request.body.getReader(),decoder=new TextDecoder();let bytes=0,text=''
 for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>MAX_REQUEST_BYTES){await reader.cancel();throw Object.assign(new Error('保存请求超过 8 MB，请缩小图片或分拆文档。'),{status:413})}text+=decoder.decode(value,{stream:true})}
 return text+decoder.decode()
}
export function extractImages(content,game){
 const assets=[],seen=new Map()
 const rewritten=content.replace(/data:image\/(png|jpe?g|gif|webp);base64,([A-Za-z0-9+/=]+)/gi,(uri,kind,data)=>{
  if(seen.has(uri))return seen.get(uri)
  if(assets.length>=10)throw invalid('每次保存最多包含 10 张内嵌图片。')
  let bytes;try{bytes=atob(data)}catch{throw invalid('图片编码无效。')}
  if(bytes.length>MAX_IMAGE_BYTES)throw invalid('单张图片超过 5 MB，请缩小后再保存。')
  kind=kind.toLowerCase();const ext=kind==='jpeg'?'jpg':kind
  const valid=ext==='png'?bytes.startsWith('\x89PNG\r\n\x1a\n'):ext==='jpg'?bytes.startsWith('\xff\xd8\xff'):ext==='gif'?/^GIF8[79]a/.test(bytes):bytes.startsWith('RIFF')&&bytes.slice(8,12)==='WEBP'
  if(!valid)throw invalid('图片格式与内容不一致。')
  const name=crypto.randomUUID()+'.'+ext,path='docs/public/wiki-assets/'+game+'/'+name,url='/nx-archive/wiki-assets/'+game+'/'+name
  assets.push({path,data});seen.set(uri,url);return url
 })
 if(/data:image\//i.test(rewritten))throw invalid('内嵌图片仅支持 PNG、JPEG、GIF 和 WebP；请勿嵌入 SVG。')
 return {content:rewritten,assets}
}
