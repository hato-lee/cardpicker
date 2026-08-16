/** 원 → "1.3만 원" / "30만 원" / "0원" */
export function won(n: number): string {
  if (n === 0) return '0원'
  if (n < 10_000) return `${n.toLocaleString('ko-KR')}원`
  const man = n / 10_000
  const s = Number.isInteger(man) ? String(man) : man.toFixed(1).replace(/\.0$/, '')
  return `${s}만 원`
}

/** 혜택 요율 표기. 할인/적립은 "10% 할인", 마일리지는 "1,000원당 N마일" (N = rate * 10, 소수 둘째자리에서 반올림, 뒤 0 생략) */
export function rateText(type: 'discount' | 'points' | 'mileage', rate: number): string {
  // rate 0 = 정액 할인(리터당 ○원)·수수료 면제 등 %로 표현 안 되는 혜택. 세부는 note에.
  if (rate === 0) return '정액·특별 혜택'
  if (type === 'mileage') {
    const miles = Math.round(rate * 10 * 100) / 100
    return `1,000원당 ${miles}마일`
  }
  const label = type === 'discount' ? '할인' : '적립'
  return `${rate}% ${label}`
}
