import type { Tag } from './tags'

export type Persona = 'meticulous' | 'moderate' | 'carefree'
export type PointsEase = 'cash' | 'shop' | 'limited'
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
  /**
   * 영역별 한도(이 혜택의 monthlyCap) 위에 또 걸리는 통합 상한의 이름. card.sharedCaps에 그 금액을 적는다.
   * capGroup과 다르다 — capGroup은 여러 줄이 한도 '하나'를 나눠 쓰는 구조이고,
   * 이건 줄마다 제 한도가 따로 있으면서 합계에만 천장이 걸리는 구조다("영역별 5천원, 단 전체 통합 2만원").
   */
  sharedCapGroup?: string
  tiers?: Tier[]
}

/** 여러 혜택의 합계에 걸리는 통합 월 상한. 단위는 묶인 혜택의 type을 따른다(mileage면 마일) */
export interface SharedCap {
  monthlyCap: number
  tiers?: Tier[]
}

export interface Universal {
  type: BenefitType
  rate: number
  monthlyCap: number | null  // Benefit.monthlyCap와 같은 단위 규칙 (mileage면 마일, 그 밖은 원)
  tiers?: Tier[]
}

// 연간 보너스 마일 (연 1회). 첫해는 firstYearMinSpend(누적), 2차년도부터는 전년도 이용액 minAnnualSpend 이상일 때
export interface MileageBonus {
  miles: number
  minAnnualSpend: number      // 연 이용액(원). 순위 계산은 이 조건(2차년도 이후 기준)으로
  firstYearMinSpend?: number  // 첫해 누적 이용액(원). 없으면 첫해도 minAnnualSpend
}

export interface Card {
  id: string
  name: string
  issuer: string
  kind: 'credit' | 'check'
  annualFee: number       // 원. 브랜드별로 다르면 가장 낮은 값
  minSpend: number        // 원. 전월 실적. 없으면 0
  benefits: Benefit[]
  /** 통합 상한 정의. 키는 benefits의 sharedCapGroup이 가리키는 이름 */
  sharedCaps?: Record<string, SharedCap>
  universal: Universal | null
  complexity: Complexity
  officialUrl: string
  lastChecked: string     // YYYY-MM-DD
  status: 'active' | 'discontinued' | 'excluded'  // excluded = 판매 중이지만 추천에서 뺀 카드(사유는 memo에)
  memo?: string
  mileageBonus?: MileageBonus  // 마일리지 트랙에서만 쓴다
  perks?: string[]             // 사용자에게 보여줄 부가 혜택 한 줄씩(라운지·바우처·발레파킹 등). 12개 태그 밖 혜택. 계산엔 안 쓴다
  // 포인트 전환형 마일 카드(멤버십 리워즈 → 마일 등). 있으면 화면에 '포인트 전환형' 배지 + 이 문장(환산 기준). 계산엔 안 쓴다
  mileConversion?: string
  /** 포인트 적립 카드가 쌓아주는 포인트 이름(사용자 표시). 예: 마이신한포인트, M포인트, 네이버페이 포인트 */
  pointsProgram?: string
  /** 포인트를 얼마나 쉽게 쓰는지. cash = 계좌 입금·결제대금 차감 등 현금처럼 / shop = 가맹점·몰에서 써야 함(현금 전환 손해 포함) / limited = 특정 브랜드 안에서만 */
  pointsEase?: PointsEase
  /** 포인트 사용법 한 줄(사용자 표시). 예: "계좌 입금·결제대금 차감 가능" */
  pointsNote?: string
  /** K-패스(모두의카드) 환급 대상 카드. K-패스 트랙에서 이 카드들만 후보가 된다 */
  kpass?: boolean
  /** 지방은행 발급 카드: 발급 지역·채널이 제한될 수 있어 순위를 뒤로 밀고 배지를 단다 */
  regional?: boolean
  /** 발급 조건 한 줄(사용자 표시). 유료 멤버십 필요, 특정 통장 필요, 일시 발급 중단 등. 계산엔 안 쓴다 */
  issueNote?: string
}

export type KpassGroup = 'general' | 'youth' | 'multi3' | 'low'

/** K-패스 트랙 입력. 있으면 K-패스 카드만 후보 + 환급을 큰 숫자에 더한다 */
export interface KpassInput {
  transitSpend: number   // 원, 한 달 대중교통비 (monthlySpend에 포함된 금액)
  group: KpassGroup
}

export interface Query {
  persona: Persona
  monthlySpend: number    // 원
  feeLimit: number | null // 원. null = 상관없음
  tags: Tag[]
  kpass?: KpassInput
  /** 빠른 길: 고른 태그의 절반 이상(올림)에 전용 혜택이 있는 카드만 (상황 타겟팅) */
  requireCover?: boolean
}
