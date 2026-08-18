import { TAGS, type Tag } from '../data/tags'

export const TAG_WARN_FROM = 4
export const TAG_WARN_TEXT = '많이 고를수록 한도 합이 커져서 조건 많은 카드가 위로 와요. 2~3개가 딱 좋아요.'
export const MILEAGE_HINT = '항공 마일리지는 따로 추천해요. 다른 혜택은 마일리지를 끄면 고를 수 있어요.'
const MILEAGE: Tag = '마일리지'

interface Props {
  value: Tag[]
  onChange: (tags: Tag[]) => void
  onBack: () => void
  onSubmit: () => void
}

export function StepTags({ value, onChange, onBack, onSubmit }: Props) {
  // '마일리지'는 배타적: 켜면 다른 태그를 다 끄고, 다른 태그를 켜면 마일리지를 끈다 (마일리지 전용 트랙)
  const toggle = (t: Tag) => {
    if (value.includes(t)) return onChange(value.filter((x) => x !== t))
    if (t === MILEAGE) return onChange([MILEAGE])
    onChange([...value.filter((x) => x !== MILEAGE), t])
  }
  const mileageMode = value.includes(MILEAGE)

  return (
    <section className="step">
      <h2>관심 있는 혜택</h2>
      <p className="hint">여러 개 골라도 돼요.</p>
      <div className="tag-grid">
        {TAGS.map((t) => (
          <button
            key={t}
            type="button"
            className={`tag ${value.includes(t) ? 'is-selected' : ''}`}
            aria-pressed={value.includes(t)}
            disabled={mileageMode && t !== MILEAGE}
            onClick={() => toggle(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {mileageMode && <p className="hint">{MILEAGE_HINT}</p>}
      {value.length >= TAG_WARN_FROM && <p className="warn">{TAG_WARN_TEXT}</p>}
      <div className="button-row">
        <button type="button" className="secondary" onClick={onBack}>이전</button>
        <button type="button" className="primary" disabled={value.length === 0} onClick={onSubmit}>추천 받기</button>
      </div>
    </section>
  )
}
