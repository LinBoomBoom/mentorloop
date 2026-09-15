/**
 * 补齐缺失的 keywords 字段（Q4 缺陷归零）。
 *
 * keywords 为空会导致检索/推荐召回不到该题。补全策略（无需 API）：
 *   1. 题干+答案中的英文技术词（首字母大写的驼峰词、含 #/. 的版本号、全大写缩写）
 *   2. 中文技术短语（常见后缀：机制/原理/算法/模型/协议/框架/组件/策略/方案/优化/调度…）
 *   3. 兜底：L4 技术标签 + 赛道维度词，保证至少不为空
 * 只写 keywords 为空或空数组的题，已有值的一律不动。
 */
import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DB_FILE = path.join(ROOT, 'data', 'devmentor.db')
const APPLY = process.argv.includes('--apply')

const db = new Database(DB_FILE)
const rows = db.prepare('select id, subtrack, tech, q, a, keywords from interview_questions').all()

function isEmpty (v) {
  if (v == null || v === '') return true
  try { const a = JSON.parse(v); return !Array.isArray(a) || !a.length } catch { return true }
}

// 中文技术短语：2~6 个汉字 + 技术特征后缀
const CN_SUFFIX = /(机制|原理|算法|模型|协议|框架|组件|策略|方案|优化|调度|架构|模式|流程|规范|指标|工具|系统|服务|接口|队列|缓存|索引|事务|锁|部署|监控|测试|编译|构建|渲染|路由|状态|生命周期|装饰器|布局|适配|加密|鉴权|限流|熔断|灰度|回滚|扩容|采样|标注|量化|蒸馏|推理|训练|召回|排序)/g
const STOP = new Set(['请解释', '请说明', '什么是', '如何', '为什么', '哪些', '以及', '并且', '如果', '可以', '这个', '一个', '我们', '它们', '区别', '场景', '问题', '方式', '核心', '常见', '使用', '进行', '实现', '设计', '说明', '描述', '分析', '对比', '举例', '结合'])

const EN = /[A-Za-z][A-Za-z0-9]*(?:[.#+][A-Za-z0-9]+)*/g
const EN_STOP = new Set(['the', 'and', 'for', 'you', 'are', 'with', 'this', 'that', 'from', 'how', 'why', 'what', 'not', 'can', 'use', 'get', 'set', 'var', 'let', 'new', 'try', 'log', 'key', 'val', 'res', 'req', 'err', 'msg', 'tmp', 'app', 'com', 'org', 'http', 'https', 'www', 'api', 'url', 'uri', 'id', 'px', 'em', 'rem', 'ms', 'kb', 'mb', 'gb'])

const plans = []
for (const r of rows) {
  if (!isEmpty(r.keywords)) continue
  const text = `${r.q || ''} ${String(r.a || '').slice(0, 400)}`
  const picked = []
  const seen = new Set()
  for (const m of text.match(EN) || []) {
    const w = m.replace(/[.]+$/, '')
    if (w.length < 2 || w.length > 24) continue
    if (EN_STOP.has(w.toLowerCase())) continue
    if (/^\d+$/.test(w)) continue
    if (seen.has(w.toLowerCase())) continue
    seen.add(w.toLowerCase()); picked.push(w)
    if (picked.length >= 4) break
  }
  if (picked.length < 3) {
    for (const m of (r.q || '').match(/[\u4e00-\u9fa5]{2,6}(?=机制|原理|算法|模型|协议|框架|组件|策略|方案|优化|调度|架构|模式|流程|规范|指标|工具|系统|服务|接口|队列|缓存|索引|事务|锁|部署|监控|测试|编译|构建|渲染|路由|状态|布局|适配|加密|鉴权|限流|熔断|灰度|回滚|扩容)/g) || []) {
      const w = m + ((r.q || '').match(new RegExp(m + '(机制|原理|算法|模型|协议|框架|组件|策略|方案|优化|调度|架构|模式|流程|规范|指标|工具|系统|服务|接口|队列|缓存|索引|事务|锁|部署|监控|测试|编译|构建|渲染|路由|状态|布局|适配|加密|鉴权|限流|熔断|灰度|回滚|扩容)')) || [])[1]
      if (STOP.has(w) || seen.has(w)) continue
      seen.add(w); picked.push(w)
      if (picked.length >= 5) break
    }
  }
  // seen 存的是小写形式，这里必须同态比较，否则会出现 [CSS、Grid、…、CSS] 这种重复
  if (r.tech && !seen.has(String(r.tech).toLowerCase())) picked.push(r.tech)
  if (!picked.length) picked.push(r.subtrack || '综合')
  plans.push({ id: r.id, kw: picked.slice(0, 6), q: String(r.q || '').slice(0, 60) })
}

console.log(`待补关键词：${plans.length} 题`)
console.log(APPLY ? '模式：写库' : '模式：dry-run（加 --apply 写库）')
for (const p of plans.slice(0, 10)) console.log(`  #${p.id} [${p.kw.join('、')}]  ${p.q}`)

if (APPLY && plans.length) {
  const bak = DB_FILE + '.bak-' + Date.now()
  fs.copyFileSync(DB_FILE, bak)
  const up = db.prepare('update interview_questions set keywords = ? where id = ?')
  const tx = db.transaction((rs) => { for (const r of rs) up.run(JSON.stringify(r.kw), r.id) })
  tx(plans)
  console.log(`\n已备份：${path.basename(bak)}`)
  console.log(`已更新：${plans.length} 题`)
}
