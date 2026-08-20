import { useState } from 'react'
import rawCards from '../data/cards.json'
import { validateCards } from '../data/schema'
import type { Card, Query } from '../data/types'
import type { Tag } from '../data/tags'
import { recommendGeneral, type Scored } from '../engine/recommend'
import { StepPersona, StepBudget, type Profile } from './StepProfile'
import { StepTags } from './StepTags'
import { StepHome } from './StepHome'
import { QUICK_DEFAULT, type QuickCategory } from './quick'
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

// 0 = 첫 화면(갈림길), 1~3 = 맞춤 찾기 질문, 4 = 결과
type Step = 0 | 1 | 2 | 3 | 4

export default function App() {
  const [step, setStep] = useState<Step>(0)
  // 빠른 길(바로 보기)로 들어왔는지. 성향은 안 묻고 꼼꼼형(모든 카드) 기준, 칩 문구만 다르다
  const [quick, setQuick] = useState(false)
  // 빠른 길 결과 위 착지 안내 한 줄. 조건을 한 번 고치면 지운다 (더는 '깔린 기준'이 아니라서)
  const [quickNote, setQuickNote] = useState<string | null>(null)
  // 결과 화면에서 조건 하나만 고치러 온 상태. 고치고 '다시 추천 받기'면 바로 결과로
  const [editing, setEditing] = useState(false)
  const [profile, setProfile] = useState<Profile>({ persona: null, monthlySpendMan: '', feeLimit: 30_000, transitSpendMan: '', kpassGroup: 'general' })
  // K-패스 트랙 스위치 (2단계). 켜면 3단계에서 교통비를 더 묻고, 결과는 K-패스 카드만
  const [kpass, setKpass] = useState(false)
  const [tags, setTags] = useState<Tag[]>([])
  const [query, setQuery] = useState<Query | null>(null)
  const [results, setResults] = useState<Scored[]>([])
  const [relaxed, setRelaxed] = useState(false)
  const [mileResults, setMileResults] = useState<MileageResults>({ top: [], lightPick: null })

  // 빠른 길: 상황 하나 → 조건 깔고 바로 결과 (K-패스면 교통비만 한 번 묻는다)
  const startQuick = (c: QuickCategory) => {
    const p: Profile = { ...profile, persona: 'meticulous', monthlySpendMan: c.spendMan, feeLimit: c.feeLimit }
    setQuick(true); setProfile(p); setTags(c.tags); setKpass(!!c.kpass); setEditing(false)
    setQuickNote(`${c.emoji} ${c.label} 기준으로 바로 골랐어요`)
    if (c.kpass) { setStep(3); return }
    run(p, c.tags, false, true)
  }
  const startQuickTags = () => {
    setQuick(true); setKpass(false); setEditing(false)
    setQuickNote('고른 혜택으로 바로 보여드려요')
    setProfile({ ...profile, persona: 'meticulous', monthlySpendMan: QUICK_DEFAULT.spendMan, feeLimit: QUICK_DEFAULT.feeLimit })
    setStep(2)
  }
  const startGuided = () => { setQuick(false); setEditing(false); setQuickNote(null); setStep(1) }

  const run = (p: Profile, t: Tag[], withKpass: boolean, isQuick: boolean = quick) => {
    if (p.persona === null || p.monthlySpendMan === '') return
    const q: Query = {
      persona: p.persona,
      monthlySpend: p.monthlySpendMan * 10_000,
      feeLimit: p.feeLimit,
      tags: t,
    }
    if (isQuick) q.requireCover = true // 빠른 길: 상황 태그 과반에 전용 혜택이 있는 카드만
    if (withKpass && p.transitSpendMan !== '') q.kpass = { transitSpend: p.transitSpendMan * 10_000, group: p.kpassGroup }
    if (editing) setQuickNote(null) // 조건을 고쳤으면 '깔린 기준' 안내는 그만
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
  const submit = () => run(profile, tags, kpass)

  const edit = (part: EditPart) => {
    if (part === 'all') { setEditing(false); setStep(0); return }
    setEditing(true)
    setStep(part === 'persona' ? 1 : part === 'tags' ? 2 : 3)
  }
  const backToResults = () => { setEditing(false); setStep(4) }
  // 혜택만 고치던 중 K-패스를 켰는데 교통비가 아직 없으면 3단계를 거쳐야 한다
  const kpassNeedsInput = kpass && profile.transitSpendMan === ''

  const today = new Date()

  if (DATA_ERROR) {
    return (
      <main className="app">
        <h1>카드피커</h1>
        <p className="data-error">카드 데이터에 문제가 있어요: {DATA_ERROR}</p>
      </main>
    )
  }

  return (
    <main className="app">
      <div className="progress" role="progressbar" aria-label="진행" aria-valuemin={0} aria-valuemax={4} aria-valuenow={step}>
        <span style={{ width: `${(step / 4) * 100}%` }} />
      </div>
      {/* 첫 화면에서는 로고를 크게, 질문·결과 화면에서는 작게 */}
      <header className={step === 0 ? 'app-head is-home' : 'app-head'}><h1>💳 카드피커</h1></header>
      {step === 0 && <StepHome onGuided={startGuided} onQuick={startQuick} onPickTags={startQuickTags} />}
      {step === 1 && <StepPersona value={profile} onChange={setProfile} onNext={editing ? submit : () => setStep(2)} editing={editing} onCancel={backToResults} />}
      {step === 2 && <StepTags value={tags} onChange={setTags} onBack={editing ? backToResults : () => setStep(quick ? 0 : 1)} onNext={(editing || quick) && !kpassNeedsInput ? submit : () => setStep(3)} editing={editing} quick={quick && !editing} kpass={kpass} onKpassChange={setKpass} />}
      {step === 3 && <StepBudget value={profile} onChange={setProfile} onBack={editing ? backToResults : () => setStep(quick ? 0 : 2)} onSubmit={submit} mileage={tags.length === 1 && tags[0] === '마일리지'} kpass={kpass} editing={editing} onlyKpass={quick && !editing && kpass} />}
      {step === 4 && query && <Results query={query} results={results} relaxed={relaxed} mileResults={mileResults} onEdit={edit} today={today} quick={quick} note={quickNote} />}
    </main>
  )
}
