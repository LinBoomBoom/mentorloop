// 轻量 Markdown 渲染（内容来自受信任的种子数据，使用 v-html 安全）
export interface Freshness { 核验?: string; 风险?: string; 版本?: string; 来源?: string }

const FRESH_LINE = /^>[ \t]*时效[ \t]*\|(.+)$/m

export const useMarkdown = () => {
  // 属性值转义：阻断 " 闭合属性、< > 形成标签、& 误解析（用于 v-html 渲染的 URL/文本）
  const escAttr = (s: any) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  function inline(t: string) {
    return t
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+?)`/g, '<code>$1</code>')
      // 知识图谱内链：[名字](doc:module/chapter/section) → 站内可点击链接（宪章「可导航」）
      .replace(
        /\[([^\]]+)\]\((doc:([\w-]+)\/([\w-]+)\/([\w-]+))\)/g,
        (_m, text, _p, m, c, s) => `<a class="doc-link" href="/learn/${m}/${c}/${s}">${escAttr(text)}</a>`
      )
      // 外链（必须 http/https，且对 URL/文本做属性转义，阻断 " 闭合属性注入 XSS）
      .replace(
        /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
        (_m, text, url) => `<a class="doc-link" href="${escAttr(url)}" target="_blank" rel="noopener noreferrer">${escAttr(text)}</a>`
      )
  }

  function md(src: string) {
    let s = (src || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const lines = s.split('\n')
    let html = ''
    // 上一行是否为空行：用于区分「列表项内的续行」与「列表已结束后的独立段落」
    let afterBlank = false
    // 缩进感知的嵌套列表解析：用栈维护当前打开的 <ul>/<ol>，按前导空格层级嵌套。
    // 这样「1. 编号项」下缩进的「- 子项」会被正确嵌套进同一 <li>，而不是被当成段落关闭父列表，
    // 从而避免面试题里「1. 2. 3.」被渲染成一串「1.」的编号 bug（旧渲染器把缩进子项当段落，
    // 导致父 <ol> 被关闭，每个编号项各成一条 <ol> 全部显示成「1.」，波及约 2000 道）。
    type ListFrame = { type: 'ul' | 'ol'; indent: number; liOpen: boolean }
    const stack: ListFrame[] = []
    const indentOf = (l: string) => {
      const m = l.match(/^[\t ]*/); let n = 0
      for (const ch of m[0]) n += ch === '\t' ? 4 : 1
      return n
    }
    const listMarker = (l: string) => {
      const m = l.match(/^[\t ]*([-*+]|\d+[.)])\s/)
      if (!m) return null
      return { indent: indentOf(l), type: /\d/.test(m[1]) ? 'ol' as const : 'ul' as const, body: l.slice(m[0].length) }
    }
    const closeFrameLi = (f: ListFrame) => { if (f.liOpen) { html += '</li>'; f.liOpen = false } }
    const closeAll = () => {
      while (stack.length) { const f = stack.pop()!; closeFrameLi(f); html += f.type === 'ol' ? '</ol>' : '</ul>' }
    }
    // GFM 表格分隔行：`|---|---|` / `| --- | :--: |`
    const isTableSep = (l: string) => {
      const t = l.trim()
      if (!t.includes('|')) return false
      const parts = t.replace(/^\|/, '').replace(/\|$/, '').split('|')
      return parts.length >= 2 && parts.every(p => /^:?-{1,}:?$/.test(p.trim()))
    }
    const isTableRow = (l: string) => {
      const t = l.trim()
      if (!t.includes('|')) return false
      return t.replace(/^\|/, '').replace(/\|$/, '').split('|').length >= 2
    }
    const rowCells = (r: string) => r.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim())
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // 围栏代码块：整块渲染为 <pre><code>，且不关闭列表（支持列表项内嵌代码块，
      // 否则代码块内容行会被当成段落把父列表打断成一串「1.」；顺带修复顶层代码块渲染）。
      // 允许缩进围栏（如列表项内 `    ```js`），开/闭围栏均按 \s* 放宽匹配。
      if (/^\s*```/.test(line)) {
        const buf: string[] = []
        let k = i + 1
        while (k < lines.length && !/^\s*```/.test(lines[k])) { buf.push(lines[k]); k++ }
        const code = buf.join('\n').replace(/\n$/, '')
        html += `<pre><code>${code}</code></pre>`
        i = k // 跳过闭合围栏（若缺失则 k===lines.length，循环自然结束）
        continue
      }
      // GFM 表格：表头行 + 分隔行（支持标题紧贴表格，无需空行分隔）
      if (line.trim() !== '' && i + 1 < lines.length && isTableRow(line) && isTableSep(lines[i + 1])) {
        closeAll()
        const rows: string[] = []
        let j = i
        while (j < lines.length && lines[j].trim() !== '' && isTableRow(lines[j])) {
          rows.push(lines[j].trim())
          j++
        }
        let t = '<table><thead><tr>'
        for (const h of rowCells(rows[0])) t += `<th>${inline(h)}</th>`
        t += '</tr></thead><tbody>'
        for (let k = 2; k < rows.length; k++) {
          t += '<tr>'
          for (const c of rowCells(rows[k])) t += `<td>${inline(c)}</td>`
          t += '</tr>'
        }
        t += '</tbody></table>'
        html += t
        i = j - 1 // 跳过已消费的表格行
        continue
      }
      if (/^### /.test(line)) { closeAll(); html += `<h3>${inline(line.slice(4))}</h3>`; continue }
      if (/^## /.test(line)) { closeAll(); html += `<h2>${inline(line.slice(3))}</h2>`; continue }
      // 引用块（注意：此时 '>' 已被转义为 '&gt;'）
      if (/^&gt;\s?/.test(line)) { closeAll(); html += `<blockquote>${inline(line.replace(/^&gt;\s?/, ''))}</blockquote>`; continue }
      if (/^([-*] |\*{3,})$/.test(line.trim())) { closeAll(); html += '<hr />'; continue }
      // 列表项（支持 - * + 无序与 1. / 1) 有序；前导空格决定嵌套层级）
      const lm = listMarker(line)
      if (lm) {
        // 1) 关闭比当前项更深的列表（含其未闭合的 <li>）
        while (stack.length && stack[stack.length - 1].indent > lm.indent) {
          const f = stack.pop()!; closeFrameLi(f); html += f.type === 'ol' ? '</ol>' : '</ul>'
        }
        // 2) 同层级类型不一致（如 ol↔ul 同级切换）则关闭旧列表
        while (stack.length && stack[stack.length - 1].indent === lm.indent && stack[stack.length - 1].type !== lm.type) {
          const f = stack.pop()!; closeFrameLi(f); html += f.type === 'ol' ? '</ol>' : '</ul>'
        }
        let top = stack[stack.length - 1]
        // 3) 若顶层不是「同层级同类型」列表则开新列表（可能是嵌套下降，也可能是新层级）
        if (!top || top.indent !== lm.indent || top.type !== lm.type) {
          stack.push({ type: lm.type, indent: lm.indent, liOpen: false })
          html += lm.type === 'ol' ? '<ol>' : '<ul>'
          top = stack[stack.length - 1]
        }
        // 4) 关闭同列表内上一个 <li>（兄弟项），再开新 <li>
        closeFrameLi(top)
        html += `<li>${inline(lm.body)}`
        top.liOpen = true
        continue
      }
      // 空行：CommonMark 中列表项之间的空行不会结束列表，保持打开（修复「1.1.1.」编号 bug）。
      // 同时记录「上一行是否为空行」，用于区分列表项内续行与列表结束后的独立段落。
      if (line.trim() === '') { afterBlank = true; continue }
      afterBlank = false
      // 列表中且本行相对当前列表有缩进 → 视为列表项的续行（如编号项下的说明段落/代码说明），
      // 追加进当前 <li> 而不关闭列表，避免续行被当成段落把父列表打断成一串「1.」
      if (stack.length) {
        const topF = stack[stack.length - 1]
        if (indentOf(line) > topF.indent) {
          html += `<p>${inline(line.trim())}</p>`
          continue
        }
        // 列表项内、未缩进的续行：常见于「编号项 + 列0 代码块 + 说明文字」结构
        // （如面试题里 1. 标题 后紧跟 ```代码块``` 再跟「优点：…」）。该说明文字应并入当前 <li>，
        // 否则会被当成段落把父列表打断成一串「1.」。仅在「上一行不是空行」时生效——空行代表列表已结束。
        if (topF.liOpen && !afterBlank) {
          html += `<p>${inline(line.trim())}</p>`
          continue
        }
      }
      // 其他非列表内容（或列表已结束后的独立段落）：关闭所有打开的列表
      closeAll(); html += `<p>${inline(line)}</p>`
    }
    closeAll()
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
