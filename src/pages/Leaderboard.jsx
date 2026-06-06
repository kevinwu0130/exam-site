import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

function fmtSec(s) {
  const m = Math.floor(s / 60), sec = s % 60
  return m ? `${m}:${String(sec).padStart(2,'0')}` : `${sec}s`
}

const MEDALS = ['🥇', '🥈', '🥉']

export default function Leaderboard() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [rows, setRows]     = useState([])
  const [quiz, setQuiz]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/leaderboard/${id}`).then(r => r.json()),
      fetch(`/api/quiz/${id}`).then(r => r.json())
    ]).then(([lb, q]) => { setRows(lb); setQuiz(q); setLoading(false) })
  }, [id])

  if (loading) return <div className="center"><div className="spinner" /></div>

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">🏆 排行榜</h1>
        <p className="page-sub">{quiz?.title}</p>
      </div>
      <div className="card">
        {rows.length === 0 ? (
          <p style={{ color: 'var(--text2)', textAlign: 'center', padding: '32px 0' }}>目前還沒有成績記錄</p>
        ) : (
          rows.map((r, i) => (
            <div key={i} className="lb-row">
              <div className="lb-rank">{i < 3 ? MEDALS[i] : i + 1}</div>
              <div className="lb-name">{r.player_name}</div>
              <div className="lb-score">{r.score} / {r.total}</div>
              <div className="lb-time">{fmtSec(r.duration)}</div>
            </div>
          ))
        )}
      </div>
      <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
        <button className="btn btn-secondary" onClick={() => navigate(`/quiz/${id}`)}>參加測驗</button>
        <button className="btn btn-secondary" onClick={() => navigate('/')}>返回列表</button>
      </div>
    </div>
  )
}
