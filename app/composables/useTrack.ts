// 三方向主色唯一来源 —— 与 tailwind.config.js 的 track.* 令牌保持一致，
// 避免首页/试卷/复盘页各自硬编码导致「后端/运维」颜色跨页乱跳（UI 审计 P0-1）。
export const trackMeta: Record<string, { name: string; color: string; bg: string }> = {
  frontend: { name: '前端', color: '#ff5e7e', bg: 'rgba(255,94,126,.12)' },
  backend:  { name: '后端', color: '#14b8a6', bg: 'rgba(20,184,166,.12)' }, // 与 track.be 一致
  devops:   { name: '运维', color: '#f59e0b', bg: 'rgba(245,158,11,.14)' }, // 与 track.op 一致
  ai:       { name: 'AI 工程', color: '#8b5cf6', bg: 'rgba(139,92,246,.14)' } // 与 ai 模块主色一致
}

// 方向徽标：彩色淡底保留分类信号，文字改 ink 近黑，确保小号文字达 WCAG AA（UI 重设计 ②）
// 保留 bg-track-* 淡底作为分类色信号；text-ink 解决「中明度方向色作小号文字对比度不足」问题。
export const trackBadge = (t: string) => ({
  frontend: 'bg-track-fe/12 text-ink',
  backend:  'bg-track-be/12 text-ink',
  devops:   'bg-track-op/12 text-ink',
  ai:       'bg-track-ai/12 text-ink'
}[t] || 'bg-ink/10 text-ink')
