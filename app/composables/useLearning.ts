// 学习解锁逻辑：章需前一章全完成，节需前一节完成
export const useLearning = () => {
  const k = (mid: string, cid: string, sid: string) => `${mid}/${cid}/${sid}`
  const isDone = (p: any, mid: string, cid: string, sid: string) => !!(p && p[k(mid, cid, sid)])
  const chapterUnlocked = (module: any, p: any, ci: number) => {
    if (!module || ci === 0) return true
    const prev = module.chapters[ci - 1]
    return prev.sections.every((s: any) => isDone(p, module.id, prev.id, s.id))
  }
  const sectionUnlocked = (module: any, p: any, ci: number, si: number) => {
    const ch = module?.chapters[ci]
    if (!ch) return false
    if (si === 0) return chapterUnlocked(module, p, ci)
    return isDone(p, module.id, ch.id, ch.sections[si - 1].id)
  }
  return { isDone, chapterUnlocked, sectionUnlocked }
}
