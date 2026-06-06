export async function onRequestPost({ request, env }) {
  const { password, quiz_id, questions } = await request.json()
  if (password !== env.ADMIN_PASSWORD) return Response.json({ error: '密碼錯誤' }, { status: 401 })
  if (!quiz_id || !Array.isArray(questions) || questions.length === 0)
    return Response.json({ error: '參數錯誤' }, { status: 400 })

  const stmt = env.DB.prepare(
    'INSERT INTO questions (quiz_id, body, options, answer, explanation) VALUES (?, ?, ?, ?, ?)'
  )
  const inserts = questions.map(q =>
    stmt.bind(quiz_id, q.body, JSON.stringify(q.options), q.answer, q.explanation || '')
  )
  await env.DB.batch(inserts)
  return Response.json({ inserted: inserts.length }, { status: 201 })
}
