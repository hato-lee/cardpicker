import { useState } from 'react'
import rawCards from '../data/cards.json'
import { validateCards } from '../data/schema'
import type { Card, Query } from '../data/types'
import type { Tag } from '../data/tags'
import { recommendGeneral, type Scored } from '../engine/recommend'
import { StepPersona, StepBudget, type Profile } from './StepProfile'
import { StepTags } from './StepTags'
import { isMileageQuery, mileageResults, type MileageResults } from '../engine/mileage'
import { Results, type EditPart } from './Results'

// cards.json이 깨져도 흰 화면 대신 안내를 보여준다
let cards: Card[] = []
let dataError: string | null = null
try {
  cards = validateCards(rawCards)
} catch (e) {
  dataError = e instanceof Error ? e.message : String(e)
}
const CARDS = cards
const DATA_ERROR = dataError

type Step = 1 | 2 | 3 | 4

export default function App() {
  const [step, setStep] = useState<Step>(1)
  // 결과 화면에서 조건 하나만 고치러 온 상태. 고치고 '다시 추천 받기'면 바로 결과로
  const [editing, setEditing] = useState(false)
  const [profile, setProfile] = useState<Profile>({ persona: null, monthlySpendMan: '', feeLimit: 30_000 })
  const [tags, setTags] = useState<Tag[]>([])
  const [query, setQuery] = useState<Query | null>(null)
  const [results, setResults] = useState<Scored[]>([])
  const [relaxed, setRelaxed] = useState(false)
  const [mileResults, setMileResults] = useState<MileageResults>({ top: [], lightPick: null })

  const submit = () => {
    if (profile.persona === null || profile.monthlySpendMan === '') return
    const q: Query = {
      persona: profile.persona,
      monthlySpend: profile.monthlySpendMan * 10_000,
      feeLimit: profile.feeLimit,
      tags,
    }
    setQuery(q)
    // '마일리지'만 골랐으면 마일리지 전용 트랙(마일 단위·성향 무시), 아니면 기존 연 혜택 계산
    if (isMileageQuery(q)) { setMileResults(mileageResults(CARDS, q)); setResults([]); setRelaxed(false) }
    else {
      const r = recommendGeneral(CARDS, q)
      setResults(r.items); setRelaxed(r.relaxed); setMileResults({ top: [], lightPick: null })
    }
    setStep(4)
    setEditing(false)
  }

  const edit = (part: EditPart) => {
    if (part === 'all') { setEditing(false); setStep(1); return }
    setEditing(true)
    setStep(part === 'persona' ? 1 : part === 'tags' ? 2 : 3)
  }
  const backToResults = () => { setEditing(false); setStep(4) }

  const today = new Date()

  if (DATA_ERROR) {
    return (
      <main className="app">
        <h1>카드픽</h1>
        <p className="data-error">카드 데이터에 문제가 있어요: {DATA_ERROR}</p>
      </main>
    )
  }

  return (
    <main className="app">
      <div className="progress" role="progressbar" aria-label="진행" aria-valuemin={1} aria-valuemax={4} aria-valuenow={step}>
        <span style={{ width: `${(step / 4) * 100}%` }} />
      </div>
      <header className="app-head"><h1>카드픽</h1></header>
      {step === 1 && <StepPersona value={profile} onChange={setProfile} onNext={editing ? submit : () => setStep(2)} editing={editing} onCancel={backToResults} />}
      {step === 2 && <StepTags value={tags} onChange={setTags} onBack={editing ? backToResults : () => setStep(1)} onNext={editing ? submit : () => setStep(3)} editing={editing} />}
      {step === 3 && <StepBudget value={profile} onChange={setProfile} onBack={editing ? backToResults : () => setStep(2)} onSubmit={submit} mileage={tags.length === 1 && tags[0] === '마일리지'} editing={editing} />}
      {step === 4 && query && <Results query={query} results={results} relaxed={relaxed} mileResults={mileResults} onEdit={edit} today={today} />}
    </main>
  )
}
