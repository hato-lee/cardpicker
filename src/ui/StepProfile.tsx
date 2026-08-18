import type { Persona } from '../data/types'
import { RULES } from '../engine/rules'
import { won } from './format'

export interface Profile {
  persona: Persona | null
  monthlySpendMan: number | ''
  feeLimit: number | null
}

export const PERSONAS: { value: Persona; label: string; desc: string }[] = [
  { value: 'meticulous', label: '꼼꼼형', desc: '실적·한도 다 따지고 카드도 여러 장 나눠 써요 → 모든 카드를 봐요' },
  { value: 'moderate', label: '적당형', desc: '대충은 알고 쓰지만 매번 계산하진 않아요 → 선택형·조건 복잡한 카드는 빼요' },
  { value: 'carefree', label: '무심형', desc: '한 장 꽂아두고 신경 끄고 싶어요 → 복잡한 카드는 빼고, 고른 영역이 한 장으로 다 되는 카드만' },
]

export const FEE_SLIDER = { min: 0, max: 200_000, step: 10_000 } as const
export const FEE_HINT = '이 금액을 넘는 카드는 안 보여줘요. 결과의 연 혜택은 연회비를 이미 뺀 금액이에요.'

interface Props {
  value: Profile
  onChange: (p: Profile) => void
  onNext: () => void
}

export function StepProfile({ value, onChange, onNext }: Props) {
  const sliderValue = value.feeLimit ?? FEE_SLIDER.max
  const canNext = value.persona !== null && value.monthlySpendMan !== '' && value.monthlySpendMan > 0
  const current = value.monthlySpendMan === '' ? 0 : value.monthlySpendMan
  const bump = (d: number) => onChange({ ...value, monthlySpendMan: Math.max(0, current + d) })

  return (
    <section className="step">
      <h2>나에 대해</h2>

      <fieldset className="field">
        <legend>나는 어떤 사람?</legend>
        <div className="persona-list">
          {PERSONAS.map((p) => (
            <label key={p.value} className={`persona ${value.persona === p.value ? 'is-selected' : ''}`}>
              <input
                type="radio"
                name="persona"
                value={p.value}
                checked={value.persona === p.value}
                onChange={() => onChange({ ...value, persona: p.value })}
              />
              <span className="persona-label">{p.label}</span>
              <span className="persona-desc">{p.desc}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="field">
        <label htmlFor="spend">한 달 카드 사용액</label>
        <div className="presets">
          {RULES.spendPresetsMan.map((m) => (
            <button
              key={m}
              type="button"
              className={`preset ${value.monthlySpendMan === m ? 'is-selected' : ''}`}
              aria-pressed={value.monthlySpendMan === m}
              onClick={() => onChange({ ...value, monthlySpendMan: m })}
            >
              {m}만
            </button>
          ))}
        </div>
        <div className="input-row">
          <input
            id="spend"
            type="number"
            inputMode="numeric"
            min={0}
            value={value.monthlySpendMan}
            onChange={(e) => onChange({ ...value, monthlySpendMan: e.target.value === '' ? '' : Number(e.target.value) })}
          />
          <span>만 원</span>
          <button type="button" className="step-btn" aria-label={`${RULES.spendStepMan}만 원 빼기`} disabled={current - RULES.spendStepMan < 0} onClick={() => bump(-RULES.spendStepMan)}>−{RULES.spendStepMan}</button>
          <button type="button" className="step-btn" aria-label={`${RULES.spendStepMan}만 원 더하기`} onClick={() => bump(RULES.spendStepMan)}>+{RULES.spendStepMan}</button>
        </div>
      </div>

      <div className="field">
        <label htmlFor="fee">연회비 허용치</label>
        <input
          id="fee"
          type="range"
          min={FEE_SLIDER.min}
          max={FEE_SLIDER.max}
          step={FEE_SLIDER.step}
          value={sliderValue}
          onChange={(e) => {
            const v = Number(e.target.value)
            onChange({ ...value, feeLimit: v >= FEE_SLIDER.max ? null : v })
          }}
        />
        <div className="slider-value">{value.feeLimit === null ? '상관없음' : won(value.feeLimit)}</div>
        <p className="field-hint">{FEE_HINT}</p>
      </div>

      <button className="primary" disabled={!canNext} onClick={onNext}>다음</button>
    </section>
  )
}
