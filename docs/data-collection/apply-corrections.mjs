// verify-corrections.json 의 패치를 cards.json 에 적용
import fs from 'node:fs'
const target = process.cwd() + '/src/data/cards.json'
const file = process.argv[2]
const cards = JSON.parse(fs.readFileSync(target, 'utf8'))
const patches = JSON.parse(fs.readFileSync(file, 'utf8'))
let changed = 0, notes = 0
for (const p of patches) {
  const c = cards.find((x) => x.id === p.id)
  if (!c) { console.log('no such card:', p.id); continue }
  if (p.set) { Object.assign(c, p.set); changed++ }
  for (const bp of p.benefits ?? []) {
    const i = c.benefits.findIndex((b) => b.tag === bp.tag)
    if (i < 0) { console.log(`no benefit ${bp.tag} on ${p.id}`); continue }
    if (bp.remove) { c.benefits.splice(i, 1); changed++; continue }
    if (bp.set) { Object.assign(c.benefits[i], bp.set); changed++ }
  }
  for (const nb of p.addBenefits ?? []) {
    if (c.benefits.some((b) => b.tag === nb.tag)) { console.log(`dup tag ${nb.tag} on ${p.id}, skipped`); continue }
    c.benefits.push(nb); changed++
  }
  if (p.memoAppend) { c.memo = (c.memo ?? '') + p.memoAppend; notes++ }
}
fs.writeFileSync(target, JSON.stringify(cards, null, 2) + '\n')
console.log(`patches ${patches.length}, field changes ${changed}, memo notes ${notes}`)
