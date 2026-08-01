// 轻量 Markdown 渲染（内容来自受信任的种子数据，使用 v-html 安全）
export const useMarkdown = () => {
  function inline(t: string) {
    return t
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+?)`/g, '<code>$1</code>')
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
  return { md }
}
