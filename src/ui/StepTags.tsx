import { TAGS, type Tag } from '../data/tags'

export const TAG_WARN_FROM = 4
export const TAG_WARN_TEXT = '많이 고르면 추천이 흐려져요. 2~3개가 딱 좋아요.'

interface Props {
  value: Tag[]
  onChange: (tags: Tag[]) => void
  onBack: () => void
  onSubmit: () => void
}

export function StepTags({ value, onChange, onBack, onSubmit }: Props) {
  const toggle = (t: Tag) =>
    onChange(value.includes(t) ? value.filter((x) => x !== t) : [...value, t])

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
            onClick={() => toggle(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {value.length >= TAG_WARN_FROM && <p className="warn">{TAG_WARN_TEXT}</p>}
      <div className="button-row">
        <button type="button" className="secondary" onClick={onBack}>이전</button>
        <button type="button" className="primary" disabled={value.length === 0} onClick={onSubmit}>추천 받기</button>
      </div>
    </section>
  )
}
