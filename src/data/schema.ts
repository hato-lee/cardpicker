import { z } from 'zod'
import { TAGS } from './tags'
import type { Card } from './types'

const benefitType = z.enum(['discount', 'points', 'mileage'])
const oneToThree = z.union([z.literal(1), z.literal(2), z.literal(3)], { error: '1~3 중 하나여야 합니다' })

const tierSchema = z.strictObject({
  minSpend: z.number().int().min(0),
  rate: z.number().min(0).optional(),
  monthlyCap: z.number().int().min(0).nullable(),
  maxUsesPerMonth: z.number().int().min(1).optional(),
  perUseCap: z.number().int().min(1).optional(),
})
const tiersSchema = z.array(tierSchema).optional()

/** 건당 조건. minPerTx는 '카드사 승인 매출 1건' 금액이다 — 월 합산 청구액·전월 실적에는 쓰지 않는다 */
const perTxFields = {
  minPerTx: z.number().int().min(1).optional(),
  maxUsesPerMonth: z.number().int().min(1).optional(),
  perUseCap: z.number().int().min(1).optional(),
  useGroup: z.string().min(1).optional(),
}

const benefitSchema = z.strictObject({
  tag: z.enum([...TAGS]),
  type: benefitType,
  rate: z.number().min(0),
  monthlyCap: z.number().int().min(0).nullable(),
  stars: oneToThree,
  note: z.string().optional(),
  capGroup: z.string().min(1).optional(),
  sharedCapGroup: z.string().min(1).optional(),
  tiers: tiersSchema,
  ...perTxFields,
})

