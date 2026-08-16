import { useState } from 'react'
import rawCards from '../data/cards.json'
import { validateCards } from '../data/schema'
import type { Query } from '../data/types'
import type { Tag } from '../data/tags'
import { recommend, type Scored } from '../engine/recommend'
import { StepProfile, type Profile } from './StepProfile'
import { StepTags } from './StepTags'
import { Results } from './Results'

const CARDS = validateCards(rawCards)

type Step = 1 | 2 | 3

export default function App() {
  const [step, setStep] = useState<Step>(1)
  const [profile, setProfile] = useState<Profile>({ persona: null, monthlySpendMan: '', feeLimit: 30_000 })
  const [tags, setTags] = useState<Tag[]>([])
  const [query, setQuery] = useState<Query | null>(null)
  const [results, setResults] = useState<Scored[]>([])

  const submit = () => {
    if (profile.persona === null || profile.monthlySpendMan === '') return
    const q: Query = {
      persona: profile.persona,
      monthlySpend: profile.monthlySpendMan * 10_000,
      feeLimit: profile.feeLimit,
      tags,
    }
    setQuery(q)
    setResults(recommend(CARDS, q))
    setStep(3)
  }

  const today = new Date()

  return (
    <main className="app">
      <h1>카드픽</h1>
      {step === 1 && <StepProfile value={profile} onChange={setProfile} onNext={() => setStep(2)} />}
      {step === 2 && <StepTags value={tags} onChange={setTags} onBack={() => setStep(1)} onSubmit={submit} />}
      {step === 3 && query && <Results query={query} results={results} onEdit={() => setStep(1)} today={today} />}
    </main>
  )
}
