// 自定义滚动行为：解决切题时的「抖动 / 跳动」。
// 同一(方向, 技术)下的题目互切 → 保持当前滚动位置（return false），配合 [qid].vue 的组件复用
// 与稳定缓存 key，实现真正的「原地换内容」SPA 体验，不再整页跳顶。
// 其它导航（换技术 / 换方向 / 首次进入 / 浏览器前进后退）→ 默认：回退用 savedPosition，否则滚到顶部。
export default {
  scrollBehavior(to, from, savedPosition) {
    const segs = (p: string) => p.split('/').slice(0, 4).join('/')
    const isQuestion = (p: string) => p.startsWith('/interview/') && p.split('/').length >= 5
    if (isQuestion(to.path) && isQuestion(from.path) && segs(to.path) === segs(from.path)) {
      return false
    }
    if (savedPosition) return savedPosition
    return { top: 0 }
  }
}
