// 轻量 Markdown 渲染（内容来自受信任的种子数据，使用 v-html 安全）
export interface Freshness { 核验?: string; 风险?: string; 版本?: string; 来源?: string }

const FRESH_LINE = /^>[ \t]*时效[ \t]*\|(.+)$/m

export const useMarkdown = () => {
  function inline(t: string) {
    return t
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+?)`/g, '<code>$1</code>')
      // 知识图谱内链：[名字](doc:module/chapter/section) → 站内可点击链接（宪章「可导航」）
      .replace(
        /\[([^\]]+)\]\(doc:([\w-]+)\/([\w-]+)\/([\w-]+)\)/g,
        '<a class="doc-link" href="/learn/$2/$3/$4">$1</a>'
      )
      // 外链
      .replace(
        /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
        '<a class="doc-link" href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
      )
  }

  function md(src: string) {
    let s = (src || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    s = s.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, _l, code) => `<pre><code>${code.replace(/\n$/, '')}</code></pre>`)
    const lines = s.split('\n')
    let html = '', inList = false, listType = ''
    const closeList = () => { if (inList) { html += listType === 'ol' ? '</ol>' : '</ul>'; inList = false } }
    for (const line of lines) {
      if (line.startsWith('```')) continue
      if (/^### /.test(line)) { closeList(); html += `<h3>${inline(line.slice(4))}</h3>`; continue }
      if (/^## /.test(line)) { closeList(); html += `<h2>${inline(line.slice(3))}</h2>`; continue }
      // 引用块（注意：此时 '>' 已被转义为 '&gt;'）
      if (/^&gt;\s?/.test(line)) { closeList(); html += `<blockquote>${inline(line.replace(/^&gt;\s?/, ''))}</blockquote>`; continue }
      if (/^(-{3,}|\*{3,})$/.test(line.trim())) { closeList(); html += '<hr />'; continue }
      if (/^[-*] /.test(line)) {
        if (!inList || listType !== 'ul') { closeList(); html += '<ul>'; inList = true; listType = 'ul' }
        html += `<li>${inline(line.slice(2))}</li>`; continue
      }
      if (/^\d+\.\s/.test(line)) {
        if (!inList || listType !== 'ol') { closeList(); html += '<ol>'; inList = true; listType = 'ol' }
        html += `<li>${inline(line.replace(/^\d+\.\s/, ''))}</li>`; continue
      }
      if (line.trim() === '') { closeList(); continue }
      closeList(); html += `<p>${inline(line)}</p>`
    }
    closeList()
    return html
  }

  /**
   * 拆出时效元数据（活运营宪章 第 4.1 条），使其以「保鲜徽章」渲染而非原始 markdown 文本。
   * 返回 { fresh, body }：body 已移除时效行，可直接交给 md()。
   */
  function splitFreshness(src: string): { fresh: Freshness | null; body: string } {
    const raw = src || ''
    const m = raw.match(FRESH_LINE)
    if (!m) return { fresh: null, body: raw }
    const fresh: Record<string, string> = {}
    for (const part of m[1].split('|')) {
      const i = part.indexOf('=')
      if (i > 0) fresh[part.slice(0, i).trim()] = part.slice(i + 1).trim()
    }
    return { fresh: fresh as Freshness, body: raw.replace(m[0], '').replace(/^\s*\n+/, '') }
  }

  /** 复核 SLA（天）：高 90 / 中 180 / 低 365（宪章 4.2） */
  function freshnessState(fresh: Freshness | null) {
    if (!fresh?.核验) return null
    const sla = fresh.风险 === '高' ? 90 : fresh.风险 === '低' ? 365 : 180
    const days = Math.floor((Date.now() - new Date(fresh.核验).getTime()) / 86400000)
    const left = sla - days
    return { days, sla, left, overdue: left < 0, soon: left >= 0 && left <= 14 }
  }

  return { md, splitFreshness, freshnessState }
}
