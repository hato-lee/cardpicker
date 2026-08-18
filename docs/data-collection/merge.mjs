// 수집 결과 JSON들을 cards.json에 합친다. id 중복은 건너뛰고 보고.
import fs from 'node:fs'
import path from 'node:path'

const dir = '/Users/hato/Projects/cardpicker/docs/data-collection/incoming/batch4'
const target = process.cwd() + '/src/data/cards.json'
const files = process.argv.slice(2)

const existing = JSON.parse(fs.readFileSync(target, 'utf8'))
const ids = new Set(existing.map((c) => c.id))
const merged = [...existing]
const skipped = []
let added = 0

for (const f of files) {
  const p = fs.existsSync(f) ? f : path.join(dir, f)  // 경로를 그대로 줘도 되고, 파일명만 주면 batch4 폴더에서 찾는다
  if (!fs.existsSync(p)) { console.log(`MISSING ${f}`); continue }
  let arr
  try { arr = JSON.parse(fs.readFileSync(p, 'utf8')) } catch (e) { console.log(`BAD JSON ${f}: ${e.message}`); continue }
  if (!Array.isArray(arr)) { console.log(`NOT ARRAY ${f}`); continue }
  for (const c of arr) {
    if (!c || typeof c.id !== 'string') { skipped.push(`${f}: (no id)`); continue }
    if (ids.has(c.id)) { skipped.push(`${f}: dup ${c.id}`); continue }
    ids.add(c.id); merged.push(c); added++
  }
  console.log(`${f}: ${arr.length} read`)
}
fs.writeFileSync(target, JSON.stringify(merged, null, 2) + '\n')
console.log(`added ${added}, total ${merged.length}`)
if (skipped.length) console.log('skipped:\n  ' + skipped.join('\n  '))
