export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT q.id, q.title, q.description, q.time_limit, q.created_at,
            COUNT(qs.id) AS question_count
     FROM quizzes q
     LEFT JOIN questions qs ON qs.quiz_id = q.id
     GROUP BY q.id ORDER BY q.created_at DESC`
  ).all()
  return Response.json(results)
}

export async function onRequestPost({ request, env }) {
  const { password, title, description, time_limit } = await request.json()
  if (password !== env.ADMIN_PASSWORD) return Response.json({ error: '密碼錯誤' }, { status: 401 })
  if (!title?.trim()) return Response.json({ error: '標題不可為空' }, { status: 400 })
  const { meta } = await env.DB.prepare(
    'INSERT INTO quizzes (title, description, time_limit) VALUES (?, ?, ?)'
  ).bind(title.trim(), description || '', time_limit || 0).run()
  return Response.json({ id: meta.last_row_id }, { status: 201 })
}