const sharedCapSchema = z.strictObject({
  monthlyCap: z.number().int().min(1),
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
    sharedCaps: z.record(z.string().min(1), sharedCapSchema).optional(),
    universal: z
      .strictObject({
        type: benefitType,
        rate: z.number().min(0),
        monthlyCap: z.number().int().min(0).nullable(),
        tiers: tiersSchema,
        ...perTxFields,
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
    // sharedCaps: 정의와 참조가 서로 맞아야 한다
    const declared = new Set(Object.keys(data.sharedCaps ?? {}))
    const usedShared = new Map<string, typeof data.benefits>()
    for (const b of data.benefits) {
      if (!b.sharedCapGroup) continue
      const arr = usedShared.get(b.sharedCapGroup) ?? []
      arr.push(b)
      usedShared.set(b.sharedCapGroup, arr)
    }
    for (const [name, members] of usedShared) {
      if (!declared.has(name)) {
        ctx.addIssue({ code: 'custom', path: ['benefits'], message: `sharedCapGroup '${name}'이 sharedCaps에 정의돼 있지 않습니다 (${data.id})` })
        continue
      }
      if (members.length < 2) {
        ctx.addIssue({ code: 'custom', path: ['sharedCaps', name], message: `sharedCapGroup '${name}'에 혜택이 하나뿐입니다 — 통합 상한이 아니라 그 혜택의 monthlyCap으로 적으세요 (${data.id})` })
      }
      if (!members.every((m) => m.type === members[0].type)) {
        ctx.addIssue({ code: 'custom', path: ['sharedCaps', name], message: `sharedCapGroup '${name}'에 type이 다른 혜택이 섞여 있습니다 — 상한의 단위(원/마일)가 모호해집니다 (${data.id})` })
      }
    }
    for (const name of declared) {
      if (!usedShared.has(name)) {
        ctx.addIssue({ code: 'custom', path: ['sharedCaps', name], message: `sharedCaps '${name}'을 쓰는 혜택이 없습니다 (${data.id})` })
      }
    }
    // tiers: 오름차순 + 카드 minSpend 초과
    const allTierOwners: Array<{ where: string; tiers?: { minSpend: number; monthlyCap: number | null }[] }> = [
      ...data.benefits.map((b) => ({ where: `benefits.${b.tag}`, tiers: b.tiers })),
      ...Object.entries(data.sharedCaps ?? {}).map(([k, v]) => ({ where: `sharedCaps.${k}`, tiers: v.tiers })),
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
      const txnKey = (x: { minPerTx?: number; maxUsesPerMonth?: number; perUseCap?: number }) =>
        JSON.stringify([x.minPerTx ?? null, x.maxUsesPerMonth ?? null, x.perUseCap ?? null])
      if (uniB && txnKey(uniB) !== txnKey(data.universal)) {
        ctx.addIssue({ code: 'custom', path: ['universal'], message: `universal과 '모든 가맹점' 벤핏의 건당 조건(minPerTx·maxUsesPerMonth·perUseCap)이 다릅니다 (${data.id})` })
      }
    }
    // 건당 조건
    for (const b of data.benefits) {
      const where = `benefits.${b.tag}`
      // 횟수 제한이 없으면 건수를 늘려 한도를 채울 수 있어 계산이 안 줄어든다 — 적어도 하나는 있어야 의미가 생긴다
      if (b.maxUsesPerMonth !== undefined && b.perUseCap === undefined && b.monthlyCap === null) {
        ctx.addIssue({ code: 'custom', path: [where], message: `maxUsesPerMonth가 있으면 perUseCap이나 monthlyCap 중 하나는 있어야 합니다 (${data.id})` })
      }
      // 1회 상한이 건당 요율로 받을 수 있는 금액보다 작으면 그 상한이 진짜 제약이다. 반대면 값을 잘못 적은 것
      if (b.perUseCap !== undefined && b.minPerTx !== undefined && b.rate > 0) {
        const byRate = (b.minPerTx * b.rate) / 100
        if (b.perUseCap > byRate + 1) {
          ctx.addIssue({ code: 'custom', path: [where], message: `perUseCap(${b.perUseCap})이 minPerTx×rate(${Math.round(byRate)})보다 큽니다 — 단위(원/마일)나 값을 확인하세요 (${data.id})` })
        }
      }
      if (b.perUseCap !== undefined && b.monthlyCap !== null && b.perUseCap > b.monthlyCap) {
        ctx.addIssue({ code: 'custom', path: [where], message: `perUseCap(${b.perUseCap})이 monthlyCap(${b.monthlyCap})보다 큽니다 (${data.id})` })
      }
      // §1의 회차 환산("3·6·9번째")은 횟수를 이미 요율에 녹여 놨다 — 여기 또 적으면 두 번 깎인다
      if (b.maxUsesPerMonth !== undefined && /번째/.test(b.note ?? '')) {
        ctx.addIssue({ code: 'custom', path: [where], message: `회차 조건('번째') 줄에는 maxUsesPerMonth를 적지 않습니다 — 요율에 이미 반영돼 있습니다 (${data.id})` })
      }
      // minPerTx는 승인 매출 1건에만. 월 합산 청구 건에 쓰면 건당 금액을 몇십 배로 잡게 된다
      if (b.minPerTx !== undefined && /합산/.test(b.note ?? '')) {
        ctx.addIssue({ code: 'custom', path: [where], message: `note에 '합산'이 있는 줄에는 minPerTx를 쓰지 않습니다 — 월 합산 조건은 요율로 환산합니다 (${data.id})` })
      }
    }
    // useGroup: 횟수를 나눠 쓰는 묶음은 2줄 이상 · 같은 type · 횟수가 같아야 한다
    const useGroups = new Map<string, typeof data.benefits>()
    for (const b of data.benefits) {
      if (!b.useGroup) continue
      const arr = useGroups.get(b.useGroup) ?? []
      arr.push(b)
      useGroups.set(b.useGroup, arr)
    }
    for (const [name, members] of useGroups) {
      if (members.length < 2) {
        ctx.addIssue({ code: 'custom', path: ['benefits'], message: `useGroup '${name}'에 혜택이 하나뿐입니다 — 그 줄의 maxUsesPerMonth로 적으세요 (${data.id})` })
      }
      if (!members.every((m) => m.type === members[0].type)) {
        ctx.addIssue({ code: 'custom', path: ['benefits'], message: `useGroup '${name}'에 type이 다른 혜택이 섞여 있습니다 (${data.id})` })
      }
      if (!members.every((m) => m.maxUsesPerMonth === members[0].maxUsesPerMonth)) {
        ctx.addIssue({ code: 'custom', path: ['benefits'], message: `useGroup '${name}'의 maxUsesPerMonth가 서로 다릅니다 (${data.id})` })
      }
      if (members[0].maxUsesPerMonth === undefined) {
        ctx.addIssue({ code: 'custom', path: ['benefits'], message: `useGroup '${name}'에 maxUsesPerMonth가 없습니다 — 나눠 쓸 횟수를 적으세요 (${data.id})` })
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
