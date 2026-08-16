import type { Tag } from './tags'

export type Persona = 'meticulous' | 'moderate' | 'carefree'
export type BenefitType = 'discount' | 'points' | 'mileage'
export type Stars = 1 | 2 | 3
export type Complexity = 1 | 2 | 3

export interface Benefit {
  tag: Tag
  type: BenefitType
  rate: number            // 퍼센트. 마일리지는 "1,000원당 1마일" = 0.1
  // 월 한도. type이 'mileage'면 '마일' 단위(월 최대 적립 마일), 그 밖(discount/points)은 '원'. 한도 없으면 null
  monthlyCap: number | null
  stars: Stars
  note?: string
}

export interface Universal {
  type: BenefitType
  rate: number
  monthlyCap: number | null  // Benefit.monthlyCap와 같은 단위 규칙 (mileage면 마일, 그 밖은 원)
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
  status: 'active' | 'discontinued'
  memo?: string
}

export interface Query {
  persona: Persona
  monthlySpend: number    // 원
  feeLimit: number | null // 원. null = 상관없음
  tags: Tag[]
}
