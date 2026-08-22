import type { Persona, Tier } from '../data/types'
import type { AnnualBenefit, BenefitRow } from './benefit'
import { RULES, type Rules } from './rules'
import { won, rateText, capValueText } from '../ui/format'

export const PERSONA_LABEL: Record<Persona, string> = { meticulous: '꼼꼼형', moderate: '적당형', carefree: '무심형' }

/** 받침 있으면 '은', 없으면 '는' (마지막 글자가 한글이 아니면 '는') */
function eun(s: string): string {
  const c = s.charCodeAt(s.length - 1)
  const hasJong = c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0
  return hasJong ? '은' : '는'
}

/** 줄 하나의 연 혜택(성향 반영). 화면 내역·막대에 쓴다. */
export function rowAnnualValue(row: BenefitRow): number {
  return Math.round(row.monthlyValue * 12)
}

function tipOf(row: BenefitRow, rules: Rules): string {
  const main = mainTip(row, rules)
  // 정액·가정 한도·건당 조건에 걸린 줄에는 다음 구간 안내를 붙이지 않는다
  const canHint = row.rate !== 0 && !row.assumedCap && !row.txnLimited
  const hint = canHint && row.nextTier ? nextTierText(row, row.nextTier) : ''
  return hint ? `${main} ${hint}` : main
}

function mainTip(row: BenefitRow, rules: Rules): string {
  if (row.viaUniversal) return `그 외 소비는 모든 가맹점 ${rateText(row.type, row.rate)}`
  if (row.rate === 0) return `${row.tag}: ${row.note ?? '정액 혜택'}`
  if (row.assumedCap) return `${row.tag}${eun(row.tag)} 한도 정보가 없어 월 ${won(rules.assumedCapWhenUnknown)}으로 계산했어요`
  if (row.effectiveCap === null) return `${row.tag}${eun(row.tag)} 쓰는 만큼 ${rateText(row.type, row.rate)} — 한도 없음`
  const cap = capValueText(row.type, row.effectiveCap)
  // 카드가 내건 한도를 횟수 조건 때문에 다 못 채우는 줄은 그 사실을 먼저 알려준다
  if (row.txnLimited) return `${row.tag}${eun(row.tag)} 횟수 제한이 있어 월 ${cap}까지만 쌓여요 (카드가 내건 한도는 ${capValueText(row.type, row.monthlyCap!)})`
  return `${row.tag}에 월 ${won(Math.round(row.requiredSpend!))} 이상 쓰면 한도(${cap})를 꽉 채워요`
}

/**
 * "(월 사용액 70만 원부터는 한도 3만 원)" — 요율도 다르면 "… 12% 할인·한도 3만 원".
 * 지금 줄도 다음 구간도 한도가 없으면 "한도 없음"을 반복하지 않고 요율만 적는다.
 */
export function nextTierText(row: Pick<BenefitRow, 'type' | 'rate' | 'monthlyCap'>, next: Tier): string {
  const rateDiffers = next.rate !== undefined && next.rate !== row.rate
  const capChanges = !(next.monthlyCap === null && row.monthlyCap === null)
  const capText = next.monthlyCap === null ? '한도 없음' : `한도 ${capValueText(row.type, next.monthlyCap)}`
  const parts = [rateDiffers ? rateText(row.type, next.rate!) : '', capChanges ? capText : ''].filter(Boolean)
  if (parts.length === 0) return ''
  return `(월 사용액 ${won(next.minSpend)}부터는 ${parts.join('·')})`
}

/** "이렇게 쓰면 최대" 문장들. 월 혜택 큰 순, 성향별 개수 제한. */
export function tips(ab: AnnualBenefit, persona: Persona, rules: Rules = RULES): string[] {
  const sorted = [...ab.rows].sort((a, b) => b.monthlyValue - a.monthlyValue)
  const n = rules.tipCount[persona]
  const picked = Number.isFinite(n) ? sorted.slice(0, n) : sorted
  const lines = picked.map((row) => tipOf(row, rules))
  return persona === 'carefree' ? lines.map((l) => `이것만 챙기세요: ${l}`) : lines
}

export function isStale(lastChecked: string, today: Date, staleDays: number = RULES.staleDays): boolean {
  const checked = new Date(lastChecked + 'T00:00:00')
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diffDays = (todayMidnight.getTime() - checked.getTime()) / 86_400_000
  return diffDays > staleDays
}
