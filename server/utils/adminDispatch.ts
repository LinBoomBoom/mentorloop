// 管理后台分发逻辑（纯函数，可单测）。路由层 server/api/admin/[...slug].ts 仅做鉴权 + 事件解析后调用本文件。
import * as A from './admin'
import { logAudit } from './db'

class HttpErr extends Error {
  statusCode: number
  constructor(code: number, msg: string) { super(msg); this.statusCode = code }
}

function mapErr(e: any) {
  const m = e?.message
  if (m === 'INVALID_ID') return new HttpErr(400, 'ID 非法（仅限小写字母/数字/连字符/下划线，长度 2-80）')
  if (m === 'DUP_ID') return new HttpErr(409, 'ID 已存在')
  if (m === 'NO_MODULE') return new HttpErr(400, '所属模块不存在')
  if (m === 'NO_CHAPTER') return new HttpErr(400, '所属章节不存在')
  if (m === 'WEAK_PASSWORD') return new HttpErr(400, '密码至少 8 位')
    if (m === 'BAD_STATUS') return new HttpErr(400, '非法的申请状态')
    if (m === 'ALREADY_REVIEWED') return new HttpErr(400, '该提问已被审核过，不能重复审核')
    return new HttpErr(400, m || '请求错误')
}

export function adminDispatch(admin: any, method: string, seg: string[], q: any, body: any) {
  const ok = (data: any) => ({ ok: true, data })
  const list = (data: any) => ({ ok: true, ...data })

  let result: any
  try {
    result = run()
  } catch (e: any) {
    if (e instanceof HttpErr) throw e
    if (e?.statusCode) throw e
    throw mapErr(e)
  }

  // G7 操作审计：仅记录变更类动作（POST/PATCH/DELETE），读操作不记。
  const isMutating = method === 'POST' || method === 'PATCH' || method === 'DELETE'
  if (isMutating && result && result.ok) {
    logAudit(admin.id, method, '/' + (seg || []).join('/'), { seg: seg || [] })
  }
  return result

  function run(): any {
    // 自身信息 & 看板
    if (seg[0] === 'me' && method === 'GET') return ok(A.getUserById(admin.id))
    if (seg[0] === 'dashboard' && method === 'GET') return ok(A.dashboardStats())

    // 用户体系 (G4)
    if (seg[0] === 'users') {
      if (method === 'GET' && seg.length === 1) return list(A.listUsers({ q: q.q as string, role: q.role as string, page: +q.page || 1, pageSize: +q.pageSize || 20 }))
      if (method === 'POST' && seg.length === 1) return ok(A.createUser(body))
      if (seg.length === 2) {
        if (method === 'GET') return ok(A.getUserById(seg[1]))
        if (method === 'PATCH') return ok(A.updateUser(seg[1], body))
        if (method === 'DELETE') {
          if (seg[1] === admin.id) throw new HttpErr(400, '不能删除当前登录账号')
          return ok({ deleted: A.deleteUser(seg[1]) })
        }
      }
    }

    // 内容：模块 (G2)
    if (seg[0] === 'modules') {
      if (method === 'GET' && seg.length === 1) return list({ items: A.listModules() })
      if (method === 'POST' && seg.length === 1) return ok(A.createModule(body))
      if (seg.length === 2) {
        if (method === 'GET') return ok(A.getModule(seg[1]))
        if (method === 'PATCH') return ok(A.updateModule(seg[1], body))
        if (method === 'DELETE') return ok({ deleted: A.deleteModule(seg[1]) })
      }
    }

    // 内容：章节 (G2)
    if (seg[0] === 'chapters') {
      if (method === 'GET' && seg.length === 1) return list({ items: A.listChapters(q.moduleId as string) })
      if (method === 'POST' && seg.length === 1) return ok(A.createChapter(body))
      if (seg.length === 2) {
        if (method === 'GET') return ok(A.getChapter(seg[1]))
        if (method === 'PATCH') return ok(A.updateChapter(seg[1], body))
        if (method === 'DELETE') return ok({ deleted: A.deleteChapter(seg[1]) })
      }
    }

    // 内容：小节 (G2)
    if (seg[0] === 'sections') {
      if (method === 'GET' && seg.length === 1) return list({ items: A.listSections(q.chapterId as string, q.track as string) })
      if (method === 'POST' && seg.length === 1) return ok(A.createSection(body))
      if (seg.length === 2) {
        if (method === 'GET') return ok(A.getSection(seg[1]))
        if (method === 'PATCH') return ok(A.updateSection(seg[1], body))
        if (method === 'DELETE') return ok({ deleted: A.deleteSection(seg[1]) })
      }
    }

    // 题库：试卷 (G3)
    if (seg[0] === 'exam-sets') {
      if (method === 'GET' && seg.length === 1) return list({ items: A.listExamSets(q.track as string) })
      if (method === 'POST' && seg.length === 1) return ok(A.createExamSet(body))
      if (seg.length === 2) {
        if (method === 'GET') return ok(A.getExamSetDetail(seg[1]))
        if (method === 'PATCH') return ok(A.updateExamSet(seg[1], body))
        if (method === 'DELETE') return ok({ deleted: A.deleteExamSet(seg[1]) })
      }
    }

    // 题库：面试题 (G3)
    if (seg[0] === 'interview') {
      if (method === 'GET' && seg.length === 1) return list({ items: A.listInterview(q.track as string, q.q as string) })
      if (method === 'POST' && seg.length === 1) return ok(A.createInterview(body))
      if (seg.length === 2) {
        if (method === 'GET') return ok(A.getInterview(seg[1]))
        if (method === 'PATCH') return ok(A.updateInterview(seg[1], body))
        if (method === 'DELETE') return ok({ deleted: A.deleteInterview(seg[1]) })
      }
    }

    // 订单 / 订阅 (G5)
    if (seg[0] === 'orders' && method === 'GET' && seg.length === 1) return list({ items: A.listOrders() })
    if (seg[0] === 'subscriptions' && method === 'GET' && seg.length === 1) return list({ items: A.listSubscriptions() })

    // 内推资源库管理 (H4, M4 维护)
    if (seg[0] === 'referrals') {
      if (method === 'GET' && seg.length === 1) return list({ items: A.listReferralsAdmin({ track: q.track as string, city: q.city as string, level: q.level as string }) })
      if (method === 'POST' && seg.length === 1) return ok(A.createReferral(body))
      if (seg.length === 2) {
        if (method === 'GET') return ok(A.getReferral(seg[1]))
        if (method === 'PATCH') return ok(A.updateReferral(seg[1], body))
        if (method === 'DELETE') return ok({ deleted: A.deleteReferral(seg[1]) })
      }
    }
    if (seg[0] === 'referral-applications') {
      if (method === 'GET' && seg.length === 1) return list({ items: A.listReferralApplications(q.status as string) })
      if (seg.length === 2 && method === 'PATCH') return ok(A.updateReferralApplication(seg[1], body.status))
    }

    // 面试题库待补充池（收录自用户提问，题库未命中经 LLM 增强）
    if (seg[0] === 'user-questions' && method === 'GET' && seg.length === 1) {
      return list({ items: A.listUserQuestions({ status: q.status as string, track: q.track as string, page: +q.page || 1, pageSize: +q.pageSize || 30 }) })
    }
    if (seg[0] === 'user-questions' && method === 'PATCH' && seg.length === 2) {
      return ok(A.reviewUserQuestion(seg[1], body.decision, body))
    }
    // 批量审核：body.ids 为待处理项 ID 数组，decision=accept|reject，patch 为可选统一覆盖字段
    if (seg[0] === 'user-questions' && seg[1] === 'batch' && method === 'POST' && seg.length === 2) {
      const ids = Array.isArray(body.ids) ? body.ids : []
      const decision = body.decision
      if (decision !== 'accept' && decision !== 'reject') throw new HttpErr(400, 'decision 必须为 accept 或 reject')
      let okCount = 0
      const skipped: string[] = []
      const failed: string[] = []
      for (const id of ids) {
        try {
          const r = A.reviewUserQuestion(id, decision, body.patch || {})
          if (r) okCount++
          else skipped.push(String(id))
        } catch (e: any) {
          failed.push(String(id) + ':' + (e?.message || 'err'))
        }
      }
      return ok({ okCount, skipped, failed, total: ids.length })
    }

    throw new HttpErr(404, '未知的管理接口：' + method + ' /' + seg.join('/'))
  }
}
