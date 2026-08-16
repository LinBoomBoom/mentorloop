// 补 3 个诚实缺口源：Redis 持久化/复制、DORA 度量
import fs from 'node:fs';
const OUT = 'C:/Users/13057/.workbuddy/binaries/node/versions/22.22.2/tmp/ai-ops-batch';
function cleanHtml(html){let h=html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<noscript[\s\S]*?<\/noscript>/gi,' ').replace(/<svg[\s\S]*?<\/svg>/gi,' ');let b='';const m=h.match(/<main[\s\S]*?<\/main>/i)||h.match(/<article[\s\S]*?<\/article>/i)||h.match(/<body[\s\S]*?<\/body>/i);if(m)b=m[0];else b=h;b=b.replace(/<\/(p|div|section|li|h[1-6]|tr|br|article|main)>/gi,'\n').replace(/<[^>]+>/g,' ');b=b.replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#39;|&apos;/g,"'").replace(/&quot;/g,'"');return b.replace(/[ \t]+/g,' ').replace(/\n\s*\n+/g,'\n').trim();}
async function one(url,name){const c=new AbortController();const t=setTimeout(()=>c.abort(),25000);try{const r=await fetch(url,{signal:c.signal,redirect:'follow',headers:{'User-Agent':'Mozilla/5.0','Accept':'text/html'}});clearTimeout(t);if(!r.ok)return{name,status:r.status,len:0};const x=cleanHtml(await r.text());if(x.length>1500)fs.writeFileSync(OUT+'/'+name+'.txt',x);return{name,status:r.status,len:x.length,saved:x.length>1500};}catch(e){clearTimeout(t);return{name,status:'ERR',len:0,err:String(e.message||e)};}}
const T=[
  ['redis-persistence','https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/'],
  ['redis-replication','https://redis.io/docs/latest/operate/oss_and_stack/management/replication/'],
  ['dora-metrics','https://cloud.google.com/devops/metrics'],
];
for(const [n,u] of T){const r=await one(u,n);console.log(n.padEnd(20),r.status,r.len,r.saved?'(saved)':'');if(r.err)console.log('  err',r.err.slice(0,80));}
