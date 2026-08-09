import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = './data/devmentor.db';
const SEED = './data/seed-content.json';

// 备份
fs.copyFileSync(DB_PATH, DB_PATH + '.bak_bejvm');
console.log('backed up devmentor.db -> devmentor.db.bak_bejvm');

const db = new Database(DB_PATH);
db.pragma('foreign_keys = OFF');

// 只清内容表，不动 users/sessions/auth_codes/progress/exam_records
const clear = ['sections', 'exam_choices', 'exam_written', 'exam_sets', 'interview_questions', 'chapters', 'modules'];
for (const t of clear) db.prepare(`DELETE FROM ${t}`).run();
console.log('cleared content tables');

const content = JSON.parse(fs.readFileSync(SEED, 'utf-8'));

const insMod = db.prepare('INSERT OR IGNORE INTO modules (id,name,icon,color,"desc",position) VALUES (?,?,?,?,?,?)');
const insCh = db.prepare('INSERT OR IGNORE INTO chapters (id,module_id,title,goal,position) VALUES (?,?,?,?,?)');
const insSec = db.prepare('INSERT OR IGNORE INTO sections (id,chapter_id,title,direction,content,position) VALUES (?,?,?,?,?,?)');
const insQ = db.prepare('INSERT OR IGNORE INTO interview_questions (id,track,type,q,a,keywords) VALUES (?,?,?,?,?,?)');
const insSet = db.prepare('INSERT OR IGNORE INTO exam_sets (id,name,track,level,duration,vip_only) VALUES (?,?,?,?,?,?)');
const insC = db.prepare('INSERT OR IGNORE INTO exam_choices (id,set_id,tag,q,options,answer,explain,multi) VALUES (?,?,?,?,?,?,?,?)');
const insW = db.prepare('INSERT OR IGNORE INTO exam_written (id,set_id,q,points,reference) VALUES (?,?,?,?,?)');

const tx = db.transaction(() => {
  content.modules.forEach((m, mi) => {
    insMod.run(m.id, m.name, m.icon, m.color, m.desc, mi);
    m.chapters.forEach((ch, ci) => {
      insCh.run(ch.id, m.id, ch.title, ch.goal, ci);
      ch.sections.forEach((s, si) => insSec.run(s.id, ch.id, s.title, s.direction, s.content, si));
    });
  });
  Object.entries(content.interview).forEach(([track, bank]) => {
    [...bank.hot, ...bank.special].forEach((q) => {
      insQ.run(q.id, track, q.id[1] === 's' ? 'special' : 'hot', q.q, q.a, JSON.stringify(q.keywords || []));
    });
  });
  content.examSets.forEach((set) => {
    insSet.run(set.id, set.name, set.track, set.level, set.duration, set.vipOnly ? 1 : 0);
    set.choices.forEach((c) => insC.run(c.id, set.id, c.tag, c.q, JSON.stringify(c.options), JSON.stringify(c.answer), c.explain, c.multi ? 1 : 0));
    set.written.forEach((w) => insW.run(w.id, set.id, w.q, JSON.stringify(w.points), w.reference));
  });
});
tx();

const counts = {
  modules: db.prepare('SELECT COUNT(*) c FROM modules').get().c,
  chapters: db.prepare('SELECT COUNT(*) c FROM chapters').get().c,
  sections: db.prepare('SELECT COUNT(*) c FROM sections').get().c,
  questions: db.prepare('SELECT COUNT(*) c FROM interview_questions').get().c,
  examSets: db.prepare('SELECT COUNT(*) c FROM exam_sets').get().c,
  users: db.prepare('SELECT COUNT(*) c FROM users').get().c,
};
console.log('RESEED COUNTS:', JSON.stringify(counts));

// 校验 be-jvm 落库
const bj = db.prepare("SELECT id,title FROM chapters WHERE id='be-jvm'").get();
const secs = db.prepare("SELECT COUNT(*) c FROM sections WHERE chapter_id='be-jvm'").get().c;
console.log('be-jvm in DB:', bj ? bj.title : 'MISSING', '| sections=', secs);
db.close();
