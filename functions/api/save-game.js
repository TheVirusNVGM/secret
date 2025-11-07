// API endpoint для сохранения игры
export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const gameData = await request.json();
    
    // Валидация
    if (!gameData.name || !gameData.description) {
      return new Response(JSON.stringify({ error: 'Name and description are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Генерируем ID если его нет
    if (!gameData.id) {
      gameData.id = Math.floor(1000000 + Math.random() * 9000000).toString();
    }
    
    // Генерируем slug
    if (!gameData.slug) {
      gameData.slug = gameData.name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }
    
    // Сохраняем в KV если доступно
    if (env && env.GAMES_KV) {
      await env.GAMES_KV.put(`game:${gameData.id}`, JSON.stringify(gameData));
    }
    
    // Также сохраняем список всех игр
    if (env && env.GAMES_KV) {
      const gamesList = await env.GAMES_KV.get('games:list');
      let games = gamesList ? JSON.parse(gamesList) : [];
      // Удаляем старую версию если есть
      games = games.filter(g => g.id !== gameData.id);
      games.push({ id: gameData.id, name: gameData.name, slug: gameData.slug });
      await env.GAMES_KV.put('games:list', JSON.stringify(games));
    }
    
    return new Response(JSON.stringify({
      success: true,
      game: {
        id: gameData.id,
        slug: gameData.slug,
        url: `/app/${gameData.id}/${gameData.slug}/`
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
