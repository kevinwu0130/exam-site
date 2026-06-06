export async function onRequestPost({ request, env }) {
  const { quiz_id, player_name, score, total, duration, wrong_ids } = await request.json()
  if (!quiz_id || !player_name?.trim() || score === undefined)
    return Response.json({ error: '參數不完整' }, { status: 400 })

  const { meta } = await env.DB.prepare(
    `INSERT INTO scores (quiz_id, player_name, score, total, duration, wrong_ids)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(quiz_id, player_name.trim(), score, total, duration || 0,
         JSON.stringify(wrong_ids || [])).run()

  return Response.json({ id: meta.last_row_id }, { status: 201 })
}
