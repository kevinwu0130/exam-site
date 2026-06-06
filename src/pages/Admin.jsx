import { useState, useEffect } from 'react'

const EMPTY_Q = { body: '', options: ['', '', '', ''], answer: 0, explanation: '' }

function QuizForm({ password, onCreated }) {
  const [form, setForm] = useState({ title: '', description: '', time_limit: 0 })
  const [msg, setMsg]   = useState('')

  async function submit(e) {
    e.preventDefault()
    const r = await fetch('/api/quizzes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, password, time_limit: Number(form.time_limit) })
    })
    const data = await r.json()
    if (!r.ok) { setMsg(data.error); return }
    setMsg('✅ 測驗建立成功！')
    onCreated(data.id)
    setForm({ title: '', description: '', time_limit: 0 })
  }

  return (
    <form onSubmit={submit}>
      {msg && <div className={`alert ${msg.startsWith('✅') ? 'alert-success' : 'alert-error'}`}>{msg}</div>}
      <div className="field">
        <label className="label">測驗標題 *</label>
        <input className="input" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
      </div>
      <div className="field">
        <label className="label">描述</label>
        <input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      </div>
      <div className="field">
        <label className="label">限時（秒，0 = 無限制）</label>
        <input className="input" type="number" min="0" value={form.time_limit}
          onChange={e => setForm(f => ({ ...f, time_limit: e.target.value }))} />
      </div>
      <button className="btn btn-primary" type="submit">建立測驗</button>
    </form>
  )
}

