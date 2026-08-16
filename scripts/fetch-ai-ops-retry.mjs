// 重试 + 替补：补回首轮失败但重要的官方源
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
const OUT = 'C:/Users/13057/.workbuddy/binaries/node/versions/22.22.2/tmp/ai-ops-batch';
mkdirSync(OUT, { recursive: true });
const TARGETS = [
  { name: 'ai-llamacpp', topic: 'ai-c7-infer', url: 'https://github.com/ggerganov/llama.cpp' },
  { name: 'op-sre-book', topic: 'op-c5-sre', url: 'https://sre.google/sre-book/table-of-contents/' },
  { name: 'op-k8s-security', topic: 'op-c5-security', url: 'https://kubernetes.io/docs/concepts/security/overview/' },
  { name: 'op-backstage', topic: 'op-c8-idp', url: 'https://backstage.io/docs/features/software-catalog/' },
  { name: 'op-aws-iac', topic: 'op-c7-iac', url: 'https://aws.amazon.com/cloudformation/' },
  { name: 'op-aws-sec-pillar', topic: 'op-c5-security', url: 'https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/welcome.html' },
  { name: 'op-aws-sre', topic: 'op-c5-sre', url: 'https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html' },
];
function cleanHtml(html) {
  let h = html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<noscript[\s\S]*?<\/noscript>/gi,' ').replace(/<svg[\s\S]*?<\/svg>/gi,' ');
  let block = '';
  const m = h.match(/<main[\s\S]*?<\/main>/i)||h.match(/<article[\s\S]*?<\/article>/i)||h.match(/<body[\s\S]*?<\/body>/i);
  if(m) block=m[0]; else block=h;
  block = block.replace(/<\/(p|div|section|li|h[1-6]|tr|br|article|main)>/gi,'\n').replace(/<[^>]+>/g,' ');
  block = block.replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#39;|&apos;/g,"'").replace(/&quot;/g,'"');
  return block.replace(/[ \t]+/g,' ').replace(/\n\s*\n+/g,'\n').trim();
}
async function fetchOne(t){
  const ctrl=new AbortController(); const timer=setTimeout(()=>ctrl.abort(),25000);
  try{
    const res=await fetch(t.url.trim(),{signal:ctrl.signal,redirect:'follow',headers:{'User-Agent':'Mozilla/5.0 (compatible; MentorLoopContentBot/1.0)','Accept':'text/html,application/xhtml+xml'}});
    clearTimeout(timer);
    if(!res.ok) return {...t,status:res.status,len:0};
    const text=cleanHtml(await res.text());
    if(text.length>1500) writeFileSync(join(OUT,t.name+'.txt'),text,'utf8');
    return {...t,status:res.status,len:text.length,saved:text.length>1500};
  }catch(e){clearTimeout(timer);return {...t,status:'ERR',len:0,err:String((e&&e.message)||e)};}
}
const results=await Promise.all(TARGETS.map(fetchOne));
console.log('name'.padEnd(20),'topic'.padEnd(18),'status'.padEnd(6),'len');
for(const r of results){console.log(String(r.name).padEnd(20),String(r.topic).padEnd(18),String(r.status).padEnd(6),String(r.len).padStart(7),r.saved?'(saved)':'');if(r.err)console.log('   err:',r.err.slice(0,100));}
