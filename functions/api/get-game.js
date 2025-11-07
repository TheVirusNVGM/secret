// API endpoint для получения игры
export async function onRequest(context) {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const gameId = url.searchParams.get('id');
  
  if (!gameId) {
    return new Response(JSON.stringify({ error: 'Game ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Получаем из KV
  if (env && env.GAMES_KV) {
    try {
      const data = await env.GAMES_KV.get(`game:${gameId}`);
      if (data) {
        return new Response(data, {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } catch (e) {
      console.error('KV error:', e);
    }
  }
  
  // Fallback для демо
  if (gameId === '1757350') {
    return new Response(JSON.stringify({
      id: '1757350',
      name: 'TWITCH-PHOBIA',
      slug: 'twitch-phobia',
      description: 'Psychological horror about streamers trapped inside their own broadcast. Experience the terrifying reality of losing control as your stream becomes your prison.',
      developer: 'Specterworks Interactive',
      publisher: 'Specterworks Interactive',
      releaseDate: 'Oct 31, 2025',
      mainImage: 'assets/images/1.png',
      screenshots: ['assets/images/1.png', 'assets/images/2.png', 'assets/images/3.png']
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response(JSON.stringify({ error: 'Game not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}
