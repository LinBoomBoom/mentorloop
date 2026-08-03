// M5 题库扩建数据聚合（脚本化、可重跑幂等）
// 4 套 VIP 实战卷（每套 15 选择 + 5 笔试）+ 35 道面试题（ai 侧重）
import { feSet } from './m5-data-fe.mjs'
import { beSet } from './m5-data-be.mjs'
import { opChoices } from './m5-data-op.mjs'
import { opWritten } from './m5-data-op-w.mjs'
import { aiChoices } from './m5-data-ai-c.mjs'
import { aiWritten } from './m5-data-ai-w.mjs'
import { iqPartA } from './m5-data-iq-a.mjs'
import { iqPartB } from './m5-data-iq-b.mjs'

export const vipSets = [
  feSet,
  beSet,
  { id: 'exam-op-vip-3', name: '运维 VIP · SRE 与云原生实战卷', track: 'devops', level: '高级', duration: 90, vip: 1, choices: opChoices, written: opWritten },
  { id: 'exam-ai-vip-3', name: 'AI VIP · LLM 与工程实战卷', track: 'ai', level: '高级', duration: 90, vip: 1, choices: aiChoices, written: aiWritten }
]

export const interviewNew = [...iqPartA, ...iqPartB]
