import { TAGS, type Tag } from '../data/tags'
import { TAG_EMOJI } from './tagEmoji'
export { TAG_EMOJI }

export const TAG_WARN_FROM = 4
export const TAG_TIP = '여러 개 골라도 돼요 · 2~3개가 딱 좋아요'
export const TAG_WARN_TEXT = '많이 고르면 조건 많은 카드가 위로 와요 — 2~3개가 딱 좋아요'
export const MILEAGE_HINT = '항공 마일리지는 따로 추천해요. 끄면 다른 혜택을 고를 수 있어요.'
export const MILEAGE_SWITCH = '항공 마일리지 카드만 볼래요'
export const KPASS_SWITCH = 'K-패스 카드만 볼래요'
export const KPASS_HINT = 'K-패스(모두의카드) 환급 받는 카드만 봐요. 대중교통은 자동으로 들어가고, 다른 혜택도 같이 고를 수 있어요.'
const MILEAGE: Tag = '마일리지'
export const TRANSIT: Tag = '대중교통·택시'

const UNIVERSAL: Tag = '모든 가맹점'
const GRID_TAGS = TAGS.filter((t) => t !== MILEAGE && t !== UNIVERSAL)

interface Props {
  value: Tag[]
  onChange: (tags: Tag[]) => void
  onBack: () => void
  onNext: () => void
  /** 결과 화면에서 혜택만 고치러 온 경우 */
  editing?: boolean
  /** K-패스 트랙 스위치. 켜면 '대중교통·택시'가 자동으로 들어가고 마일리지는 꺼진다 */
  kpass?: boolean
  onKpassChange?: (on: boolean) => void
}

export function StepTags({ value, onChange, onBack, onNext, editing = false, kpass = false, onKpassChange }: Props) {
  // '마일리지'는 배타적: 켜면 다른 태그를 다 끄고, 다른 태그를 켜면 마일리지를 끈다 (마일리지 전용 트랙)
  const toggle = (t: Tag) => {
    if (value.includes(t)) return onChange(value.filter((x) => x !== t))
    if (t === MILEAGE) { onKpassChange?.(false); return onChange([MILEAGE]) }
    onChange([...value.filter((x) => x !== MILEAGE), t])
  }
  const toggleKpass = () => {
    if (kpass) { onKpassChange?.(false); return }
    onKpassChange?.(true)
    // 대중교통은 자동 포함, 마일리지는 끔
    const rest = value.filter((x) => x !== MILEAGE && x !== TRANSIT)
    onChange([TRANSIT, ...rest])
  }
  const mileageMode = value.includes(MILEAGE)
  const count = value.length
  const tip = mileageMode ? null : count >= TAG_WARN_FROM ? TAG_WARN_TEXT : TAG_TIP

  return (
    <section className="step">
      <h2>어떤 혜택이 중요하세요?</h2>
      {tip && <p className={`hint ${count >= TAG_WARN_FROM ? 'is-warn' : ''}`}>{tip}</p>}
      {mileageMode && <p className="hint">{MILEAGE_HINT}</p>}
      {kpass && <p className="hint">{KPASS_HINT}</p>}
      <div className={`tag-grid ${mileageMode ? 'is-dimmed' : ''}`}>
        {[UNIVERSAL, ...GRID_TAGS].map((t) => {
          const on = value.includes(t)
          return (
            <button
              key={t}
              type="button"
              className={`tag ${on ? 'is-selected' : ''} ${t === UNIVERSAL ? 'is-wide' : ''}`}
              aria-pressed={on}
              disabled={mileageMode || (kpass && t === TRANSIT)}
              title={kpass && t === TRANSIT ? 'K-패스 카드만 볼 때는 항상 들어가요' : undefined}
              onClick={() => toggle(t)}
            >
              <span className="tag-emoji" aria-hidden="true">{TAG_EMOJI[t]}</span>
              <span className="tag-text">{t}{t === UNIVERSAL && <span className="tag-sub"> — 어디서 쓰든 기본 적립·할인</span>}{kpass && t === TRANSIT && <span className="tag-sub"> — 자동</span>}</span>
              {on && <span className="tag-check" aria-hidden="true">✓</span>}
            </button>
          )
        })}
      </div>
      <button
        type="button"
        className={`mile-switch ${mileageMode ? 'is-selected' : ''}`}
        aria-pressed={mileageMode}
        onClick={() => toggle(MILEAGE)}
      >
        <span className="tag-emoji" aria-hidden="true">{TAG_EMOJI[MILEAGE]}</span>
        <span className="tag-text">{MILEAGE_SWITCH}</span>
        <span className="switch-knob" aria-hidden="true" />
      </button>
      {onKpassChange && (
        <button
          type="button"
          className={`mile-switch ${kpass ? 'is-selected' : ''}`}
          aria-pressed={kpass}
          onClick={toggleKpass}
        >
          <span className="tag-emoji" aria-hidden="true">🎫</span>
          <span className="tag-text">{KPASS_SWITCH}</span>
          <span className="switch-knob" aria-hidden="true" />
        </button>
      )}
      <div className="button-row">
        <button type="button" className="secondary" onClick={onBack}>{editing ? '결과로' : '이전'}</button>
        <button type="button" className="primary" disabled={count === 0} onClick={onNext}>
          {editing ? '다시 추천 받기' : mileageMode ? '다음' : `다음${count > 0 ? ` (${count}개)` : ''}`}
        </button>
      </div>
    </section>
  )
}
