import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

const LETTERS = ['A', 'B', 'C', 'D', 'E']

export default function Quiz() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [quiz, setQuiz]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState({})   // { qId: chosenIndex }
  const [elapsed, setElapsed] = useState(0)
  const [name, setName]       = useState('')
  const [phase, setPhase]     = useState('name') // name | quiz | done
  const timerRef = useRef(null)
  const startRef = useRef(0)

  useEffect(() => {
    fetch(`/api/quiz/${id}`).then(r => r.json()).then(data => {
      setQuiz(data)
      setLoading(false)
    })
    return () => clearInterval(timerRef.current)
  }, [id])

  function startQuiz() {
    if (!name.trim()) return
    startRef.current = Date.now()
    timerRef.current = setInterval(() => {
      const e = Math.floor((Date.now() - startRef.current) / 1000)
      setElapsed(e)
      // Time's up
      if (quiz.time_limit && e >= quiz.time_limit) submitQuiz(e)
    }, 500)
    setPhase('quiz')
  }

  function choose(qId, idx) {
    if (phase !== 'quiz') return
    setAnswers(a => ({ ...a, [qId]: idx }))
  }

  function submitQuiz(forcedElapsed) {
    clearInterval(timerRef.current)
    const duration = forcedElapsed ?? Math.floor((Date.now() - startRef.current) / 1000)
    const qs = quiz.questions
    let score = 0
    const wrongIds = []
    qs.forEach(q => {
      if (answers[q.id] === q.answer) score++
      else wrongIds.push(q.id)
    })
    // Save score
    fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quiz_id: Number(id), player_name: name, score, total: qs.length, duration, wrong_ids: wrongIds })
    })
    navigate('/result', { state: { quiz, answers, score, duration, name, wrongIds } })
  }

  if (loading) return <div className="center"><div className="spinner" /></div>
  if (!quiz) return <div className="container"><p>找不到測驗</p></div>

  // ── Name entry ───────────────────────────────────────────────────────────────
  if (phase === 'name') {
    return (
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">{quiz.title}</h1>
          <p className="page-sub">{quiz.description}</p>
        </div>
        <div className="card" style={{ maxWidth: 420, margin: '0 auto' }}>
          <div style={{ marginBottom: 20, fontSize: '.93rem', color: 'var(--text2)', lineHeight: 1.7 }}>
            共 <strong>{quiz.questions.length}</strong> 題
            {quiz.time_limit ? <>限時 <strong>{Math.floor(quiz.time_limit / 60)} 分鐘</strong></> : '無時間限制'}
          </div>
          <div className="field">
            <label className="label">你的名字（用於排行榜）</label>
            <input className="input" placeholder="請輸入名字" value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && startQuiz()} />
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={startQuiz} disabled={!name.trim()}>
            開始作答
          </button>
        </div>
      </div>
    )
  }

  // ── Quiz ─────────────────────────────────────────────────────────────────────
  const qs = quiz.questions
  const q  = qs[current]
  const remaining = quiz.time_limit ? quiz.time_limit - elapsed : null
  const timerClass = remaining !== null
    ? remaining <= 30 ? 'timer danger' : remaining <= 60 ? 'timer warning' : 'timer'
    : 'timer'

  function fmtSec(s) {
    const m = Math.floor(s / 60), sec = s % 60
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  }

  return (
    <div className="container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 0 16px' }}>
        <div>
          <div style={{ fontWeight: 600 }}>{quiz.title}</div>
          <div style={{ fontSize: '.85rem', color: 'var(--text2)' }}>
            第 {current + 1} / {qs.length} 題
          </div>
        </div>
        <div className={timerClass}>
          {remaining !== null ? fmtSec(Math.max(0, remaining)) : fmtSec(elapsed)}
        </div>
      </div>

      {/* Progress */}
      <div className="progress-bg" style={{ marginBottom: 24 }}>
        <div className="progress-fill" style={{ width: `${((current + 1) / qs.length) * 100}%` }} />
      </div>

      {/* Question */}
      <div className="card">
        <p style={{ fontWeight: 600, fontSize: '1.05rem', lineHeight: 1.6, marginBottom: 20 }}>
          {current + 1}. {q.body}
        </p>
        {q.options.map((opt, i) => (
          <div key={i} className={`option${answers[q.id] === i ? ' selected' : ''}`}
            onClick={() => choose(q.id, i)}>
            <span className="option-letter">{LETTERS[i]}</span>
            {opt}
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, gap: 12 }}>
        <button className="btn btn-secondary" onClick={() => setCurrent(c => c - 1)} disabled={current === 0}>
          ← 上一題
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          {current < qs.length - 1 ? (
            <button className="btn btn-primary" onClick={() => setCurrent(c => c + 1)}>
              下一題 →
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => submitQuiz()}>
              交卷 ✓
            </button>
          )}
        </div>
      </div>

      {/* Question dots */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 20 }}>
        {qs.map((qq, i) => (
          <div key={i} onClick={() => setCurrent(i)}
            style={{
              width: 28, height: 28, borderRadius: '50%', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '.75rem', fontWeight: 600,
              background: answers[qq.id] !== undefined ? 'var(--accent)' : i === current ? '#e8f0fb' : 'var(--border)',
              color: answers[qq.id] !== undefined ? '#fff' : i === current ? 'var(--accent)' : 'var(--text2)',
              border: i === current ? '2px solid var(--accent)' : '2px solid transparent'
            }}>
            {i + 1}
          </div>
        ))}
      </div>
    </div>
  )
}
