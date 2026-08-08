// 注：getUser/json/recordExamSkill/recordWrongItem/skillKey 均来自 server/utils 自动注入，严禁显式 import（Nitro 虚拟化会解析错位）

// POST /api/exam/practice —— 按技能自测（P1b）结果回写：
// 累加该技能的「模拟自测」掌握度信号，并把答错的题沉淀进错题本（供 SRS 复习）。
// body: { track, subtrack, skill, answers: [{ id, q, answer, userAnswer, correct, skill?, subtrack? }] }
export default defineEventHandler(async (event) => {
  const user = getUser(event)
  if (!user) return json(event, 401, { error: '未登录' })
  const body = await readBody(event)
  const { track, subtrack, skill, answers } = body || {}
  if (!track || !Array.isArray(answers) || !answers.length) return json(event, 400, { error: '参数缺失' })

  let correctN = 0
  for (const a of answers) {
    const sk = skillKey(track, subtrack || a.subtrack || '', skill || a.skill || '')
    const correct = !!a.correct
    recordExamSkill(user.id, sk, track, subtrack || a.subtrack || '', skill || a.skill || '', correct)
    if (!correct) {
      recordWrongItem(user.id, {
        source: 'practice',
        itemId: String(a.id),
        track,
        subtrackId: subtrack || a.subtrack || '',
        skillKey: sk,
        q: a.q || '',
        userAnswer: a.userAnswer != null ? String(a.userAnswer) : '',
        answer: a.answer || ''
      })
    } else correctN++
  }
  return json(event, 200, { ok: true, correct: correctN, total: answers.length })
})
