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
    
    // Генерируем HTML страницы игры
    const html = generateGamePageHTML(gameData);
    
    // Сохраняем в KV если доступно
    let savedToKV = false;
    if (env && env.GAMES_KV) {
      try {
        // Сохраняем данные игры
        await env.GAMES_KV.put(`game:${gameData.id}`, JSON.stringify(gameData));
        
        // Сохраняем готовый HTML страницы
        await env.GAMES_KV.put(`game:${gameData.id}:html`, html);
        
        // Также сохраняем список всех игр
        const gamesList = await env.GAMES_KV.get('games:list');
        let games = gamesList ? JSON.parse(gamesList) : [];
        // Удаляем старую версию если есть
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
      message: savedToKV 
        ? 'Game saved to Cloudflare KV' 
        : 'Game saved locally (KV not configured)',
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

function generateGamePageHTML(gameData) {
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
          <a href="/">All Games</a> &gt; <a href="/app/${gameData.id}/">${escapeHtml(gameData.name)}</a>
        </div>
        <div class="game_page_background game" data-miniprofile-appid="${gameData.id}">
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
