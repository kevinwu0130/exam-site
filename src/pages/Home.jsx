import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

function fmtTime(s) {
  if (!s) return '無限制'
  const m = Math.floor(s / 60)
  return m ? `${m} 分鐘` : `${s} 秒`
}

export default function Home() {
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/api/quizzes').then(r => r.json()).then(data => {
      setQuizzes(data)
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="center"><div className="spinner" /></div>

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">📝 測驗列表</h1>
        <p className="page-sub">選擇一個測驗開始作答</p>
      </div>

      {quizzes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text2)', padding: '48px' }}>
          目前沒有測驗，請至管理後台新增。
        </div>
      ) : (
        quizzes.map(q => (
          <div key={q.id} className="quiz-card" onClick={() => navigate(`/quiz/${q.id}`)}>
            <div className="quiz-icon">📋</div>
            <div className="quiz-info">
              <div className="quiz-title">{q.title}</div>
              {q.description && <div style={{ fontSize: '.88rem', color: 'var(--text2)', marginBottom: 8 }}>{q.description}</div>}
              <div className="quiz-meta">
                <span>🔢 {q.question_count} 題</span>
                <span>⏱ {fmtTime(q.time_limit)}</span>
              </div>
            </div>
            <button className="btn btn-primary btn-sm">開始</button>
          </div>
        ))
      )}
    </div>
  )
}
