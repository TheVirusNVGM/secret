// Основной Worker для обработки всех запросов
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    // Обработка /app/{id}/{name}/
    if (pathname.startsWith('/app/') && pathname !== '/app') {
      const pathAfterApp = pathname.replace(/^\/app\//, '').replace(/\/$/, '');
      const pathMatch = pathAfterApp.match(/^(\d+)\/(.+)$/);
      
      if (pathMatch) {
        const gameId = pathMatch[1];
        
        // Пытаемся получить готовый HTML из KV
        if (env?.GAMES_KV) {
          try {
            const html = await env.GAMES_KV.get(`game:${gameId}:html`);
            if (html) {
              return new Response(html, {
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
              });
            }
          } catch (e) {
            console.error('KV get error:', e);
          }
        }
        
        // Fallback: получаем данные и генерируем HTML
        const gameData = await getGameData(gameId, env);
        
        if (!gameData) {
          return new Response(`Game not found: ${gameId}`, { status: 404 });
        }
        
        // Генерируем HTML
        const html = generateGamePage(gameData, gameId, pathMatch[2]);
        
        return new Response(html, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }
    }
    
    // Для всех остальных запросов возвращаем null, чтобы Worker обработал их как статические файлы
    return env.ASSETS.fetch(request);
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

function generateGamePage(gameData, gameId, gameSlug) {
  return `<!DOCTYPE html>
<html class="responsive DesktopUI" lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(gameData.name)} on Steam</title>
  <link rel="icon" href="/ico.ico">
  <link href="https://store.fastly.steamstatic.com/public/shared/css/motiva_sans.css" rel="stylesheet">
  <link href="https://store.fastly.steamstatic.com/public/shared/css/shared_global.css" rel="stylesheet">
  <link href="https://store.fastly.steamstatic.com/public/shared/css/buttons.css" rel="stylesheet">
  <link href="https://store.fastly.steamstatic.com/public/css/v6/store.css" rel="stylesheet">
  <link href="https://store.fastly.steamstatic.com/public/css/v6/game.css" rel="stylesheet">
  <link href="https://store.fastly.steamstatic.com/public/shared/css/shared_responsive.css" rel="stylesheet">
</head>
<body class="v6 app game_bg menu_background_overlap application v7menu responsive_page">
  <div class="responsive_page_frame with_header">
    <div class="responsive_page_content">
      <div role="banner" id="global_header">
        <div class="content">
          <div class="logo">
            <a href="/"><img src="https://store.fastly.steamstatic.com/public/shared/images/header/logo_steam.svg" width="176" height="44" alt="Steam"></a>
          </div>
          <div role="navigation" class="supernav_container">
            <a class="menuitem supernav supernav_active" href="/">STORE</a>
            <a class="menuitem" href="/constructor.html" style="color: #66c0f4;">Create Game</a>
          </div>
        </div>
      </div>
      <div class="page_content">
        <div class="breadcrumbs">
          <a href="/">All Games</a> &gt; <a href="/app/${gameId}/">${escapeHtml(gameData.name)}</a>
        </div>
        <div class="game_page_background game" data-miniprofile-appid="${gameId}">
          <div class="apphub_HomeHeaderContent">
            <div class="apphub_HeaderStandardTop">
              <div class="apphub_AppIcon">
                <img src="${escapeHtml(gameData.mainImageBase64 || gameData.mainImage || '')}" alt="${escapeHtml(gameData.name)}">
              </div>
              <div id="appHubAppName" class="apphub_AppName">${escapeHtml(gameData.name)}</div>
            </div>
          </div>
          <div class="block game_media_and_summary_ctn">
            <div class="game_background_glow">
              <div id="page_header_img" class="responsive_page_header_img">
                <img style="width:100%;" src="${escapeHtml(gameData.mainImageBase64 || gameData.mainImage || '')}" alt="${escapeHtml(gameData.name)}">
              </div>
              <div class="block_content page_content" id="game_highlights">
                <div class="rightcol">
                  <div class="glance_ctn">
                    <div id="gameHeaderImageCtn" class="game_header_image_ctn">
                      <img class="game_header_image_full" alt="" src="${escapeHtml(gameData.mainImageBase64 || gameData.mainImage || '')}">
                    </div>
                    <div class="game_description_snippet">${escapeHtml(gameData.description)}</div>
                    <div class="glance_ctn_responsive_left">
                      <div class="release_date">
                        <div class="subtitle column">Release Date:</div>
                        <div class="date">${escapeHtml(gameData.releaseDate || 'To be announced')}</div>
                      </div>
                      <div class="dev_row">
                        <div class="subtitle column">Developer:</div>
                        <div class="summary column">${escapeHtml(gameData.developer || 'Unknown')}</div>
                      </div>
                      <div class="dev_row">
                        <div class="subtitle column">Publisher:</div>
                        <div class="summary column">${escapeHtml(gameData.publisher || 'Unknown')}</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="leftcol">
                  <div class="game_area_purchase_game">
                    <div class="game_area_comingsoon game_area_bubble">
                      <div class="content">
                        <span class="not_yet">This game is not yet available on Steam</span>
                        <h1>Planned Release Date: <span>${escapeHtml(gameData.releaseDate || 'To be announced')}</span></h1>
                      </div>
                      <div id="add_to_wishlist_area2" class="wishlist_add_reminder">
                        <div class="wishlist_note">Interested?<br>Add to your wishlist and get notified when it becomes available.</div>
                        <a role="button" class="btn_green_steamui btn_medium" href="javascript:void(0);" onclick="triggerScreener(); return false;">
                          <span>Add to your wishlist</span>
                        </a>
                      </div>
                    </div>
                  </div>
                  ${(gameData.screenshotsBase64 && gameData.screenshotsBase64.length > 0) || (gameData.screenshots && gameData.screenshots.length > 0) ? `
                  <div class="screenshot_container" style="margin-top: 20px;">
                    <h2>Screenshots</h2>
                    <div class="screenshots">
                      ${(gameData.screenshotsBase64 || gameData.screenshots || []).map(img => `
                        <img src="${escapeHtml(img)}" alt="Screenshot" style="max-width: 100%; margin: 10px 0; border-radius: 4px;">
                      `).join('')}
                    </div>
                  </div>
                  ` : ''}
                </div>
              </div>
            </div>
          </div>
          <div class="block">
            <div class="block_content">
              <h2>About This Game</h2>
              <div class="game_description"><p>${escapeHtml(gameData.description)}</p></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <script src="/screamer.js"></script>
</body>
</html>`;
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

