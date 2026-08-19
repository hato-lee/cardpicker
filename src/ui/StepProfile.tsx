import type { Persona } from '../data/types'
import { RULES } from '../engine/rules'
import { won } from './format'

export interface Profile {
  persona: Persona | null
  monthlySpendMan: number | ''
  feeLimit: number | null
}

export const PERSONAS: { value: Persona; label: string; emoji: string; desc: string; effect: string }[] = [
  { value: 'meticulous', label: '꼼꼼형', emoji: '🔍', desc: '실적·한도 다 따지고 카드도 여러 장 나눠 써요', effect: '모든 카드를 봐요' },
  { value: 'moderate', label: '적당형', emoji: '🙂', desc: '대충은 알고 쓰지만 매번 계산하진 않아요', effect: '선택형·조건 복잡한 카드는 빼요' },
  { value: 'carefree', label: '무심형', emoji: '😌', desc: '한 장 꽂아두고 신경 끄고 싶어요', effect: '복잡한 카드는 빼고, 고른 영역이 한 장으로 다 되는 카드만' },
]
export const PERSONA_PROMPT = '하나를 골라 주세요 — 어떤 카드를 보여줄지 달라져요'

// 슬라이더는 0~20만 원까지 실제 값이고, 마지막 한 칸(20만 + step)이 '상관없음'이다
export const FEE_SLIDER = { min: 0, max: 200_000, step: 10_000 } as const
export const FEE_ANY = FEE_SLIDER.max + FEE_SLIDER.step
export const FEE_HINT = '이 금액을 넘는 카드는 안 보여줘요.'

interface Props {
  value: Profile
  onChange: (p: Profile) => void
  onNext: () => void
}

export function StepProfile({ value, onChange, onNext }: Props) {
  const sliderValue = value.feeLimit ?? FEE_ANY
  const canNext = value.persona !== null && value.monthlySpendMan !== '' && value.monthlySpendMan > 0
  const current = value.monthlySpendMan === '' ? 0 : value.monthlySpendMan
  const bump = (d: number) => onChange({ ...value, monthlySpendMan: Math.max(0, current + d) })
  const selected = PERSONAS.find((p) => p.value === value.persona) ?? null

  return (
    <section className="step">
      <h2>나에 대해 <span className="step-no">1 / 3</span></h2>

      <div className="field">
        <div className="field-label" id="persona-label">나는 어떤 사람?</div>
        <div className="persona-tiles" role="radiogroup" aria-labelledby="persona-label">
          {PERSONAS.map((p) => (
            <button
              key={p.value}
              type="button"
              role="radio"
              aria-checked={value.persona === p.value}
              className={`persona-tile ${value.persona === p.value ? 'is-selected' : ''}`}
              onClick={() => onChange({ ...value, persona: p.value })}
            >
              <span className="persona-emoji" aria-hidden="true">{p.emoji}</span>
              <span className="persona-label">{p.label}</span>
            </button>
          ))}
        </div>
        {selected ? (
          <div className="persona-explain" aria-live="polite">
            <p className="persona-desc">{selected.desc}</p>
            <p className="persona-effect">→ {selected.effect}</p>
          </div>
        ) : (
          <p className="persona-explain persona-prompt">{PERSONA_PROMPT}</p>
        )}
      </div>

      <div className="field">
        <label htmlFor="spend">한 달 카드 사용액</label>
        <div className="spend-box">
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
            placeholder="예: 80"
            value={value.monthlySpendMan}
            onChange={(e) => onChange({ ...value, monthlySpendMan: e.target.value === '' ? '' : Number(e.target.value) })}
          />
          <span>만 원</span>
          <button type="button" className="step-btn" aria-label={`${RULES.spendStepMan}만 원 빼기`} disabled={current - RULES.spendStepMan < 0} onClick={() => bump(-RULES.spendStepMan)}>−{RULES.spendStepMan}</button>
          <button type="button" className="step-btn" aria-label={`${RULES.spendStepMan}만 원 더하기`} onClick={() => bump(RULES.spendStepMan)}>+{RULES.spendStepMan}</button>
        </div>
        </div>
      </div>

      <div className="field">
        <div className="label-row">
          <label htmlFor="fee">연회비 허용치</label>
          <span className="slider-value">{value.feeLimit === null ? '상관없음' : won(value.feeLimit)}</span>
        </div>
        <input
          id="fee"
          type="range"
          min={FEE_SLIDER.min}
          max={FEE_ANY}
          step={FEE_SLIDER.step}
          value={sliderValue}
          onChange={(e) => {
            const v = Number(e.target.value)
            onChange({ ...value, feeLimit: v > FEE_SLIDER.max ? null : v })
          }}
        />
        <div className="slider-ends" aria-hidden="true"><span>0원</span><span>상관없음</span></div>
        <p className="field-hint">{FEE_HINT}</p>
      </div>

      <button className="primary" disabled={!canNext} onClick={onNext}>다음</button>
    </section>
  )
}
