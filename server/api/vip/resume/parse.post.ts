// H3 简历文件解析：VIP 专属，接收单份简历文件（pdf/doc/docx/txt/md 等），
// 服务端提取纯文本后返回，供前端填入诊断输入框。限 1 份、≤2MB。
// 注意：requireVipUser / json / rateLimit 由 Nitro 自动导入（server/utils/*），无需显式 import。
import { readMultipartFormData } from 'h3'

const MAX_FILE = 2 * 1024 * 1024 // 2MB
const MAX_TEXT = 8000 // 与诊断接口上限一致
const ALLOWED = new Set(['.txt', '.md', '.markdown', '.text', '.csv', '.json', '.log', '.pdf', '.doc', '.docx'])

export default defineEventHandler(async (event) => {
  const user = requireVipUser(event)
  const rl = rateLimit('vip-resume-parse', user.id, 20, 60_000)
  if (!rl.ok) return json(event, 429, { error: `请求过于频繁，请 ${rl.retryAfter} 秒后重试` })

  let parts: any[] = []
  try {
    parts = (await readMultipartFormData(event)) || []
  } catch {
    return json(event, 400, { error: '上传格式有误，请使用 multipart/form-data 上传单个文件' })
  }

  const files = parts.filter((p) => p.filename)
  if (files.length === 0) return json(event, 400, { error: '未检测到文件，请选择一份简历' })
  if (files.length > 1) return json(event, 400, { error: '每次仅支持上传 1 份简历' })

  const f = files[0]
  const name: string = f.filename || ''
  const ext = name.includes('.') ? '.' + name.split('.').pop()!.toLowerCase() : ''
  if (!ALLOWED.has(ext)) {
    return json(event, 415, { error: `不支持的文件类型（${ext || '未知'}），仅支持 PDF / DOC / DOCX / TXT / MD` })
  }
  if (!f.data || f.data.length === 0) return json(event, 400, { error: '文件为空' })
  if (f.data.length > MAX_FILE) return json(event, 413, { error: '文件过大，请控制在 2MB 以内' })

  try {
    let text = ''
    if (ext === '.pdf') {
      // 直连 lib 实现，避开 pdf-parse 的 index.js 在 ESM 下误触发的 debug 文件读取
      const mod: any = await import('pdf-parse/lib/pdf-parse.js')
      const pdfParse = mod.default ?? mod
      text = (await pdfParse(f.data)).text || ''
    } else if (ext === '.docx') {
      const mod: any = await import('mammoth')
      const mammoth = mod.default ?? mod
      text = (await mammoth.extractRawText({ buffer: f.data })).value || ''
    } else if (ext === '.doc') {
      return json(event, 415, { error: '旧版 .doc 暂不支持，请另存为 PDF 或 DOCX 后上传' })
    } else {
      text = f.data.toString('utf8')
    }

    text = (text || '').replace(/\r\n/g, '\n').replace(/ /g, ' ').trim()
    const truncated = text.length > MAX_TEXT
    if (truncated) text = text.slice(0, MAX_TEXT)
    if (text.length < 50) return json(event, 400, { error: '未能从文件中提取到足够的简历文本（少于 50 字），请检查文件或改用粘贴' })

    return json(event, 200, { text, truncated, fileName: name, chars: text.length })
  } catch (e: any) {
    return json(event, 422, { error: '文件解析失败：' + (e?.message || '未知错误') })
  }
})
