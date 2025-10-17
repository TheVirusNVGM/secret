export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Перенаправляем главную страницу на /app/1757350/TWITCH-PHOBIA/
    if (url.pathname === '/' || url.pathname === '') {
      return Response.redirect(url.origin + '/app/1757350/TWITCH-PHOBIA/', 301);
    }
    
    // Показываем index.html для пути /app/1757350/TWITCH-PHOBIA/
    if (url.pathname === '/app/1757350/TWITCH-PHOBIA/' || url.pathname === '/app/1757350/TWITCH-PHOBIA') {
      return env.ASSETS.fetch(new URL('/index.html', url.origin));
    }
    
    // Для всех остальных запросов используем assets
    return env.ASSETS.fetch(request);
  }
}
