import { useState, useEffect, useRef } from 'react'
import { parsePDF } from '../utils/pdfParser'

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

function EditQuizForm({ password, quizList, onSaved }) {
  const [qId, setQId]   = useState('')
  const [form, setForm] = useState({ title: '', description: '', time_limit: 0 })
  const [msg, setMsg]   = useState('')

  function selectQuiz(id) {
    setQId(id)
    setMsg('')
    if (!id) return
    const q = quizList.find(q => String(q.id) === id)
    if (q) setForm({ title: q.title, description: q.description || '', time_limit: q.time_limit ?? 0 })
  }

  async function submit(e) {
    e.preventDefault()
    if (!qId) { setMsg('請選擇測驗'); return }
    const r = await fetch(`/api/quiz/${qId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, ...form, time_limit: Number(form.time_limit) })
    })
    const data = await r.json()
    if (!r.ok) { setMsg(data.error); return }
    setMsg('✅ 更新成功！')
    onSaved?.()
  }

  return (
    <form onSubmit={submit}>
      {msg && <div className={`alert ${msg.startsWith('✅') ? 'alert-success' : 'alert-error'}`}>{msg}</div>}
      <div className="field">
        <label className="label">選擇要編輯的測驗 *</label>
        <select className="select" value={qId} onChange={e => selectQuiz(e.target.value)}>
          <option value="">-- 請選擇 --</option>
          {quizList.map(q => <option key={q.id} value={q.id}>{q.title}</option>)}
        </select>
      </div>
      {qId && <>
        <div className="field">
          <label className="label">測驗標題 *</label>
          <input className="input" required value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        </div>
        <div className="field">
          <label className="label">描述</label>
          <input className="input" value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </div>
        <div className="field">
          <label className="label">限時（秒，0 = 無限制）</label>
          <input className="input" type="number" min="0" value={form.time_limit}
            onChange={e => setForm(f => ({ ...f, time_limit: e.target.value }))} />
        </div>
        <button className="btn btn-primary" type="submit">儲存變更</button>
      </>}
    </form>
  )
}

function PdfImportForm({ password, quizList }) {
  const [qId, setQId]       = useState('')
  const [parsed, setParsed]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]        = useState('')
  const fileRef              = useRef()

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setLoading(true)
    setMsg('')
    setParsed(null)
    try {
      const buf = await file.arrayBuffer()
      const qs  = await parsePDF(buf)
      setParsed(qs)
      setMsg(`解析完成：共 ${qs.length} 道題目`)
    } catch (err) {
      setMsg('解析失敗：' + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function submit(e) {
    e.preventDefault()
    if (!qId) { setMsg('請選擇測驗'); return }
    if (!parsed?.length) { setMsg('請先上傳 PDF'); return }
    const r = await fetch('/api/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, quiz_id: Number(qId), questions: parsed })
    })
    const data = await r.json()
    if (!r.ok) { setMsg(data.error); return }
    setMsg(`✅ 匯入 ${data.inserted} 道題目`)
    setParsed(null)
    if (fileRef.current) fileRef.current.value = ''
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
        <label className="label">上傳 PDF 題庫檔案</label>
        <input ref={fileRef} type="file" accept=".pdf" className="input" onChange={handleFile} />
        <p style={{ marginTop: 6, fontSize: '.82rem', color: 'var(--text2)' }}>
          支援格式：編號 | 題目（含選項）| 答案 | 解析 的表格式 PDF
        </p>
      </div>
      {loading && <div style={{ color: 'var(--text2)', marginBottom: 12 }}>解析中，請稍候...</div>}
      {parsed && parsed.length > 0 && (
        <div className="card" style={{ background: '#f8fffe', marginBottom: 16, maxHeight: 300, overflowY: 'auto' }}>
          <strong style={{ fontSize: '.85rem' }}>預覽（前 5 題）</strong>
          {parsed.slice(0, 5).map((q, i) => (
            <div key={i} style={{ marginTop: 10, fontSize: '.82rem', borderTop: i ? '1px solid #eee' : 'none', paddingTop: i ? 8 : 0 }}>
              <div><strong>Q{i + 1}：</strong>{q.body}</div>
              <div style={{ color: 'var(--text2)' }}>
                {q.options.map((o, j) => (
                  <span key={j} style={{ marginRight: 8, fontWeight: j === q.answer ? 700 : 400 }}>
                    {String.fromCharCode(65 + j)}) {o}
                  </span>
                ))}
              </div>
              {q.explanation && <div style={{ color: '#666', marginTop: 4 }}>解析：{q.explanation.slice(0, 60)}...</div>}
            </div>
          ))}
          {parsed.length > 5 && <p style={{ color: 'var(--text2)', marginTop: 8, fontSize: '.82rem' }}>...共 {parsed.length} 題</p>}
        </div>
      )}
      <button className="btn btn-primary" type="submit" disabled={!parsed?.length || loading}>
        匯入全部 {parsed?.length ? `(${parsed.length} 題)` : ''} 題目
      </button>
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
        <div className={`tab-item${tab === 'pdf' ? ' active' : ''}`} onClick={() => setTab('pdf')}>匯入 PDF</div>
        <div className={`tab-item${tab === 'edit' ? ' active' : ''}`} onClick={() => setTab('edit')}>編輯測驗</div>
      </div>
      <div className="card">
        {tab === 'quiz'     && <QuizForm     password={password} onCreated={id => { loadQuizzes(); setLastQId(id); setTab('question') }} />}
        {tab === 'question' && <QuestionForm password={password} quizId={lastQId} quizList={quizList} onAdded={loadQuizzes} />}
        {tab === 'import'   && <ImportForm   password={password} quizList={quizList} />}
        {tab === 'pdf'      && <PdfImportForm password={password} quizList={quizList} />}
        {tab === 'edit'     && <EditQuizForm  password={password} quizList={quizList} onSaved={loadQuizzes} />}
      </div>
    </div>
  )
}
