import type { KpassGroup, Persona } from '../data/types'
import { RULES } from '../engine/rules'
import { won } from './format'

export interface Profile {
  persona: Persona | null
  monthlySpendMan: number | ''
  feeLimit: number | null
  /** K-패스 트랙에서만 묻는다: 한 달 대중교통비(만 원)·환급 그룹 */
  transitSpendMan: number | ''
  kpassGroup: KpassGroup
}

export const KPASS_GROUPS: { value: KpassGroup; label: string; short: string; rate: string }[] = [
  { value: 'general', label: '일반', short: '일반', rate: '20%' },
  { value: 'youth', label: '청년 19~34 · 65세↑ · 2자녀', short: '청년·어르신·2자녀', rate: '30%' },
  { value: 'multi3', label: '3자녀 이상', short: '3자녀↑', rate: '50%' },
  { value: 'low', label: '기초·차상위', short: '기초·차상위', rate: '53%' },
]
export const TRANSIT_Q = '그중 버스·지하철비는 얼마예요?'
export const TRANSIT_HINT = '버스·지하철·GTX 요금의 20~53%를 K-패스로 돌려받아요 (택시·KTX 제외)'
export const TRANSIT_TOO_BIG = '카드 사용액보다 클 수는 없어요'
export const KPASS_GROUP_Q = '환급 그룹은요?'


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
  /** K-패스 트랙이면 교통비·환급 그룹을 더 묻는다 */
  kpass?: boolean
  /** 빠른 길의 K-패스: 사용액·연회비는 깔려 있으니 교통비·그룹만 묻는다 */
  onlyKpass?: boolean
  editing?: boolean
}

/** 3단계(마지막): 한 달 사용액 + 연회비 허용치 → 추천 받기 */
export function StepBudget({ value, onChange, onBack, onSubmit, mileage = false, kpass = false, onlyKpass = false, editing = false }: BudgetProps) {
  const sliderValue = value.feeLimit ?? FEE_ANY
  const current = value.monthlySpendMan === '' ? 0 : value.monthlySpendMan
  const transit = value.transitSpendMan === '' ? 0 : value.transitSpendMan
  const transitTooBig = kpass && transit > current
  const canSubmit = value.monthlySpendMan !== '' && value.monthlySpendMan > 0 && (!kpass || (transit > 0 && !transitTooBig))
  const bump = (d: number) => onChange({ ...value, monthlySpendMan: Math.max(0, current + d) })

  return (
    <section className="step">
      <p className="greet">{editing ? '사용액·연회비만 고쳐요 ✎' : onlyKpass ? '딱 하나만 물을게요 🎫' : '마지막이에요 ✌️'}</p>
      <h2>{onlyKpass ? '한 달 버스·지하철비는 얼마예요?' : '한 달에 카드로 얼마나 쓰세요?'}</h2>
      {onlyKpass && <p className="hint">카드 사용액은 월 {won(current * 10_000)}, 연회비는 상관없음으로 두고 볼게요 — 결과에서 고칠 수 있어요.</p>}

      {!onlyKpass && <div className="field">
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
      </div>}

      {!onlyKpass && <div className="field">
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
      </div>}

      {kpass && (
        <section className={`kpass-box ${onlyKpass ? 'is-plain' : ''}`} aria-label="K-패스 환급 계산">
          {!onlyKpass && <div className="kpass-box-title">🎫 K-패스 환급 계산에 써요</div>}
          <div className="field">
            <label htmlFor="transit" className={onlyKpass ? 'sr-only' : 'q'}>{TRANSIT_Q}</label>
            <div className="spend-box">
              <div className="presets">
                {RULES.transitPresetsMan.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`preset ${value.transitSpendMan === m ? 'is-selected' : ''}`}
                    aria-pressed={value.transitSpendMan === m}
                    onClick={() => onChange({ ...value, transitSpendMan: m })}
                  >
                    {m}만
                  </button>
                ))}
              </div>
              <div className="input-row">
                <input
                  id="transit"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="예: 8"
                  value={value.transitSpendMan}
                  onChange={(e) => onChange({ ...value, transitSpendMan: e.target.value === '' ? '' : Number(e.target.value) })}
                />
                <span>만 원</span>
              </div>
            </div>
            <p className={`field-hint ${transitTooBig ? 'is-warn' : ''}`}>{transitTooBig ? TRANSIT_TOO_BIG : TRANSIT_HINT}</p>
          </div>
          <div className="field">
            <div className="label-row"><span className="q" id="kpass-group-label">{KPASS_GROUP_Q}</span></div>
            <div className="group-chips" role="radiogroup" aria-labelledby="kpass-group-label">
              {KPASS_GROUPS.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  role="radio"
                  aria-checked={value.kpassGroup === g.value}
                  className={`group-chip ${value.kpassGroup === g.value ? 'is-selected' : ''}`}
                  onClick={() => onChange({ ...value, kpassGroup: g.value })}
                >
                  {g.label} <span className="group-chip-rate">{g.rate}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="button-row">
        <button type="button" className="secondary" onClick={onBack}>{editing ? '결과로' : onlyKpass ? '처음으로' : '이전'}</button>
        <button type="button" className="primary" disabled={!canSubmit} onClick={onSubmit}>
          {editing ? '다시 추천 받기' : mileage ? '마일리지 카드 추천 받기' : kpass ? 'K-패스 카드 추천 받기' : '추천 받기'}
        </button>
      </div>
    </section>
  )
}
