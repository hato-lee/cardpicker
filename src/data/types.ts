import type { Tag } from './tags'

export type Persona = 'meticulous' | 'moderate' | 'carefree'
export type BenefitType = 'discount' | 'points' | 'mileage'
export type Stars = 1 | 2 | 3
export type Complexity = 1 | 2 | 3

// 전월 실적 구간. 기본 rate/monthlyCap은 카드 minSpend부터 적용되는 최저 구간이고, tiers에는 그 위 구간만 minSpend 오름차순으로 적는다
export interface Tier {
  minSpend: number          // 이 실적(원) 이상이면 이 구간. 카드 minSpend보다 커야 한다
  rate?: number             // 없으면 기본 rate 그대로
  monthlyCap: number | null // 이 구간의 월 한도(원, mileage면 마일). null = 한도 없음
}

export interface Benefit {
  tag: Tag
  type: BenefitType
  rate: number            // 퍼센트. 마일리지는 "1,000원당 1마일" = 0.1
  // 월 한도. type이 'mileage'면 '마일' 단위(월 최대 적립 마일), 그 밖(discount/points)은 '원'. 한도 없으면 null
  monthlyCap: number | null
  stars: Stars
  note?: string
  // 같은 카드 안에서 같은 문자열을 가진 혜택들은 월 한도를 공유한다. 각 혜택의 monthlyCap에는 그 공유 한도 금액을 그대로 적는다
  capGroup?: string
  tiers?: Tier[]
}

export interface Universal {
  type: BenefitType
  rate: number
  monthlyCap: number | null  // Benefit.monthlyCap와 같은 단위 규칙 (mileage면 마일, 그 밖은 원)
  tiers?: Tier[]
}

export interface Card {
  id: string
  name: string
  issuer: string
  kind: 'credit' | 'check'
  annualFee: number       // 원. 브랜드별로 다르면 가장 낮은 값
  minSpend: number        // 원. 전월 실적. 없으면 0
  benefits: Benefit[]
  universal: Universal | null
  complexity: Complexity
  officialUrl: string
  lastChecked: string     // YYYY-MM-DD
  status: 'active' | 'discontinued' | 'excluded'  // excluded = 판매 중이지만 추천에서 뺀 카드(사유는 memo에)
  memo?: string
}

export interface Query {
  persona: Persona
  monthlySpend: number    // 원
  feeLimit: number | null // 원. null = 상관없음
  tags: Tag[]
}
