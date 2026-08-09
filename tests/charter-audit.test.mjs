import { test, expect } from 'vitest'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const root = path.resolve(__dirname, '..')

function runScript(file) {
  return spawnSync('node', [file], { cwd: root, encoding: 'utf-8' })
}

test('skilltree_audit.mjs 通过（exit 0，宪章三红线全过）', () => {
  const r = runScript('scripts/skilltree_audit.mjs')
  if (r.status !== 0) {
    console.error('audit 输出:\n', r.stdout, r.stderr)
  }
  expect(r.status).toBe(0)
})

test('v2_validate.mjs 通过（exit 0，V2 六段式/时效校验无误）', () => {
  const r = runScript('scripts/v2_validate.mjs')
  if (r.status !== 0) {
    console.error('v2_validate 输出:\n', r.stdout, r.stderr)
  }
  expect(r.status).toBe(0)
})
