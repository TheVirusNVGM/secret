export default {
  async fetch(request) {
    const url = new URL(request.url);
    
    // Перенаправляем главную страницу на /app/1757350/TWITCH-PHOBIA/
    if (url.pathname === '/') {
      return Response.redirect(url.origin + '/app/1757350/TWITCH-PHOBIA/', 301);
    }
    
    // Показываем index.html для пути /app/1757350/TWITCH-PHOBIA/
    if (url.pathname.startsWith('/app/1757350/TWITCH-PHOBIA')) {
      // Читаем index.html как текст и возвращаем
      const indexHtml = await fetch(new URL('/index.html', url.origin));
      return new Response(await indexHtml.text(), {
        headers: { 'content-type': 'text/html;charset=UTF-8' }
      });
    }
    
    // Для всех остальных запросов (ассеты)
    return fetch(request);
  }
}
