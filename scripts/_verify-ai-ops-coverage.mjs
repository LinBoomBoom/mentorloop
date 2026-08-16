import Database from 'better-sqlite3';
const db = new Database('./data/devmentor.db');
const ids = ['ai-c2-s1','ai-c6-s1','op-c6-s3','op-c8-s5','op-c5-s6','ai-c7-s2'];
const placeholders = ids.map(() => '?').join(',');
const r = db.prepare(`SELECT id, content FROM sections WHERE id IN (${placeholders})`).all(...ids);
for (const x of r) {
  const m = x.content.match(/https?:\/\/\S+/g) || [];
  console.log(x.id, '| urls=' + m.length, m[0] || '');
}
const ai = db.prepare(`SELECT count(*) n, sum(CASE WHEN content LIKE '%http%' THEN 1 ELSE 0 END) u FROM sections s JOIN chapters c ON s.chapter_id=c.id JOIN modules m ON c.module_id=m.id WHERE m.id='ai'`).get();
const op = db.prepare(`SELECT count(*) n, sum(CASE WHEN content LIKE '%http%' THEN 1 ELSE 0 END) u FROM sections s JOIN chapters c ON s.chapter_id=c.id JOIN modules m ON c.module_id=m.id WHERE m.id='devops'`).get();
const all = db.prepare(`SELECT count(*) n, sum(CASE WHEN content LIKE '%http%' THEN 1 ELSE 0 END) u FROM sections s JOIN chapters c ON s.chapter_id=c.id JOIN modules m ON c.module_id=m.id`).get();
console.log('DB ai     :', ai.n, 'withURL', ai.u, '(' + Math.round(ai.u / ai.n * 100) + '%)');
console.log('DB devops :', op.n, 'withURL', op.u, '(' + Math.round(op.u / op.n * 100) + '%)');
console.log('DB all    :', all.n, 'withURL', all.u, '(' + Math.round(all.u / all.n * 100) + '%)');
db.close();
