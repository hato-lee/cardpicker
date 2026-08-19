import { QUICK_CATEGORIES, type QuickCategory } from './quick'

interface Props {
  onGuided: () => void
  onQuick: (c: QuickCategory) => void
  onPickTags: () => void
}

/** 첫 화면: 갈림길. 위는 질문 3개짜리 맞춤 찾기, 아래는 상황 하나 골라 바로 보기 */
export function StepHome({ onGuided, onQuick, onPickTags }: Props) {
  return (
    <section className="step">
      <p className="greet">반가워요 👋</p>
      <h2>어떻게 찾아볼까요?</h2>

      <button type="button" className="door door-guided" onClick={onGuided}>
        <span className="door-emoji" aria-hidden="true">🧭</span>
        <span className="door-text">
          <span className="door-title">나한테 맞는 카드 찾기</span>
          <span className="door-sub">질문 3개 · 1분 · 성향까지 맞춰서</span>
        </span>
        <span className="door-arrow" aria-hidden="true">→</span>
      </button>

      <div className="or-row"><span>또는 상황 하나 골라 바로 보기</span></div>

      <div className="quick-grid">
        {QUICK_CATEGORIES.map((c) => (
          <button key={c.key} type="button" className="quick-tile" onClick={() => onQuick(c)}>
            <span className="quick-emoji" aria-hidden="true">{c.emoji}</span>
            <span className="quick-label">{c.label}</span>
            <span className="quick-sub">{c.sub}</span>
          </button>
        ))}
      </div>
      <button type="button" className="link-btn quick-pick" onClick={onPickTags}>혜택 직접 골라서 바로 보기 →</button>
    </section>
  )
}
