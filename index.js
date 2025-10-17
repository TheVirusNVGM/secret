export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Перенаправляем главную страницу на /app/1757350/TWITCH-PHOBIA/
    if (url.pathname === '/' || url.pathname === '') {
      return Response.redirect(url.origin + '/app/1757350/TWITCH-PHOBIA/', 301);
    }
    
    // Показываем index.html для пути /app/1757350/TWITCH-PHOBIA/
    if (url.pathname === '/app/1757350/TWITCH-PHOBIA/' || url.pathname === '/app/1757350/TWITCH-PHOBIA') {
      // Создаём новый запрос к index.html
      const assetUrl = new URL('/index.html', url.origin);
      return fetch(assetUrl.toString());
    }
    
    // Для всех остальных запросов (ассеты) просто возвращаем
    return fetch(request);
  }
}
