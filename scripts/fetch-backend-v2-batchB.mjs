// 后端溯源补齐 Batch B：仅可达 host（man7 / Python / Oracle Java / AWS / MS Learn / Spring Cloud / OWASP / MDN / swagger / etcd / consul）
import fs from 'node:fs';
import path from 'node:path';
const OUT = 'C:/Users/13057/.workbuddy/binaries/node/versions/22.22.2/tmp/backend-v2-batch';
fs.mkdirSync(OUT, { recursive: true });
function cleanHtml(html){let h=html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<noscript[\s\S]*?<\/noscript>/gi,' ').replace(/<svg[\s\S]*?<\/svg>/gi,' ').replace(/<!--[\s\S]*?-->/g,' ');let b='';const m=h.match(/<main[\s\S]*?<\/main>/i)||h.match(/<article[\s\S]*?<\/article>/i)||h.match(/<body[\s\S]*?<\/body>/i);if(m)b=m[0];else b=h;b=b.replace(/<h([1-6])[^>]*>/gi,'\n## ').replace(/<\/(p|div|section|li|h[1-6]|tr|br|article|main|ul|ol)>/gi,'\n').replace(/<[^>]+>/g,' ');b=b.replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#39;|&apos;/g,"'").replace(/&quot;/g,'"');return b.replace(/[ \t]+/g,' ').replace(/\n\s*\n+/g,'\n').trim();}
async function one(url,name,timeout=20000){const ctrl=new AbortController();const t=setTimeout(()=>ctrl.abort(),timeout);try{const r=await fetch(url,{signal:ctrl.signal,redirect:'follow',headers:{'User-Agent':'Mozilla/5.0','Accept':'text/html'}});clearTimeout(t);if(!r.ok)return{name,url,status:r.status,len:0};const x=cleanHtml(await r.text());const ok=x.length>1500;if(ok)fs.writeFileSync(path.join(OUT,name+'.txt'),x);return{name,url,status:r.status,len:x.length,saved:ok};}catch(e){clearTimeout(t);return{name,url,status:'ERR',len:0,err:String(e.cause?.code||e.message||e).slice(0,40)};}}
const T = {
  // man7 全系列（OS/网络底层）
  'man7-udp':'https://man7.org/linux/man-pages/man7/udp.7.html',
  'man7-fork':'https://man7.org/linux/man-pages/man2/fork.2.html',
  'man7-pthreads':'https://man7.org/linux/man-pages/man7/pthreads.7.html',
  'man7-pipe':'https://man7.org/linux/man-pages/man7/pipe.7.html',
  'man7-mmap':'https://man7.org/linux/man-pages/man2/mmap.2.html',
  'man7-cgroups':'https://man7.org/linux/man-pages/man7/cgroups.7.html',
  'man7-resolv':'https://man7.org/linux/man-pages/man5/resolv.conf.5.html',
  'man7-getaddrinfo':'https://man7.org/linux/man-pages/man3/getaddrinfo.3.html',
  'man7-filesystems':'https://man7.org/linux/man-pages/man5/filesystems.5.html',
  'man7-svipc':'https://man7.org/linux/man-pages/man7/svipc.7.html',
  'man7-sched':'https://man7.org/linux/man-pages/man7/sched.7.html',
  // Python 数据结构库（真实官方实现）
  'py-bisect':'https://docs.python.org/3/library/bisect.html',
  'py-heapq':'https://docs.python.org/3/library/heapq.html',
  'py-queue':'https://docs.python.org/3/library/queue.html',
  'py-array':'https://docs.python.org/3/library/array.html',
  // Oracle Java 集合/IO（设计模式真实实现 + 数据结构）
  'java-util':'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/package-summary.html',
  'java-io-filter':'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/io/FilterInputStream.html',
  'java-util-iterator':'https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Iterator.html',
  // AWS Builder's Library + DynamoDB 一致性（分布式/系统设计）
  'aws-builders':'https://aws.amazon.com/builders-library/',
  'aws-timeouts':'https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/',
  'aws-idempotency':'https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/',
  'aws-dynamo-consistency':'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html',
  // MS Learn 云设计模式 / 分布式
  'ms-patterns':'https://learn.microsoft.com/en-us/azure/architecture/patterns/',
  'ms-ddd':'https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd/',
  // Spring Cloud Config（配置中心）
  'spring-cloud-config':'https://docs.spring.io/spring-cloud-config/docs/current/reference/html/',
  // OWASP 密码存储
  'owasp-password':'https://owasp.org/www-project-cheat-sheets/cheatsheets/Password_Storage_Cheat_Sheet.html',
  // MDN HTTP 状态
  'mdn-http-status':'https://developer.mozilla.org/en-US/docs/Web/HTTP/Status',
  // swagger / openapi 替代
  'swagger-spec':'https://swagger.io/specification/',
  // etcd / consul（配置/共识）
  'etcd':'https://etcd.io/docs/v3.5/learning/',
  'consul':'https://developer.hashicorp.com/consul/docs',
};
const entries=Object.entries(T);const CONC=6;let done=0;
async function run(){const res=[];for(let i=0;i<entries.length;i+=CONC){const batch=entries.slice(i,i+CONC);const rs=await Promise.all(batch.map(([n,u])=>one(u,n)));for(const r of rs){done++;const tag=r.saved?'SAVED':(r.err?'ERR  ':'skip ');console.log(`[${done}/${entries.length}] ${tag} ${r.name.padEnd(22)} ${r.status} len=${r.len}${r.err?' | '+r.err:''}`);res.push(r);}}console.log(`\n=== SAVED=${res.filter(r=>r.saved).length}/${entries.length} ===`);}
run();
