const VALID_GAMES = ['snake', 'racer', 'blockdrop'];
const MAX_ENTRIES = 10;
const MAX_SCORE = 9999999;
const MAX_NAME = 20;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function sanitizeName(raw) {
  return String(raw || 'Anonymous')
    .trim()
    .slice(0, MAX_NAME)
    .replace(/[<>&"']/g, '');
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  const url = new URL(request.url);
  const game = url.searchParams.get('game');

  // GET /api/leaderboard?game=snake
  if (request.method === 'GET') {
    if (!VALID_GAMES.includes(game)) return json({ error: 'Invalid game' }, 400);
    const raw = await env.LEADERBOARD.get('lb:' + game);
    const entries = raw ? JSON.parse(raw) : [];
    return json({ entries });
  }

  // POST /api/leaderboard  body: { game, name, score }
  if (request.method === 'POST') {
    let body;
    try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

    const { game: g, name, score } = body;
    if (!VALID_GAMES.includes(g)) return json({ error: 'Invalid game' }, 400);

    const s = Number(score);
    if (!Number.isFinite(s) || s < 1 || s > MAX_SCORE) return json({ error: 'Invalid score' }, 400);

    const safeName = sanitizeName(name) || 'Anonymous';
    const key = 'lb:' + g;

    const raw = await env.LEADERBOARD.get(key);
    let entries = raw ? JSON.parse(raw) : [];

    entries.push({ name: safeName, score: Math.floor(s) });
    entries.sort((a, b) => b.score - a.score);
    entries = entries.slice(0, MAX_ENTRIES);

    await env.LEADERBOARD.put(key, JSON.stringify(entries));
    return json({ entries });
  }

  return new Response('Method not allowed', { status: 405, headers: CORS });
}
