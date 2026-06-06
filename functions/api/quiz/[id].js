export async function onRequestGet({ params, env }) {
  const id = Number(params.id)
  const quiz = await env.DB.prepare('SELECT * FROM quizzes WHERE id = ?').bind(id).first()
  if (!quiz) return Response.json({ error: '找不到測驗' }, { status: 404 })

  const { results: questions } = await env.DB.prepare(
    'SELECT id, body, options, answer, explanation FROM questions WHERE quiz_id = ? ORDER BY id'
  ).bind(id).all()

  // Parse options JSON
  const qs = questions.map(q => ({ ...q, options: JSON.parse(q.options) }))
  return Response.json({ ...quiz, questions: qs })
}

export async function onRequestDelete({ params, request, env }) {
  const { password } = await request.json()
  if (password !== env.ADMIN_PASSWORD) return Response.json({ error: '密碼錯誤' }, { status: 401 })
  await env.DB.prepare('DELETE FROM quizzes WHERE id = ?').bind(Number(params.id)).run()
  return Response.json({ ok: true })
}
