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
  if (p.set) {
    Object.assign(c, p.set); changed++
    // 카드 최상위 선택 필드(mileageBonus, perks, memo)는 null이면 삭제
    for (const k of ['mileageBonus', 'perks', 'memo']) if (k in p.set && p.set[k] === null) delete c[k]
  }
  for (const bp of p.benefits ?? []) {
    const i = c.benefits.findIndex((b) => b.tag === bp.tag)
    if (i < 0) { console.log(`no benefit ${bp.tag} on ${p.id}`); continue }
    if (bp.remove) { c.benefits.splice(i, 1); changed++; continue }
    if (bp.set) {
      Object.assign(c.benefits[i], bp.set); changed++
      // set 값이 null인 선택 필드(note, capGroup, tiers)는 삭제로 처리
      for (const k of ['note', 'capGroup', 'tiers']) if (k in bp.set && bp.set[k] === null) delete c.benefits[i][k]
    }
  }
  for (const nb of p.addBenefits ?? []) {
    if (c.benefits.some((b) => b.tag === nb.tag)) { console.log(`dup tag ${nb.tag} on ${p.id}, skipped`); continue }
    c.benefits.push(nb); changed++
  }
  if (p.memoAppend) { c.memo = (c.memo ?? '') + p.memoAppend; notes++ }
}
fs.writeFileSync(target, JSON.stringify(cards, null, 2) + '\n')
console.log(`patches ${patches.length}, field changes ${changed}, memo notes ${notes}`)
