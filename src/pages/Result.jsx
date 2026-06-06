import { useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'

const LETTERS = ['A', 'B', 'C', 'D', 'E']

function fmtSec(s) {
  const m = Math.floor(s / 60), sec = s % 60
  return m ? `${m} 分 ${sec} 秒` : `${sec} 秒`
}

export default function Result() {
  const { state } = useLocation()
  const navigate  = useNavigate()
  const [tab, setTab] = useState('all') // all | wrong

  if (!state) return <div className="container"><p>請先完成測驗。</p></div>
  const { quiz, answers, score, duration, name, wrongIds } = state
  const qs = quiz.questions
  const pct = Math.round((score / qs.length) * 100)
  const display = tab === 'wrong' ? qs.filter(q => wrongIds.includes(q.id)) : qs

  function getClass(q, i) {
    if (answers[q.id] === undefined) return ''
    if (i === q.answer) return 'correct'
    if (answers[q.id] === i) return 'wrong'
    return ''
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">測驗結果</h1>
        <p className="page-sub">{name} · {quiz.title}</p>
      </div>

      {/* Score summary */}
      <div className="card" style={{ textAlign: 'center', marginBottom: 20 }}>
        <div className="score-circle" style={{ borderColor: pct >= 60 ? 'var(--success)' : 'var(--danger)' }}>
          <span className="score-num">{score}</span>
          <span className="score-deno">/ {qs.length}</span>
        </div>
        <div style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 8 }}>
          {pct >= 80 ? '🎉 優秀！' : pct >= 60 ? '👍 及格' : '😅 繼續加油'}
        </div>
        <div style={{ color: 'var(--text2)', fontSize: '.9rem', marginBottom: 20 }}>
          正確率 {pct}% · 用時 {fmtSec(duration)}
          {wrongIds.length > 0 && ` · 答錯 ${wrongIds.length} 題`}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => navigate(`/leaderboard/${quiz.id}`)}>
            🏆 排行榜
          </button>
          <button className="btn btn-secondary" onClick={() => navigate(`/quiz/${quiz.id}`)}>
            🔄 再試一次
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            返回列表
          </button>
        </div>
      </div>

      {/* Review */}
      <div className="tab-bar">
        <div className={`tab-item${tab === 'all' ? ' active' : ''}`} onClick={() => setTab('all')}>
          全部題目（{qs.length}）
        </div>
        {wrongIds.length > 0 && (
          <div className={`tab-item${tab === 'wrong' ? ' active' : ''}`} onClick={() => setTab('wrong')}>
            錯題複習（{wrongIds.length}）
          </div>
        )}
      </div>

      {display.map((q, idx) => {
        const userAns = answers[q.id]
        const isCorrect = userAns === q.answer
        return (
          <div key={q.id} className="card" style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
              <span className={`badge ${isCorrect ? 'badge-green' : 'badge-red'}`}>
                {isCorrect ? '✓ 正確' : '✗ 錯誤'}
              </span>
              <p style={{ fontWeight: 600, lineHeight: 1.6, flex: 1 }}>
                {qs.indexOf(q) + 1}. {q.body}
              </p>
            </div>
            {q.options.map((opt, i) => (
              <div key={i} className={`option ${getClass(q, i)}`} style={{ cursor: 'default' }}>
                <span className="option-letter">{LETTERS[i]}</span>
                {opt}
                {i === q.answer && <span style={{ marginLeft: 'auto', fontSize: '.78rem', color: 'var(--success)', fontWeight: 600 }}>正確答案</span>}
              </div>
            ))}
            {q.explanation && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: '#f9f9fb', borderRadius: 8, fontSize: '.88rem', color: 'var(--text2)', lineHeight: 1.6 }}>
                💡 {q.explanation}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
