import { z } from 'zod'
import { TAGS } from './tags'
import type { Card } from './types'

const benefitType = z.enum(['discount', 'points', 'mileage'])
const oneToThree = z.union([z.literal(1), z.literal(2), z.literal(3)])

const benefitSchema = z.object({
  tag: z.enum([...TAGS]),
  type: benefitType,
  rate: z.number().min(0),
  monthlyCap: z.number().int().min(0).nullable(),
  stars: oneToThree,
  note: z.string().optional(),
})

const cardSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    issuer: z.string().min(1),
    kind: z.enum(['credit', 'check']),
    annualFee: z.number().int().min(0),
    minSpend: z.number().int().min(0),
    benefits: z.array(benefitSchema),
    universal: z.object({ type: benefitType, rate: z.number().min(0), monthlyCap: z.number().int().min(0).nullable() }).nullable(),
    complexity: oneToThree,
    officialUrl: z.string().url(),
    lastChecked: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    status: z.enum(['active', 'discontinued']),
    memo: z.string().optional(),
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
