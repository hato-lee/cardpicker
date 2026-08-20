import { z } from 'zod'
import { TAGS } from './tags'
import type { Card } from './types'

const benefitType = z.enum(['discount', 'points', 'mileage'])
const oneToThree = z.union([z.literal(1), z.literal(2), z.literal(3)], { error: '1~3 중 하나여야 합니다' })

const tierSchema = z.strictObject({
  minSpend: z.number().int().min(0),
  rate: z.number().min(0).optional(),
  monthlyCap: z.number().int().min(0).nullable(),
})
const tiersSchema = z.array(tierSchema).optional()

const benefitSchema = z.strictObject({
  tag: z.enum([...TAGS]),
  type: benefitType,
  rate: z.number().min(0),
  monthlyCap: z.number().int().min(0).nullable(),
  stars: oneToThree,
  note: z.string().optional(),
  capGroup: z.string().min(1).optional(),
  tiers: tiersSchema,
})

const cardSchema = z
  .strictObject({
    id: z.string().min(1),
    name: z.string().min(1),
    issuer: z.string().min(1),
    kind: z.enum(['credit', 'check']),
    annualFee: z.number().int().min(0),
    minSpend: z.number().int().min(0),
    benefits: z.array(benefitSchema),
    universal: z
      .strictObject({
        type: benefitType,
        rate: z.number().min(0),
        monthlyCap: z.number().int().min(0).nullable(),
        tiers: tiersSchema,
      })
      .nullable(),
    complexity: oneToThree,
    officialUrl: z.url({ protocol: /^https$/, error: 'officialUrl은 https:// 로 시작해야 합니다' }),
    lastChecked: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식이어야 합니다'),
    status: z.enum(['active', 'discontinued', 'excluded']),
    memo: z.string().optional(),
    mileageBonus: z
      .strictObject({
        miles: z.number().int().min(1),
        minAnnualSpend: z.number().int().min(0),
        firstYearMinSpend: z.number().int().min(0).optional(),
      })
      .optional(),
    perks: z.array(z.string().min(1)).max(6, 'perks는 6줄까지').optional(),
    mileConversion: z.string().min(1).optional(),
    pointsProgram: z.string().min(1).optional(),
    pointsEase: z.enum(['cash', 'shop', 'limited'], { message: 'pointsEase는 cash·shop·limited 중 하나' }).optional(),
    pointsNote: z.string().min(1).optional(),
    kpass: z.literal(true).optional(),
  regional: z.literal(true).optional(),
  issueNote: z.string().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.universal !== null && !data.benefits.some((b) => b.tag === '모든 가맹점')) {
      ctx.addIssue({
        code: 'custom',
        path: ['universal'],
        message: `universal이 있으면 벤핏에 '모든 가맹점' 태그가 있어야 합니다`,
      })
    }
    const seenTags = new Set<string>()
    const dupTags = new Set<string>()
    for (const b of data.benefits) {
      if (seenTags.has(b.tag)) dupTags.add(b.tag)
      seenTags.add(b.tag)
    }
    if (dupTags.size > 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['benefits'],
        message: `중복 태그 — ${[...dupTags].join(', ')}`,
      })
    }
    const capsByGroup = new Map<string, Array<number | null>>()
    for (const b of data.benefits) {
      if (!b.capGroup) continue
      const arr = capsByGroup.get(b.capGroup) ?? []
      arr.push(b.monthlyCap)
      capsByGroup.set(b.capGroup, arr)
    }
    for (const [g, caps] of capsByGroup) {
      const allSame = caps.every((c) => c !== null && c === caps[0])
      if (!allSame) {
        ctx.addIssue({
          code: 'custom',
          path: ['benefits'],
          message: `capGroup '${g}'의 monthlyCap이 서로 다르거나 비어 있음 (${data.id})`,
        })
      }
    }
    // tiers: 오름차순 + 카드 minSpend 초과
    const allTierOwners: Array<{ where: string; tiers?: { minSpend: number; monthlyCap: number | null }[] }> = [
      ...data.benefits.map((b) => ({ where: `benefits.${b.tag}`, tiers: b.tiers })),
      ...(data.universal ? [{ where: 'universal', tiers: data.universal.tiers }] : []),
    ]
    for (const { where, tiers } of allTierOwners) {
      if (!tiers) continue
      for (let i = 0; i < tiers.length; i++) {
        if (tiers[i].minSpend <= data.minSpend) {
          ctx.addIssue({ code: 'custom', path: [where, 'tiers'], message: `tiers의 minSpend는 카드 minSpend(${data.minSpend})보다 커야 합니다 (${data.id})` })
          break
        }
        if (i > 0 && tiers[i].minSpend <= tiers[i - 1].minSpend) {
          ctx.addIssue({ code: 'custom', path: [where, 'tiers'], message: `tiers의 minSpend는 엄격히 오름차순이어야 합니다 (${data.id})` })
          break
        }
      }
    }
    // capGroup: tiers의 (minSpend, monthlyCap) 열이 같아야 한다
    const tierKey = (t?: { minSpend: number; monthlyCap: number | null }[]) => JSON.stringify((t ?? []).map((x) => [x.minSpend, x.monthlyCap]))
    const tiersByGroup = new Map<string, string[]>()
    for (const b of data.benefits) {
      if (!b.capGroup) continue
      const arr = tiersByGroup.get(b.capGroup) ?? []
      arr.push(tierKey(b.tiers))
      tiersByGroup.set(b.capGroup, arr)
    }
    for (const [g, keys] of tiersByGroup) {
      if (!keys.every((k) => k === keys[0])) {
        ctx.addIssue({ code: 'custom', path: ['benefits'], message: `capGroup '${g}'의 tiers(minSpend·monthlyCap)가 서로 다릅니다 (${data.id})` })
      }
    }
    // capGroup: tiers의 monthlyCap은 null일 수 없다 (applyCapGroups가 null을 0으로 취급해 그룹 전체를 0으로 만든다)
    for (const b of data.benefits) {
      if (!b.capGroup || !b.tiers) continue
      if (b.tiers.some((t) => t.monthlyCap === null)) {
        ctx.addIssue({ code: 'custom', path: ['benefits'], message: `capGroup '${b.capGroup}'의 tiers monthlyCap은 비어 있을 수 없습니다 (${data.id})` })
      }
    }
    // universal.tiers ↔ 모든 가맹점 벤핏 tiers (양방향: 한쪽만 있어도 실패)
    if (data.universal) {
      const uniB = data.benefits.find((b) => b.tag === '모든 가맹점')
      if (uniB && tierKey(uniB.tiers) !== tierKey(data.universal.tiers)) {
        ctx.addIssue({ code: 'custom', path: ['universal', 'tiers'], message: `universal의 tiers와 '모든 가맹점' 벤핏의 tiers(minSpend·monthlyCap)가 다릅니다 (${data.id})` })
      }
    }
  })

export function validateCards(input: unknown): Card[] {
  if (!Array.isArray(input)) throw new Error('cards.json은 배열이어야 합니다')
  const seen = new Set<string>()
  return input.map((raw, i) => {
    const r = cardSchema.safeParse(raw)
    if (!r.success) {
      const id = (raw as { id?: string })?.id ?? `#${i}`
      const first = r.error.issues[0]
      throw new Error(`카드 ${id}: ${first.path.join('.')} — ${first.message}`)
    }
    if (seen.has(r.data.id)) throw new Error(`카드 id 중복: ${r.data.id}`)
    seen.add(r.data.id)
    return r.data as Card
  })
}
