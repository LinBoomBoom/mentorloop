// #90 高风险章技术复核修正：op-c8-s2 三交互模式协作开销排序
// Team Topologies 权威界定：X-as-a-Service（最省）< Facilitation < Collaboration（最高）
// 原文误写为 "X-as-a-Service < Collaboration < Facilitation"
// 幂等：仅当存在错误排序时才替换；支持 --seed 指定数据文件。
import fs from 'node:fs'

const SEED = process.argv.includes('--seed')
  ? process.argv[process.argv.indexOf('--seed') + 1]
  : './data/seed-content.json'

const WRONG = 'X-as-a-Service < Collaboration < Facilitation'
const RIGHT = 'X-as-a-Service < Facilitation < Collaboration'

const s = JSON.parse(fs.readFileSync(SEED, 'utf-8'))
let fixed = 0
for (const m of s.modules) {
  for (const c of m.chapters) {
    for (const sec of c.sections) {
      if (sec.id === 'op-c8-s2' && sec.content.includes(WRONG)) {
        sec.content = sec.content.replace(WRONG, RIGHT)
        fixed++
      }
    }
  }
}
fs.writeFileSync(SEED, JSON.stringify(s, null, 2))
console.log(`#90 op-c8-s2 排序修正：${fixed} 处`)
