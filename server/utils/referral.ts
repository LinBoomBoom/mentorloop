// H4 · 内推资源库：岗位列表（按方向/城市/级别筛选）+ 申请内推（落库，供导师/HR 后续处理）
import { sqlite, uid } from './db'
import { createError } from 'h3'
import { trackName } from './interview'

export function listReferrals(filter: { track?: string; city?: string; level?: string } = {}) {
  const where: string[] = []
  const params: any[] = []
  if (filter.track) { where.push('track=?'); params.push(filter.track) }
  if (filter.city) { where.push('city=?'); params.push(filter.city) }
  if (filter.level) { where.push('level=?'); params.push(filter.level) }
  const sql = 'SELECT id,company,title,track,city,level,type,requirement,intro,created_at FROM referrals'
    + (where.length ? ' WHERE ' + where.join(' AND ') : '')
    + ' ORDER BY created_at DESC'
  const rows = sqlite.prepare(sql).all(...params) as any[]
  return rows.map((r: any) => ({
    id: r.id, company: r.company, title: r.title, track: r.track, trackName: trackName(r.track),
    city: r.city, level: r.level, type: r.type, requirement: r.requirement, intro: r.intro
  }))
}

export class AlreadyAppliedError extends Error {
  constructor() { super('ALREADY_APPLIED'); this.name = 'AlreadyAppliedError' }
}
export class ReferralNotFoundError extends Error {
  constructor() { super('REFERRAL_NOT_FOUND'); this.name = 'ReferralNotFoundError' }
}

export async function applyReferral(userId: string, body: { referralId?: string; name?: string; contact?: string; note?: string }) {
  const referralId = body.referralId
  if (!referralId) throw createError({ statusCode: 400, statusMessage: '缺少 referralId' })
  const ref = sqlite.prepare('SELECT id FROM referrals WHERE id=?').get(referralId) as any
  if (!ref) throw new ReferralNotFoundError()

  // 防重复申请：同一用户对同一岗位已有 pending/done 申请则提示
  const exist = sqlite.prepare('SELECT id FROM referral_applications WHERE user_id=? AND referral_id=?').get(userId, referralId) as any
  if (exist) throw new AlreadyAppliedError()

  const name = String(body.name || '').trim()
  const contact = String(body.contact || '').trim()
  const note = String(body.note || '').trim().slice(0, 500)
  if (!name || !contact) throw new Error('请填写称呼与联系方式，便于导师/HR 联系你')

  const id = uid('ra_')
  sqlite.prepare('INSERT INTO referral_applications (id,user_id,referral_id,name,contact,note,status,created_at) VALUES (?,?,?,?,?,?,?,?)')
    .run(id, userId, referralId, name, contact, note, 'pending', Date.now())
  return { id, status: 'pending' }
}

export function listMyApplications(userId: string) {
  const rows = sqlite.prepare(
    `SELECT a.id,a.referral_id,a.name,a.status,a.created_at,r.company,r.title,r.track,r.city
     FROM referral_applications a LEFT JOIN referrals r ON r.id=a.referral_id
     WHERE a.user_id=? ORDER BY a.created_at DESC LIMIT 50`
  ).all(userId) as any[]
  return rows.map((r: any) => ({
    id: r.id, referralId: r.referral_id, company: r.company, title: r.title, track: r.track, city: r.city,
    name: r.name, status: r.status, createdAt: r.created_at
  }))
}
