// 重试：确认 Wikipedia/gnu/k8s 是否稳定不可达；同时对 grpc/openapi 找替补
import fs from 'node:fs';
import path from 'node:path';
const OUT = 'C:/Users/13057/.workbuddy/binaries/node/versions/22.22.2/tmp/backend-v2-batch';
function cleanHtml(html){let h=html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<noscript[\s\S]*?<\/noscript>/gi,' ').replace(/<svg[\s\S]*?<\/svg>/gi,' ').replace(/<!--[\s\S]*?-->/g,' ');let b='';const m=h.match(/<main[\s\S]*?<\/main>/i)||h.match(/<article[\s\S]*?<\/article>/i)||h.match(/<body[\s\S]*?<\/body>/i);if(m)b=m[0];else b=h;b=b.replace(/<h([1-6])[^>]*>/gi,'\n## ').replace(/<\/(p|div|section|li|h[1-6]|tr|br|article|main|ul|ol)>/gi,'\n').replace(/<[^>]+>/g,' ');b=b.replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#39;|&apos;/g,"'").replace(/&quot;/g,'"');return b.replace(/[ \t]+/g,' ').replace(/\n\s*\n+/g,'\n').trim();}
async function one(url,name,attempt=1,timeout=18000){const ctrl=new AbortController();const t=setTimeout(()=>ctrl.abort(),timeout);try{const r=await fetch(url,{signal:ctrl.signal,redirect:'follow',headers:{'User-Agent':'Mozilla/5.0','Accept':'text/html'}});clearTimeout(t);if(!r.ok)return{name,url,status:r.status,len:0};const x=cleanHtml(await r.text());if(x.length>1500)fs.writeFileSync(path.join(OUT,name+'.txt'),x);return{name,url,status:r.status,len:x.length,saved:x.length>1500};}catch(e){clearTimeout(t);return{name,url,status:'ERR',len:0,err:String(e.message||e).slice(0,60),attempt};}}
async function retry(url,name){let last;for(let i=1;i<=3;i++){const r=await one(url,name,i);last=r;if(r.saved||r.err===undefined)return r;if(i<3){await new Promise(s=>setTimeout(s,1200));}}return last;}
const SET=[
  // wikipedia sample
  ['wiki-cap','https://en.wikipedia.org/wiki/CAP_theorem'],
  ['wiki-graph','https://en.wikipedia.org/wiki/Graph_(abstract_data_type)'],
  ['wiki-bigo','https://en.wikipedia.org/wiki/Big_O_notation'],
  ['wiki-nosql','https://en.wikipedia.org/wiki/NoSQL'],
  ['wiki-solid','https://en.wikipedia.org/wiki/SOLID'],
  // gnu / k8s
  ['gnu-bash','https://www.gnu.org/software/bash/manual/bash.html'],
  ['k8s-configmap','https://kubernetes.io/docs/concepts/configuration/configmap/'],
  // grpc / openapi substitutes
  ['swagger-openapi','https://swagger.io/specification/'],
  ['grpc-guide','https://grpc.io/docs/what-is-grpc/introduction/'],
  // man7 supplementary for OS
  ['man7-fork','https://man7.org/linux/man-pages/man2/fork.2.html'],
  ['man7-pthreads','https://man7.org/linux/man-pages/man7/pthreads.7.html'],
  ['man7-pipe','https://man7.org/linux/man-pages/man7/pipe.7.html'],
  ['man7-mmap','https://man7.org/linux/man-pages/man2/mmap.2.html'],
  ['man7-cgroups','https://man7.org/linux/man-pages/man7/cgroups.7.html'],
];
for(const [n,u] of SET){const r=await retry(u,n);console.log((r.saved?'SAVED':(r.err?'ERR  ':'skip ')).padEnd(5),n.padEnd(18),r.status,'len='+r.len,r.err?('| '+r.err):'');}
