import Database from 'better-sqlite3';
const db = new Database('./data/devmentor.db');
const ids = ['be-dsa-s1','be-os-s5','be-dist-s3','be-c5-s1','be-sec-s5','be-nosql-s5','be-c4-s9','be-api-s6'];
const ph = ids.map(() => '?').join(',');
const r = db.prepare(`SELECT id, content FROM sections WHERE id IN (${ph})`).all(...ids);
for (const x of r) {
  const m = x.content.match(/https?:\/\/\S+/g) || [];
  console.log(x.id, '| urls=' + m.length, m[0] || '');
}
for (const mid of ['backend','ai','devops']) {
  const row = db.prepare(`SELECT count(*) n, sum(CASE WHEN content LIKE '%http%' THEN 1 ELSE 0 END) u FROM sections s JOIN chapters c ON s.chapter_id=c.id JOIN modules m ON c.module_id=m.id WHERE m.id=?`).get(mid);
  console.log(`DB ${mid}:`, row.n, 'withURL', row.u, '(' + Math.round(row.u/row.n*100) + '%)');
}
db.close();
