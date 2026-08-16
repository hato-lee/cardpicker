import type { Query } from '../data/types'
import type { Scored } from '../engine/recommend'
import { CardResult } from './CardResult'
import { REPORT_FORM_URL } from './config'

interface Props {
  query: Query
  results: Scored[]
  onEdit: () => void
  today: Date
}

export function Results({ query, results, onEdit, today }: Props) {
  return (
    <section className="step">
      <h2>{results.length > 0 ? `당신에게 맞는 카드 TOP ${results.length}` : '당신에게 맞는 카드'}</h2>
      {results.length === 0 ? (
        <div className="empty">
          <p>조건에 맞는 카드를 못 찾았어요.</p>
          <p className="hint">연회비 허용치를 올리거나, 태그를 바꿔보세요.</p>
        </div>
      ) : (
        results.map((s, i) => (
          <CardResult key={s.card.id} rank={i + 1} scored={s} persona={query.persona} pickedCount={query.tags.length} today={today} />
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
