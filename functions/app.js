// Cloudflare Pages Function для обработки маршрутов /app/{id}/{name}/
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // Парсим путь из URL
  const pathname = url.pathname;
  
  // Проверяем, что путь начинается с /app/
  if (!pathname.startsWith('/app/')) {
    return new Response('Not found', { status: 404 });
  }
  
  // Убираем /app/ из начала пути
  const pathAfterApp = pathname.replace(/^\/app\//, '').replace(/\/$/, '');
  
  // Парсим путь: {id}/{name}
  const pathMatch = pathAfterApp.match(/^(\d+)\/(.+)$/);
  
  if (!pathMatch) {
    return new Response('Invalid game path. Expected: /app/{id}/{name}/', { 
      status: 404,
      headers: { 'Content-Type': 'text/html' }
    });
  }
  
  const gameId = pathMatch[1];
  const gameSlug = pathMatch[2];
  
  // Получаем данные игры
  const gameData = await getGameData(gameId, env);
  
  if (!gameData) {
    return new Response('Game not found for ID: ' + gameId, { status: 404 });
  }
  
  // Генерируем HTML страницы игры
  const html = generateGamePage(gameData, gameId, gameSlug);
  
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}

async function getGameData(gameId, env) {
  // Попытка получить из KV
  if (env && env.GAMES_KV) {
    try {
      const data = await env.GAMES_KV.get(`game:${gameId}`);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('KV error:', e);
    }
  }
  
  // Fallback: для демо используем данные из примера
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
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#171a21">
  <title>${gameData.name} on Steam</title>
  <link rel="shortcut icon" href="/ico.ico" type="image/x-icon">
  <link rel="icon" href="/ico.ico" type="image/x-icon">
  
  <link href="https://store.fastly.steamstatic.com/public/shared/css/motiva_sans.css" rel="stylesheet" type="text/css">
  <link href="https://store.fastly.steamstatic.com/public/shared/css/shared_global.css" rel="stylesheet" type="text/css">
  <link href="https://store.fastly.steamstatic.com/public/shared/css/buttons.css" rel="stylesheet" type="text/css">
  <link href="https://store.fastly.steamstatic.com/public/css/v6/store.css" rel="stylesheet" type="text/css">
  <link href="https://store.fastly.steamstatic.com/public/css/v6/game.css" rel="stylesheet" type="text/css">
  <link href="https://store.fastly.steamstatic.com/public/shared/css/shared_responsive.css" rel="stylesheet" type="text/css">
  
  <meta name="Description" content="${gameData.description}">
  <meta property="og:title" content="${gameData.name} on Steam">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://store-steampowereed.ru/app/${gameId}/${gameSlug}/">
  <meta property="og:description" content="${gameData.description}">
  <meta property="og:image" content="${gameData.mainImageBase64 || gameData.mainImage || ''}">
</head>
<body class="v6 app game_bg menu_background_overlap application v7menu responsive_page">
  <div class="responsive_page_frame with_header">
    <div class="responsive_page_content">
      <div role="banner" id="global_header">
        <div class="content">
          <div class="logo">
            <span id="logo_holder">
              <a href="/" aria-label="Link to the Steam Homepage">
                <img src="https://store.fastly.steamstatic.com/public/shared/images/header/logo_steam.svg?t=962016" width="176" height="44" alt="Steam">
              </a>
            </span>
          </div>
          <div role="navigation" class="supernav_container">
            <a class="menuitem supernav supernav_active" href="/">STORE</a>
            <a class="menuitem" href="/constructor.html" style="color: #66c0f4;">Create Game</a>
          </div>
        </div>
      </div>
      
      <div class="page_content">
        <div class="breadcrumbs">
          <a href="/">All Games</a> &gt; 
          <a href="/app/${gameId}/">${gameData.name}</a>
        </div>
        
        <div class="game_page_background game" data-miniprofile-appid="${gameId}">
          <div class="apphub_HomeHeaderContent">
            <div class="apphub_HeaderStandardTop">
              <div class="apphub_AppIcon">
                <img src="${gameData.mainImageBase64 || gameData.mainImage}" alt="${gameData.name}">
                <div class="overlay"></div>
              </div>
              <div id="appHubAppName" class="apphub_AppName">${gameData.name}</div>
            </div>
          </div>
          
          <div class="block game_media_and_summary_ctn">
            <div class="game_background_glow">
              <div id="page_header_img" class="responsive_page_header_img">
                <img style="width:100%;" src="${gameData.mainImageBase64 || gameData.mainImage}" alt="${gameData.name}">
              </div>
              
              <div class="block_content page_content" id="game_highlights">
                <div class="rightcol">
                  <div class="glance_ctn">
                    <div id="gameHeaderImageCtn" class="game_header_image_ctn">
                      <img class="game_header_image_full" alt="" src="${gameData.mainImageBase64 || gameData.mainImage}">
                    </div>
                    <div class="game_description_snippet">
                      ${gameData.description}
                    </div>
                    
                    <div class="glance_ctn_responsive_left">
                      <div class="release_date">
                        <div class="subtitle column">Release Date:</div>
                        <div class="date">${gameData.releaseDate}</div>
                      </div>
                      
                      <div class="dev_row">
                        <div class="subtitle column">Developer:</div>
                        <div class="summary column">${gameData.developer}</div>
                      </div>
                      
                      <div class="dev_row">
                        <div class="subtitle column">Publisher:</div>
                        <div class="summary column">${gameData.publisher}</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div class="leftcol">
                  <div class="game_area_purchase_game">
                    <div class="game_area_comingsoon game_area_bubble">
                      <div class="content">
                        <span class="not_yet">This game is not yet available on Steam</span>
                        <h1>Planned Release Date: <span>${gameData.releaseDate}</span></h1>
                      </div>
                      <div id="add_to_wishlist_area2" class="wishlist_add_reminder">
                        <div class="wishlist_note">Interested?<br>Add to your wishlist and get notified when it becomes available.</div>
                        <a data-panel="{&quot;focusable&quot;:true,&quot;clickOnActivate&quot;:true}" role="button" class="btn_green_steamui btn_medium" href="javascript:void(0);" onclick="triggerScreener(); return false;" data-tooltip-text="Get notified by email when your wishlisted items get released or are on sale">
                          <span>Add to your wishlist</span>
                        </a>
                      </div>
                    </div>
                  </div>
                  
                  ${(gameData.screenshots && gameData.screenshots.length > 0) || (gameData.screenshotsBase64 && gameData.screenshotsBase64.length > 0) ? `
                  <div class="screenshot_container">
                    <h2>Screenshots</h2>
                    <div class="screenshots">
                      ${(gameData.screenshotsBase64 || gameData.screenshots || []).map(img => `
                        <img src="${img}" alt="Screenshot" style="max-width: 100%; margin: 10px 0;">
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
              <div class="game_description">
                <p>${gameData.description}</p>
              </div>
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

