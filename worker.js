import { DEFAULT_TEMPLATE } from './template.js';

// Основной Worker для обработки всех запросов
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (pathname === '/' || pathname === '') {
      if (env.ASSETS) {
        const constructorUrl = new URL('/constructor.html', url.origin);
        return env.ASSETS.fetch(new Request(constructorUrl.toString()));
      }
    }
    
    // Тестовый endpoint для проверки работы worker (проверяем первым)
    if (pathname === '/test-worker' || pathname === '/test-worker/') {
      return new Response(JSON.stringify({
        message: 'Worker is working!',
        pathname: pathname,
        hasKV: !!env.GAMES_KV,
        hasAssets: !!env.ASSETS,
        url: request.url
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Обработка API запросов
    if (pathname.startsWith('/api/')) {
      if (pathname === '/api/save-game' && request.method === 'POST') {
        return handleSaveGame(request, env);
      }
      if (pathname === '/api/get-game' && request.method === 'GET') {
        return handleGetGame(request, env);
      }
    }
    
    // Обработка /app/{id}/{name}/
    if (pathname.startsWith('/app/') && pathname !== '/app') {
      // Убираем /app/ и слеш в конце
      const pathAfterApp = pathname.replace(/^\/app\//, '').replace(/\/$/, '');
      
      // Парсим путь: {id}/{name} или {id}/{name}/...
      const pathMatch = pathAfterApp.match(/^(\d+)\/(.+)$/);
      
      if (pathMatch) {
        const gameId = pathMatch[1];
        const gameSlug = pathMatch[2];
        
        // Пытаемся получить готовый HTML из KV
        if (env?.GAMES_KV) {
          try {
            const html = await env.GAMES_KV.get(`game:${gameId}:html`);
            if (html) {
              return new Response(html, {
                headers: { 
                  'Content-Type': 'text/html; charset=utf-8',
                  'Cache-Control': 'public, max-age=3600'
                },
              });
            }
          } catch (e) {
            console.error('KV get error:', e);
          }
        }
        
        // Fallback: получаем данные и генерируем HTML
        const gameData = await getGameData(gameId, env);
        
        if (!gameData) {
          return new Response(`Game not found: ${gameId}. Path: ${pathname}`, { 
            status: 404,
            headers: { 'Content-Type': 'text/html' }
          });
        }
        
        // Генерируем HTML
        const html = await generateGamePage(gameData, gameId, gameSlug, env);
        
        return new Response(html, {
          headers: { 
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=3600'
          },
        });
      } else {
        // Неправильный формат пути
        return new Response(`Invalid path format: ${pathname}. Expected: /app/{id}/{name}/`, { 
          status: 404,
          headers: { 'Content-Type': 'text/html' }
        });
      }
    }
    
    // Для всех остальных запросов обрабатываем как статические файлы
    // Если есть ASSETS binding, используем его, иначе возвращаем 404
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    
    // Если нет ASSETS, возвращаем 404
    return new Response('Not found', { status: 404 });
  }
}

async function getGameData(gameId, env) {
  if (env?.GAMES_KV) {
    try {
      const data = await env.GAMES_KV.get(`game:${gameId}`);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('KV error:', e);
    }
  }
  
  if (gameId === '1757350') {
    return {
      name: 'TWITCH-PHOBIA',
      description: 'Psychological horror about streamers trapped inside their own broadcast. Experience the terrifying reality of losing control as your stream becomes your prison.',
      developer: 'Specterworks Interactive',
      publisher: 'Specterworks Interactive',
      releaseDate: 'Oct 31, 2025',
      mainImage: '/assets/images/1.png',
      screenshots: ['/assets/images/1.png', '/assets/images/2.png', '/assets/images/3.png'],
      mainImageBase64: null,
      screenshotsBase64: []
    };
  }
  
  return null;
}

// Функция для генерации HTML страницы игры на основе оригинального шаблона
async function generateGamePage(gameData, gameId, gameSlug, env, request = null) {
  // Пытаемся загрузить оригинальный шаблон из ASSETS
  let template = null;
  if (env?.ASSETS) {
    try {
      // Пробуем разные пути
      const paths = ['/template_index.html', '/original_index.html', '/index.html'];
      for (const path of paths) {
        try {
          const baseUrl = request ? new URL(request.url) : new URL('https://store-steampowereed.ru/');
          const templateURL = new URL(path, baseUrl);
          const templateRequest = new Request(templateURL.toString());
          const templateResponse = await env.ASSETS.fetch(templateRequest);
          if (templateResponse.ok) {
            template = await templateResponse.text();
            break;
          }
        } catch (e) {
          // Пробуем следующий путь
        }
      }
    } catch (e) {
      console.error('Failed to load template:', e);
    }
  }
  
  // Если не удалось загрузить, используем встроенный шаблон
  if (!template) {
    template = DEFAULT_TEMPLATE;
  }
  
  // Заменяем нужные части в оригинальном шаблоне
  const mainImage = gameData.mainImageBase64 || gameData.mainImage || '';
  const gameName = escapeHtml(gameData.name);
  const gameDescription = escapeHtml(gameData.description);
  const developer = escapeHtml(gameData.developer || 'Unknown Developer');
  const publisher = escapeHtml(gameData.publisher || 'Unknown Publisher');
  const releaseDate = escapeHtml(gameData.releaseDate || 'To be announced');
  const screenshots = (gameData.screenshotsBase64 || gameData.screenshots || []);
  
  // Замены в шаблоне - используем более точные замены
  let html = template;
  
  // Заменяем название игры везде
  html = html.replace(/TWITCH-PHOBIA/g, gameName);
  
  // Заменяем ID игры
  html = html.replace(/1757350/g, gameId);
  
  // Заменяем изображения
  html = html.replace(/assets\/images\/1\.png/g, mainImage);
  if (screenshots.length > 0) {
    html = html.replace(/assets\/images\/2\.png/g, screenshots[0] || mainImage);
    if (screenshots.length > 1) {
      html = html.replace(/assets\/images\/3\.png/g, screenshots[1] || mainImage);
    }
  }
  
  // Заменяем описание
  const originalDescription = 'Psychological horror about streamers trapped inside their own broadcast. Experience the terrifying reality of losing control as your stream becomes your prison.';
  html = html.replace(new RegExp(escapeRegex(originalDescription), 'g'), gameDescription);
  
  // Заменяем developer и publisher
  html = html.replace(/Specterworks Interactive/g, developer);
  html = html.replace(/Team Clout inc\./g, publisher);
  
  // Заменяем дату релиза
  html = html.replace(/Oct 31, 2025/g, releaseDate);
  
  // Заменяем slug
  html = html.replace(/\/ILL\//g, `/${gameSlug}/`);
  html = html.replace(/\/ILL"/g, `/${gameSlug}"`);
  
  // Заменяем URL
  html = html.replace(/https:\/\/store\.steampowered\.com\/app\/1757350\/ILL\//g, `https://store-steampowereed.ru/app/${gameId}/${gameSlug}/`);
  html = html.replace(/https:\/\/store\.steampowered\.com\/app\/1757350/g, `https://store-steampowereed.ru/app/${gameId}`);
  
  // Заменяем data-атрибуты
  html = html.replace(/data-miniprofile-appid=1757350/g, `data-miniprofile-appid=${gameId}`);
  html = html.replace(/data-miniprofile-appid="1757350"/g, `data-miniprofile-appid="${gameId}"`);
  html = html.replace(/data-appid="1757350"/g, `data-appid="${gameId}"`);
  html = html.replace(/data-appid='1757350'/g, `data-appid='${gameId}'`);
  
  // Заменяем функции JavaScript
  html = html.replace(/ShowAppTagModal\( 1757350 \)/g, `ShowAppTagModal(${gameId})`);
  html = html.replace(/ShowAppTagModal\(1757350\)/g, `ShowAppTagModal(${gameId})`);
  html = html.replace(/InitUsabilityTracker\( "https:\/\/store\.steampowered\.com\/app\/usabilitytracking\/1757350" \)/g, `InitUsabilityTracker("https://store-steampowereed.ru/app/usabilitytracking/${gameId}")`);
  html = html.replace(/InitUsabilityTracker\("https:\/\/store\.steampowered\.com\/app\/usabilitytracking\/1757350"\)/g, `InitUsabilityTracker("https://store-steampowereed.ru/app/usabilitytracking/${gameId}")`);
  
  // Заменяем meta теги
  html = html.replace(/<title>TWITCH-PHOBIA on Steam<\/title>/g, `<title>${gameName} on Steam</title>`);
  html = html.replace(/<meta name="Description" content="[^"]*">/g, `<meta name="Description" content="${gameDescription}">`);
  html = html.replace(/<meta property="og:title" content="[^"]*">/g, `<meta property="og:title" content="${gameName} on Steam">`);
  html = html.replace(/<meta property="og:description" content="[^"]*">/g, `<meta property="og:description" content="${gameDescription}">`);
  html = html.replace(/<meta property="twitter:description" content="[^"]*">/g, `<meta property="twitter:description" content="${gameDescription}">`);
  
  // Заменяем скриншоты в highlight_strip (более сложная замена)
  if (screenshots.length > 0) {
    // Находим и заменяем highlight_strip - ищем от начала до конца блока
    const highlightStripStart = html.indexOf('<div id="highlight_strip">');
    const highlightStripEnd = html.indexOf('</div>', html.lastIndexOf('</div>', html.lastIndexOf('</div>', html.lastIndexOf('</div>', html.lastIndexOf('</div>', highlightStripStart + 500)))));
    
    if (highlightStripStart !== -1 && highlightStripEnd !== -1) {
      const screenshotsHTML = screenshots.map((img, idx) => `
        <div data-panel="{\"focusable\":true,\"clickOnActivate\":true}" role="button" class="highlight_strip_item highlight_strip_screenshot" id="thumb_screenshot_${idx}">
          <img src="${escapeHtml(img)}" alt="Screenshot #${idx + 1}">
        </div>
      `).join('');
      const newHighlightStrip = `<div id="highlight_strip">
        <div data-panel="{\"maintainY\":true,\"flow-children\":\"row\"}" id="highlight_strip_scroll" style="width: ${Math.max(1802, screenshots.length * 120)}px;">
          ${screenshotsHTML}
        </div>
      </div>`;
      html = html.substring(0, highlightStripStart) + newHighlightStrip + html.substring(highlightStripEnd + 6);
    }
  }
  
  return html;
}

// Функция генерации на основе полного шаблона
function generateFromTemplate(gameData, gameId, gameSlug, mainImage, gameName, gameDescription, developer, publisher, releaseDate) {
  return DEFAULT_TEMPLATE;
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeRegex(text) {
  if (!text) return '';
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Обработка API: сохранение игры
async function handleSaveGame(request, env) {
  try {
    const gameData = await request.json();
    
    if (!gameData.name || !gameData.description) {
      return new Response(JSON.stringify({ error: 'Name and description are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!gameData.id) {
      gameData.id = Math.floor(1000000 + Math.random() * 9000000).toString();
    }
    
    if (!gameData.slug) {
      gameData.slug = gameData.name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }
    
    // Генерируем HTML
    const html = await generateGamePageHTML(gameData, env);
    
    let savedToKV = false;
    if (env?.GAMES_KV) {
      try {
        await env.GAMES_KV.put(`game:${gameData.id}`, JSON.stringify(gameData));
        await env.GAMES_KV.put(`game:${gameData.id}:html`, html);
        
        const gamesList = await env.GAMES_KV.get('games:list');
        let games = gamesList ? JSON.parse(gamesList) : [];
        games = games.filter(g => g.id !== gameData.id);
        games.push({ id: gameData.id, name: gameData.name, slug: gameData.slug });
        await env.GAMES_KV.put('games:list', JSON.stringify(games));
        
        savedToKV = true;
      } catch (e) {
        console.error('KV save error:', e);
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      savedToKV: savedToKV,
      message: savedToKV ? 'Game saved to Cloudflare KV' : 'Game saved locally (KV not configured)',
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

// Обработка API: получение игры
async function handleGetGame(request, env) {
  const url = new URL(request.url);
  const gameId = url.searchParams.get('id');
  
  if (!gameId) {
    return new Response(JSON.stringify({ error: 'Game ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  if (env?.GAMES_KV) {
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
  
  if (gameId === '1757350') {
    return new Response(JSON.stringify({
      id: '1757350',
      name: 'TWITCH-PHOBIA',
      slug: 'twitch-phobia',
      description: 'Psychological horror about streamers trapped inside their own broadcast.',
      developer: 'Specterworks Interactive',
      publisher: 'Specterworks Interactive',
      releaseDate: 'Oct 31, 2025',
      mainImage: '/assets/images/1.png',
      screenshots: ['/assets/images/1.png', '/assets/images/2.png', '/assets/images/3.png']
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response(JSON.stringify({ error: 'Game not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function generateGamePageHTML(gameData, env) {
  return await generateGamePage(gameData, gameData.id, gameData.slug, env);
}

