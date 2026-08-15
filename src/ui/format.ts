/** 원 → "1.3만 원" / "30만 원" / "0원" */
export function won(n: number): string {
  if (n === 0) return '0원'
  if (n < 10_000) return `${n.toLocaleString('ko-KR')}원`
  const man = n / 10_000
  const s = Number.isInteger(man) ? String(man) : man.toFixed(1).replace(/\.0$/, '')
  return `${s}만 원`
}
