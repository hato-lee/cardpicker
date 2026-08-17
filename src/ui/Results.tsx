import type { Query } from '../data/types'
import type { Scored } from '../engine/recommend'
import { PERSONA_LABEL } from '../engine/explain'
import { CardResult } from './CardResult'
import { REPORT_FORM_URL } from './config'
import { won } from './format'

interface Props {
  query: Query
  results: Scored[]
  onEdit: () => void
  today: Date
}

export function Results({ query, results, onEdit, today }: Props) {
  const chips = [
    PERSONA_LABEL[query.persona],
    `월 ${won(query.monthlySpend)}`,
    query.feeLimit === null ? '연회비 상관없음' : `연회비 ${won(query.feeLimit)}까지`,
    ...query.tags,
  ]
  return (
    <section className="step">
      <div className="summary">
        <ul className="chips" aria-label="내 조건">
          {chips.map((c) => <li key={c} className="chip">{c}</li>)}
        </ul>
        <button type="button" className="link-btn" onClick={onEdit}>조건 바꾸기</button>
      </div>
      <h2>{results.length > 0 ? `당신에게 맞는 카드 TOP ${results.length}` : '당신에게 맞는 카드'}</h2>
      {results.length === 0 ? (
        <div className="empty">
          <p>조건에 맞는 카드를 못 찾았어요.</p>
          <p className="hint">연회비 허용치를 올리거나, 태그를 바꿔보세요.</p>
        </div>
      ) : (
        results.map((s, i) => (
          <CardResult key={s.card.id} rank={i + 1} scored={s} persona={query.persona} today={today} />
        ))
      )}
      <button type="button" className="secondary" onClick={onEdit}>조건 바꾸기</button>
      {/* 제보 폼 주소를 아직 안 넣었으면(자리표시자) 링크를 숨긴다 */}
      {!REPORT_FORM_URL.includes('REPLACE_ME') && (
        <p className="report">
          정보가 틀렸나요? <a href={REPORT_FORM_URL} target="_blank" rel="noopener noreferrer">제보하기</a>
        </p>
      )}
    </section>
  )
}
