// 面试题库方向概览（公开）——供 /interview 枢纽页展示各方向题量
// GET /api/interview/overview
export default defineEventHandler((event) => {
  const rows = sqlite.prepare(
    'SELECT track, type, count(*) c FROM interview_questions GROUP BY track, type'
  ).all() as any[]
  const tracks: Record<string, { hot: number; special: number }> = {}
  for (const r of rows) {
    if (!tracks[r.track]) tracks[r.track] = { hot: 0, special: 0 }
    if (r.type in tracks[r.track]) tracks[r.track][r.type] = r.c
  }
  return json(event, 200, { tracks })
})
