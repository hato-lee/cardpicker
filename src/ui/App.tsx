import { useState } from 'react'
import rawCards from '../data/cards.json'
import { validateCards } from '../data/schema'
import type { Card, Query } from '../data/types'
import type { Tag } from '../data/tags'
import { recommendGeneral, type Scored } from '../engine/recommend'
import { StepProfile, type Profile } from './StepProfile'
import { StepTags } from './StepTags'
import { isMileageQuery, mileageGroups, type MileageGroups } from '../engine/mileage'
import { Results } from './Results'

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

type Step = 1 | 2 | 3

export default function App() {
  const [step, setStep] = useState<Step>(1)
  const [profile, setProfile] = useState<Profile>({ persona: null, monthlySpendMan: '', feeLimit: 30_000 })
  const [tags, setTags] = useState<Tag[]>([])
  const [query, setQuery] = useState<Query | null>(null)
  const [results, setResults] = useState<Scored[]>([])
  const [relaxed, setRelaxed] = useState(false)
  const [mileResults, setMileResults] = useState<MileageGroups>({ grouped: false, all: [] })

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
    if (isMileageQuery(q)) { setMileResults(mileageGroups(CARDS, q)); setResults([]); setRelaxed(false) }
    else {
      const r = recommendGeneral(CARDS, q)
      setResults(r.items); setRelaxed(r.relaxed); setMileResults({ grouped: false, all: [] })
    }
    setStep(3)
  }

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
      <header className="app-head"><h1>카드픽</h1><p className="tagline">내 씀씀이에 맞는 카드 찾기</p></header>
      {step === 1 && <StepProfile value={profile} onChange={setProfile} onNext={() => setStep(2)} />}
      {step === 2 && <StepTags value={tags} onChange={setTags} onBack={() => setStep(1)} onSubmit={submit} />}
      {step === 3 && query && <Results query={query} results={results} relaxed={relaxed} mileResults={mileResults} onEdit={() => setStep(1)} today={today} />}
    </main>
  )
}
