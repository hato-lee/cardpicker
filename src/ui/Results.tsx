import type { Query, Persona } from '../data/types'
import type { Tag } from '../data/tags'
import type { Scored } from '../engine/recommend'
import { isMileageQuery, type MileageResults, type MileScored } from '../engine/mileage'
import { MileResult, mileLeadText } from './MileResult'
import { PERSONA_LABEL } from '../engine/explain'
import { CardResult } from './CardResult'
import { REPORT_FORM_URL } from './config'
import { won } from './format'

interface Props {
  query: Query
  results: Scored[]
  /** 무심형인데 다 커버하는 카드가 없어서 커버 많은 순으로 푼 결과 */
  relaxed?: boolean
  mileResults?: MileageResults
  /** 어느 부분을 고치러 갈지. 칩을 누르면 그 부분으로, 맨 아래 버튼은 혜택/처음부터 */
  onEdit: (part: EditPart) => void
  today: Date
}

/** 결과 제목 아래 한 줄 — 1단계 성향 설명의 '→ 효과'와 같은 말 */
export const PERSONA_ECHO: Record<Persona, string> = {
  meticulous: '복잡한 카드까지 전부 봤어요 · 가장 많이 아끼는 순',
  moderate: '복잡한 카드는 뺐어요 · 가장 많이 아끼는 순',
  carefree: '한 장으로 다 되는 단순한 카드만 · 할인형 먼저',
}
export type EditPart = 'persona' | 'tags' | 'budget' | 'all'

/** 카드마다 붙는 비교 한 줄. 1위: "2위 OO보다 1년에 N 더 아껴요" / 그 외: "1위 OO보다 1년에 N 적어요". 고른 영역 중 안 되는 게 있으면 덧붙인다 */
export function leadText(results: Scored[], i: number, tags: Tag[] = []): string {
  const me = results[i]
  const parts: string[] = []
  if (i === 0) {
    if (results.length > 1) {
      const diff = me.benefit.annualNet - results[1].benefit.annualNet
      if (diff > 0) parts.push(`2위 ${results[1].card.name}보다 1년에 ${won(diff)} 더 아껴요`)
      else parts.push(`2위 ${results[1].card.name}와 금액은 같아요 — 연회비·실적이 낮아서 먼저`)
    } else {
      parts.push('조건에 맞는 카드가 이것뿐이에요')
    }
    const rows = [...me.benefit.rows].sort((a, b) => b.monthlyValue - a.monthlyValue)
    if (rows.length > 1 && me.benefit.monthlyMax > 0 && rows[0].monthlyValue / me.benefit.monthlyMax >= 0.7) {
      parts.push(`${rows[0].tag}에서 거의 다 나와요`)
    }
  } else {
    const diff = results[0].benefit.annualNet - me.benefit.annualNet
    parts.push(diff > 0 ? `1위 ${results[0].card.name}보다 1년에 ${won(diff)} 적어요` : `1위 ${results[0].card.name}와 금액은 같아요`)
  }
  const covered = new Set<string>([...me.coveredTags, ...me.universalCovers])
  const missing = tags.filter((t) => !covered.has(t))
  if (missing.length > 0) parts.push(`${missing.join('·')} 혜택은 없어요`)
  return parts.join(' · ')
}

export const RELAXED_NOTE = '고른 영역을 한 장으로 다 되는 카드가 없어서, 가장 많이 되는 카드부터 보여줘요.'

