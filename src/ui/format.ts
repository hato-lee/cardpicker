/** 원 → "1.3만 원" / "30만 원" / "0원" */
export function won(n: number): string {
  if (n === 0) return '0원'
  if (n < 10_000) return `${n.toLocaleString('ko-KR')}원`
  const man = n / 10_000
  const s = Number.isInteger(man) ? String(man) : man.toFixed(1).replace(/\.0$/, '')
  return `${s}만 원`
}

/** 한도 값 표기 (접두어 없이). 마일리지 한도는 '원'이 아니라 '마일' 단위다. */
export function capValueText(type: 'discount' | 'points' | 'mileage', cap: number | null): string {
  if (cap === null) return '한도 없음'
  if (type === 'mileage') return `${cap.toLocaleString('ko-KR')}마일`
  return won(cap)
}

/**
 * 혜택 요율 표기. 할인/적립은 "10% 할인", 마일리지는 "1,000원당 N마일" (N = rate * 10).
 * N이 0.5마일 단위로 안 떨어지면(예: 0.067 → 0.67마일) 카드사 표기대로 "1,500원당 1마일"로 (원 단위는 100원으로 반올림).
 */
export function rateText(type: 'discount' | 'points' | 'mileage', rate: number): string {
  // rate 0 = 정액 할인(리터당 ○원)·수수료 면제 등 %로 표현 안 되는 혜택. 세부는 note에.
  if (rate === 0) return '정액·특별 혜택'
  if (type === 'mileage') {
    const miles = Math.round(rate * 10 * 100) / 100
    if (miles * 2 !== Math.round(miles * 2)) {
      const wonPerMile = Math.round(100 / rate / 100) * 100
      return `${wonPerMile.toLocaleString('ko-KR')}원당 1마일`
    }
    return `1,000원당 ${miles}마일`
  }
  const label = type === 'discount' ? '할인' : '적립'
  // rate 100 = "할인액보다 결제액이 작으면 결제액까지만" 유형(최소 결제금액 조건이 없어 한도까지 전액).
  // "100% 할인"으로 적으면 요금 전체가 공짜인 것처럼 읽혀서 한도가 상한임을 문구로 드러낸다.
  if (rate >= 100) return `한도까지 전액 ${label}`
  return `${rate}% ${label}`
}
