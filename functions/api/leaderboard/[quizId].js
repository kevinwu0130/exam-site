export async function onRequestGet({ params, env }) {
  const { results } = await env.DB.prepare(
    `SELECT player_name, score, total, duration, created_at
     FROM scores WHERE quiz_id = ?
     ORDER BY score DESC, duration ASC
     LIMIT 50`
  ).bind(Number(params.quizId)).all()
  return Response.json(results)
}
