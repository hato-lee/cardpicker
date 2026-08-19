import type { Persona } from '../data/types'
import { RULES } from '../engine/rules'
import { won } from './format'

export interface Profile {
  persona: Persona | null
  monthlySpendMan: number | ''
  feeLimit: number | null
}

export const PERSONAS: { value: Persona; label: string; emoji: string; desc: string; effect: string }[] = [
  { value: 'meticulous', label: '꼼꼼형', emoji: '🔍', desc: '실적·한도 계산하는 게 귀찮지 않아요', effect: '복잡한 카드까지 전부 봐요 — 가장 많이 아끼는 순' },
  { value: 'moderate', label: '적당형', emoji: '👌', desc: '대충은 알고 쓰지만 매번 계산하긴 귀찮아요', effect: '선택형·조건 복잡한 카드는 빼요 — 가장 많이 아끼는 순' },
  { value: 'carefree', label: '무심형', emoji: '🤷', desc: '한 장 꽂아두고 아예 신경 끄고 싶어요', effect: '고른 영역이 한 장으로 다 되는 단순한 카드만 — 할인형 먼저' },
]
export const PERSONA_PROMPT = '하나를 골라 주세요 — 어떤 카드를 보여줄지 달라져요'

// 슬라이더는 0~20만 원까지 실제 값이고, 마지막 한 칸(20만 + step)이 '상관없음'이다
export const FEE_SLIDER = { min: 0, max: 200_000, step: 10_000 } as const
export const FEE_ANY = FEE_SLIDER.max + FEE_SLIDER.step
export const FEE_HINT = '이 금액을 넘는 카드는 안 보여줘요.'

interface PersonaProps {
  value: Profile
  onChange: (p: Profile) => void
  onNext: () => void
  /** 결과 화면에서 고치러 온 경우: 버튼이 '다시 추천 받기'가 되고 돌아가기 버튼이 생긴다 */
  editing?: boolean
  onCancel?: () => void
}

/** 1단계: 성향 하나만 */
export function StepPersona({ value, onChange, onNext, editing = false, onCancel }: PersonaProps) {
  const selected = PERSONAS.find((p) => p.value === value.persona) ?? null
  return (
    <section className="step">
      <p className="greet">반가워요 👋</p>
      <h2 id="persona-label">카드를 어떻게 쓰시는 편이에요?</h2>

      <div className="field">
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

      {editing ? (
        <div className="button-row">
          <button type="button" className="secondary" onClick={onCancel}>결과로</button>
          <button type="button" className="primary" disabled={value.persona === null} onClick={onNext}>다시 추천 받기</button>
        </div>
      ) : (
        <button className="primary" disabled={value.persona === null} onClick={onNext}>다음</button>
      )}
    </section>
  )
}

interface BudgetProps {
  value: Profile
  onChange: (p: Profile) => void
  onBack: () => void
  onSubmit: () => void
  /** 마일리지 트랙이면 버튼 문구가 달라진다 */
  mileage?: boolean
  editing?: boolean
}

/** 3단계(마지막): 한 달 사용액 + 연회비 허용치 → 추천 받기 */
export function StepBudget({ value, onChange, onBack, onSubmit, mileage = false, editing = false }: BudgetProps) {
  const sliderValue = value.feeLimit ?? FEE_ANY
  const canSubmit = value.monthlySpendMan !== '' && value.monthlySpendMan > 0
  const current = value.monthlySpendMan === '' ? 0 : value.monthlySpendMan
  const bump = (d: number) => onChange({ ...value, monthlySpendMan: Math.max(0, current + d) })

  return (
    <section className="step">
      <p className="greet">{editing ? '사용액·연회비만 고쳐요 ✎' : '마지막이에요 ✌️'}</p>
      <h2>한 달에 카드로 얼마나 쓰세요?</h2>

      <div className="field">
        <label htmlFor="spend" className="sr-only">한 달에 카드로 얼마나 쓰세요?</label>
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
          <label htmlFor="fee" className="q">연회비는 얼마까지 괜찮으세요?</label>
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

      <div className="button-row">
        <button type="button" className="secondary" onClick={onBack}>{editing ? '결과로' : '이전'}</button>
        <button type="button" className="primary" disabled={!canSubmit} onClick={onSubmit}>
          {editing ? '다시 추천 받기' : mileage ? '마일리지 카드 추천 받기' : '추천 받기'}
        </button>
      </div>
    </section>
  )
}