export function Results({ query, results, relaxed = false, mileResults = { top: [], lightPick: null }, onEdit, today }: Props) {
  const mileage = isMileageQuery(query)
  // 칩을 누르면 그 조건을 고치는 화면으로 바로 간다 (나머지 조건은 그대로)
  const chips: { label: string; part: EditPart }[] = [
    { label: PERSONA_LABEL[query.persona], part: 'persona' },
    { label: `월 ${won(query.monthlySpend)}`, part: 'budget' },
    { label: query.feeLimit === null ? '연회비 상관없음' : `연회비 ${won(query.feeLimit)}까지`, part: 'budget' },
    ...query.tags.map((t) => ({ label: t, part: 'tags' as EditPart })),
  ]
  const summary = (
    <div className="summary">
      <ul className="chips" aria-label="내 조건 (누르면 바꿀 수 있어요)">
        {chips.map((c) => (
          <li key={c.label}>
            <button type="button" className="chip chip-btn" onClick={() => onEdit(c.part)} title="이 조건 바꾸기">{c.label} ✎</button>
          </li>
        ))}
      </ul>
    </div>
  )
  const footer = (
    <div className="button-row">
      <button type="button" className="secondary" onClick={() => onEdit('all')}>처음부터</button>
      <button type="button" className="primary" onClick={() => onEdit('tags')}>혜택 바꾸기</button>
    </div>
  )
  if (mileage) {
    return (
      <section className="step">
        {summary}
        {mileResults.top.length === 0 ? (
          <MileEmpty />
        ) : (
          <>
            <h2>이런 마일리지 카드가 잘 맞겠어요</h2>
            <p className="hint">가장 많이 쌓이는 순 · TOP {mileResults.top.length}</p>
            {mileResults.top.map((s, i) => (
              <MileResult key={s.card.id} rank={i + 1} scored={s} monthlySpend={query.monthlySpend} today={today}
                lead={mileLeadText(mileResults.top, i)} compact={i > 0} maxMiles={mileResults.top[0].annualMiles} />
            ))}
            {mileResults.lightPick && <LightPick pick={mileResults.lightPick} top={mileResults.top} />}
          </>
        )}
        {footer}
      </section>
    )
  }
  return (
    <section className="step">
      {summary}
      <h2>{results.length > 0 ? '이런 카드가 잘 맞겠어요' : '조건에 맞는 카드를 못 찾았어요'}</h2>
      {results.length > 0 && <p className="hint">{PERSONA_ECHO[query.persona]} · TOP {results.length}</p>}
      {relaxed && results.length > 0 && <p className="hint">{RELAXED_NOTE}</p>}
      {results.length === 0 ? (
        <div className="empty">
          <p>연회비를 올리거나 혜택을 바꿔보세요.</p>
        </div>
      ) : (
        results.map((s, i) => (
          <CardResult
            key={s.card.id}
            rank={i + 1}
            scored={s}
            persona={query.persona}
            today={today}
            pickedTags={query.tags}
            lead={leadText(results, i, query.tags)}
            compact={i > 0}
            maxNet={results[0].benefit.annualNet}
            monthlySpend={query.monthlySpend}
          />
        ))
      )}
      {footer}
      {/* 제보 폼 주소를 아직 안 넣었으면(자리표시자) 링크를 숨긴다 */}
      {!REPORT_FORM_URL.includes('REPLACE_ME') && (
        <p className="report">
          정보가 틀렸나요? <a href={REPORT_FORM_URL} target="_blank" rel="noopener noreferrer">제보하기</a>
        </p>
      )}
    </section>
  )
}

function MileEmpty() {
  return (
    <>
      <h2>조건에 맞는 마일리지 카드를 못 찾았어요</h2>
      <div className="empty">
        <p>연회비를 올려보세요.</p>
      </div>
    </>
  )
}

/** 1위가 비싼 카드일 때, 연회비 가벼운 카드 중 1등을 한 줄로 귀띔 */
function LightPick({ pick, top }: { pick: MileScored; top: MileScored[] }) {
  const rank = top.findIndex((r) => r.card.id === pick.card.id) + 1
  const fee = pick.card.annualFee === 0 ? '연회비 없음' : `연회비 ${won(pick.card.annualFee)}`
  return (
    <p className="light-pick">
      💡 연회비 부담 없이 시작하려면 →{' '}
      <strong>{rank > 0 ? `${rank}위 ` : ''}{pick.card.name}</strong>
      <span className="light-pick-sub"> · {fee} · 1년에 약 {pick.annualMiles.toLocaleString('ko-KR')}마일</span>
      {rank === 0 && (
        <> · <a href={pick.card.officialUrl} target="_blank" rel="noopener noreferrer">카드사에서 보기 →</a></>
      )}
    </p>
  )
}
