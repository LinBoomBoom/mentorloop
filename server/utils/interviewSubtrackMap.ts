// 旧版面试题「模块级 track + tech 展示名」→ v3 方向级 subtrack（=track id）的确定性映射。
//
// 旧库面试题（约 4031 道）只有 track=模块(frontend/backend/devops/ai) 与 tech=展示名(CSS/MySQL/…)，
// 缺 v3 的 subtrack(=方向 id，如 be-web)。题库 UI 按 subtrack 过滤，导致这些真实好题完全不可见。
// 本模块从 learningTaxonomy 派生 (模块,tech)→方向 映射，供 db.ts v22 迁移与一次性回填脚本复用，
// 保证「运行时迁移」与「离线回填」逻辑完全一致、可重跑、可审计。
//
// 派生规则（与 C2 dry-run 一致）：
//   1) 优先：subtrack 值 S -> SUBTRACK_DISPLAY[S] 即 tech 展示名 -> 取首个含 S 的赛道 id；
//   2) 兜底：赛道 techNames 含该 tech -> 取该赛道 id（同模块内，保证模块归属不变）。
import { LEARNING_TAXONOMY, SUBTRACK_DISPLAY } from '../../app/data/learningTaxonomy'

const map: Record<string, string> = {}
for (const [module, tracks] of Object.entries(LEARNING_TAXONOMY)) {
  // 第一轮：subtrack 值 -> 展示名（精确，优先）
  for (const t of tracks) {
    for (const S of t.chapterSubtracks) {
      const tn = SUBTRACK_DISPLAY[S]
      if (tn && !map[`${module}|${tn}`]) map[`${module}|${tn}`] = t.id
    }
  }
  // 第二轮兜底：techNames（subtrack 值无对应展示名时）
  for (const t of tracks) {
    for (const tn of t.techNames) {
      if (!map[`${module}|${tn}`]) map[`${module}|${tn}`] = t.id
    }
  }
}

export function resolveLegacySubtrack(module: string, tech: string | null): string | null {
  if (!tech) return null
  return map[`${module}|${tech}`] || null
}

export const LEGACY_SUBTRACK_MAP_SIZE = Object.keys(map).length
