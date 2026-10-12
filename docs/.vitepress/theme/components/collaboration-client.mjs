export const service=import.meta.env?.VITE_COLLABORATION_URL||''
const storageKey='nx-archive:collaboration-session'
export function sessionId(){try{return sessionStorage.getItem(storageKey)||''}catch{return ''}}
export function saveSession(id){try{if(id)sessionStorage.setItem(storageKey,id);else sessionStorage.removeItem(storageKey);return true}catch{return false}}
export async function call(path,body){if(!service)throw new Error('站内协作服务尚未启用。');const r=await fetch(service+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+sessionId(),...(body===undefined?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body)});const v=await r.json();if(!r.ok){const e=new Error(v.error||'请求失败。');e.status=r.status;e.current=v;throw e}return v}
