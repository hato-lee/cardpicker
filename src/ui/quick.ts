import type { Tag } from '../data/tags'

/** 빠른 길(바로 보기)의 상황 카테고리 = 혜택 태그 + 사용액 + 연회비 프리셋. 성향은 안 묻고 '모든 카드·가장 많이 아끼는 순' */
export interface QuickCategory {
  key: string
  emoji: string
  label: string
  sub: string
  spendMan: number
  feeLimit: number | null
  tags: Tag[]
  /** 트랙: 마일리지는 태그만으로 결정되고, K-패스는 교통비를 한 번 더 묻는다 */
  kpass?: boolean
}

export const QUICK_CATEGORIES: QuickCategory[] = [
  { key: 'starter', emoji: '🌱', label: '사회초년생', sub: '월 80만 · 연회비 1만 원까지', spendMan: 80, feeLimit: 10_000, tags: ['대중교통·택시', '카페·편의점', '통신비·OTT'] },
  { key: 'settled', emoji: '🏃', label: '자리 잡은 직장인', sub: '월 150만 · 연회비 5만 원까지', spendMan: 150, feeLimit: 50_000, tags: ['모든 가맹점', '온라인 쇼핑', '배달·외식'] },
  { key: 'driver', emoji: '🚗', label: '차 끌고 출퇴근', sub: '월 150만 · 연회비 5만 원까지', spendMan: 150, feeLimit: 50_000, tags: ['주유', '대중교통·택시', '통신비·OTT'] },
  { key: 'family', emoji: '🏠', label: '살림 챙기기', sub: '월 250만 · 연회비 5만 원까지', spendMan: 250, feeLimit: 50_000, tags: ['관리비·공과금', '병의원·약국', '학원·교육', '온라인 쇼핑'] },
  { key: 'travel', emoji: '✈️', label: '여행·마일리지', sub: '월 200만 · 연회비 상관없음', spendMan: 200, feeLimit: null, tags: ['마일리지'] },
  { key: 'transit', emoji: '🚌', label: '대중교통 많이 타요', sub: 'K-패스 · 교통비만 물어요', spendMan: 100, feeLimit: null, tags: ['대중교통·택시'], kpass: true },
]

/** '혜택 직접 고르기'로 들어왔을 때 깔리는 기본값 */
export const QUICK_DEFAULT = { spendMan: 150, feeLimit: null as number | null }
/** 빠른 길의 성향 칩 문구 (성향을 안 물었으니 '모든 카드') */
export const QUICK_PERSONA_LABEL = '모든 카드'
