// 云端知识库迁移单测：导入脚本纯函数 × baseline DDL 一致性
// 关联：docs/tasks（Mentorloop-app）/ 设计稿 miniapp-cloud-backend-design.md §4 / §6.5
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { TABLES, insertSql, rowValues } from '../scripts/content-import-mysql.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DDL = fs.readFileSync(path.join(ROOT, 'deploy', 'cloud', 'baseline-mysql.sql'), 'utf8')

/** 从 DDL 文本提取每张表的列名（CREATE TABLE `x` ( ... ) 的首列 token） */
async function parseDdlColumns(sql) {
  const out = {}
  const re = /CREATE TABLE IF NOT EXISTS `(\w+)` \(([\s\S]*?)\n\) ENGINE=/g
  let m
  while ((m = await re.exec(sql))) {
    const cols = []
    for (const line of m[2].split('\n')) {
      const t = line.trim()
      if (!t.startsWith('`')) continue // KEY / CONSTRAINT / UNIQUE 行跳过
      cols.push(t.slice(1, t.indexOf('`', 1)))
    }
    out[m[1]] = cols
  }
  return out
}

describe('content migration 基准', () => {
  it('导入脚本 9 张内容表与 DDL 一一对应且列清单一致', async () => {
    const ddlCols = await parseDdlColumns(DDL)
    for (const t of TABLES) {
      expect(ddlCols[t.name], `DDL 缺少表 ${t.name}`).toBeDefined()
      expect(t.columns, `${t.name} 列清单与 DDL 不一致`).toEqual(ddlCols[t.name])
    }
    // 内容表必须齐 9 张
    const contentTables = ['modules', 'chapters', 'sections', 'interview_questions', 'exam_sets', 'exam_choices', 'exam_written', 'skill_section_map', 'referrals']
    expect(TABLES.map((t) => t.name)).toEqual(contentTables)
  })

  it('DDL 覆盖同步基础设施表且保留字已反引号', () => {
    for (const tbl of ['content_changes', 'sync_state', 'meta', 'schema_migrations', 'auth_identities', 'users', 'progress']) {
      expect(DDL).toMatch(new RegExp(`CREATE TABLE (?:IF NOT EXISTS )?\\\`${tbl}\\\``))
    }
    // 保留字裸用会建表失败：key/right/desc 必须出现在反引号内
    expect(DDL).toContain('`key`')
    expect(DDL).toContain('`right`')
    expect(DDL).toContain('`desc`')
  })

  it('insertSql：占位符数量正确、pk 不进 UPDATE 子句、保留字带反引号', () => {
    const t = TABLES.find((x) => x.name === 'exam_choices')
    const sql = insertSql(t, 2)
    expect(sql.match(/\?/g).length).toBe(t.columns.length * 2)
    expect(sql).toContain('INSERT INTO `exam_choices`')
    expect(sql).toContain('ON DUPLICATE KEY UPDATE')
    expect(sql).not.toContain('`id` = VALUES') // pk 不回写
    expect(sql).toContain('`explain` = VALUES')
    const ssm = TABLES.find((x) => x.name === 'skill_section_map')
    expect(insertSql(ssm, 1)).not.toContain('`skill_key` = VALUES')
  })

  it('rowValues：缺失列补 null，JSON 列对象自动序列化', () => {
    const t = TABLES.find((x) => x.name === 'exam_choices')
    const v = rowValues(t, { id: 'ec1', options: ['A', 'B'], source: 'seed' })
    expect(v.options).toBe('["A","B"]')
    expect(v.set_id).toBeNull()
    expect(v.multi).toBeNull()
    expect(Object.keys(v)).toEqual(t.columns)
  })
})