function QuestionForm({ password, quizId, quizList, onAdded }) {
  const [qId, setQId]     = useState(quizId || '')
  const [questions, setQs] = useState([{ ...EMPTY_Q, options: ['', '', '', ''] }])
  const [msg, setMsg]      = useState('')

  useEffect(() => { if (quizId) setQId(quizId) }, [quizId])

  function addRow() { setQs(q => [...q, { ...EMPTY_Q, options: ['', '', '', ''] }]) }
  function removeRow(i) { setQs(q => q.filter((_, j) => j !== i)) }
  function setQ(i, field, val) { setQs(q => q.map((r, j) => j === i ? { ...r, [field]: val } : r)) }
  function setOpt(qi, oi, val) {
    setQs(q => q.map((r, j) => {
      if (j !== qi) return r
      const opts = [...r.options]; opts[oi] = val; return { ...r, options: opts }
    }))
  }

  async function submit(e) {
    e.preventDefault()
    if (!qId) { setMsg('請選擇測驗'); return }
    const payload = questions.map(q => ({
      body: q.body,
      options: q.options.filter(o => o.trim()),
      answer: Number(q.answer),
      explanation: q.explanation
    }))
    const r = await fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, quiz_id: Number(qId), questions: payload })
    })
    const data = await r.json()
    if (!r.ok) { setMsg(data.error); return }
    setMsg(`✅ 新增 ${data.inserted} 道題目`)
    setQs([{ ...EMPTY_Q, options: ['', '', '', ''] }])
    onAdded?.()
  }

  return (
    <form onSubmit={submit}>
      {msg && <div className={`alert ${msg.startsWith('✅') ? 'alert-success' : 'alert-error'}`}>{msg}</div>}
      <div className="field">
        <label className="label">選擇測驗 *</label>
        <select className="select" value={qId} onChange={e => setQId(e.target.value)}>
          <option value="">-- 請選擇 --</option>
          {quizList.map(q => <option key={q.id} value={q.id}>{q.title}</option>)}
        </select>
      </div>

      {questions.map((q, qi) => (
        <div key={qi} className="card" style={{ marginBottom: 16, background: '#fafafa' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <strong style={{ fontSize: '.9rem' }}>題目 {qi + 1}</strong>
            {questions.length > 1 && (
              <button type="button" className="btn btn-sm btn-danger" onClick={() => removeRow(qi)}>刪除</button>
            )}
          </div>
          <div className="field">
            <label className="label">題目內容 *</label>
            <textarea className="textarea" required style={{ minHeight: 70 }} value={q.body}
              onChange={e => setQ(qi, 'body', e.target.value)} />
          </div>
          {q.options.map((opt, oi) => (
            <div key={oi} className="field" style={{ marginBottom: 8 }}>
              <label className="label">選項 {String.fromCharCode(65 + oi)}{oi === Number(q.answer) ? ' ★ 正確答案' : ''}</label>
              <input className="input" value={opt} onChange={e => setOpt(qi, oi, e.target.value)} />
            </div>
          ))}
          <div className="field">
            <label className="label">正確答案</label>
            <select className="select" value={q.answer} onChange={e => setQ(qi, 'answer', Number(e.target.value))}>
              {q.options.map((_, oi) => <option key={oi} value={oi}>選項 {String.fromCharCode(65 + oi)}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="label">解析（選填）</label>
            <input className="input" value={q.explanation} onChange={e => setQ(qi, 'explanation', e.target.value)} />
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-secondary" onClick={addRow}>+ 再新增一題</button>
        <button type="submit" className="btn btn-primary">儲存題目</button>
      </div>
    </form>
  )
}

function ImportForm({ password, quizList }) {
  const [qId, setQId] = useState('')
  const [raw, setRaw] = useState('')
  const [msg, setMsg] = useState('')

  function parseJSON(text) {
    try { return JSON.parse(text) } catch { return null }
  }

  function parseCSV(text) {
    const lines = text.trim().split('\n').slice(1) // skip header
    return lines.map(line => {
      const parts = line.split(',').map(s => s.replace(/^"|"$/g, '').trim())
      // body, A, B, C, D, answer(0-3), explanation
      return {
        body: parts[0], options: parts.slice(1, 5).filter(Boolean),
        answer: Number(parts[5]) || 0, explanation: parts[6] || ''
      }
    })
  }

  async function submit(e) {
    e.preventDefault()
    if (!qId) { setMsg('請選擇測驗'); return }
    let questions = parseJSON(raw)
    if (!questions) questions = parseCSV(raw)
    if (!questions?.length) { setMsg('格式錯誤，請檢查 JSON 或 CSV 格式'); return }

    const r = await fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, quiz_id: Number(qId), questions })
    })
    const data = await r.json()
    if (!r.ok) { setMsg(data.error); return }
    setMsg(`✅ 匯入 ${data.inserted} 道題目`)
    setRaw('')
  }

  return (
    <form onSubmit={submit}>
      {msg && <div className={`alert ${msg.startsWith('✅') ? 'alert-success' : 'alert-error'}`}>{msg}</div>}
      <div className="field">
        <label className="label">選擇測驗 *</label>
        <select className="select" value={qId} onChange={e => setQId(e.target.value)}>
          <option value="">-- 請選擇 --</option>
          {quizList.map(q => <option key={q.id} value={q.id}>{q.title}</option>)}
        </select>
      </div>
      <div className="field">
        <label className="label">貼入 JSON 或 CSV 內容</label>
        <textarea className="textarea" style={{ minHeight: 200, fontFamily: 'monospace', fontSize: '.82rem' }}
          placeholder={`JSON 格式：\n[\n  {"body":"題目","options":["A","B","C","D"],"answer":0,"explanation":"解析"}\n]\n\nCSV 格式（含 header）：\nbody,A,B,C,D,answer,explanation\n題目,選A,選B,選C,選D,0,解析`}
          value={raw} onChange={e => setRaw(e.target.value)} />
      </div>
      <button className="btn btn-primary" type="submit">匯入題目</button>
    </form>
  )
}

export default function Admin() {
  const [password, setPassword] = useState('')
  const [authed,   setAuthed]   = useState(false)
  const [authErr,  setAuthErr]  = useState('')
  const [tab,      setTab]      = useState('quiz')
  const [quizList, setQuizList] = useState([])
  const [lastQId,  setLastQId]  = useState(null)

  function login(e) {
    e.preventDefault()
    if (!password.trim()) return
    // Verify by attempting to create a quiz with wrong title (we just test the password)
    fetch('/api/quizzes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, title: '' })
    }).then(r => r.json()).then(data => {
      if (data.error === '密碼錯誤') { setAuthErr('密碼錯誤'); return }
      setAuthed(true); loadQuizzes()
    })
  }

  function loadQuizzes() {
    fetch('/api/quizzes').then(r => r.json()).then(setQuizList)
  }

  if (!authed) {
    return (
      <div className="container">
        <div className="page-header"><h1 className="page-title">🔐 管理後台</h1></div>
        <div className="card" style={{ maxWidth: 360, margin: '0 auto' }}>
          <form onSubmit={login}>
            {authErr && <div className="alert alert-error">{authErr}</div>}
            <div className="field">
              <label className="label">管理員密碼</label>
              <input className="input" type="password" value={password}
                onChange={e => setPassword(e.target.value)} />
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} type="submit">登入</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="page-header"><h1 className="page-title">🔧 管理後台</h1></div>
      <div className="tab-bar">
        <div className={`tab-item${tab === 'quiz' ? ' active' : ''}`} onClick={() => setTab('quiz')}>建立測驗</div>
        <div className={`tab-item${tab === 'question' ? ' active' : ''}`} onClick={() => setTab('question')}>新增題目</div>
        <div className={`tab-item${tab === 'import' ? ' active' : ''}`} onClick={() => setTab('import')}>匯入 JSON/CSV</div>
      </div>
      <div className="card">
        {tab === 'quiz'     && <QuizForm     password={password} onCreated={id => { loadQuizzes(); setLastQId(id); setTab('question') }} />}
        {tab === 'question' && <QuestionForm password={password} quizId={lastQId} quizList={quizList} onAdded={loadQuizzes} />}
        {tab === 'import'   && <ImportForm   password={password} quizList={quizList} />}
      </div>
    </div>
  )
}
