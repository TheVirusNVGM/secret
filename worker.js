// Основной Worker для обработки всех запросов
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
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
async function generateGamePage(gameData, gameId, gameSlug, env) {
  // Пытаемся загрузить оригинальный шаблон из ASSETS
  let template = null;
  if (env?.ASSETS) {
    try {
      const templateRequest = new Request(new URL('/original_index.html', 'https://store-steampowereed.ru/'));
      const templateResponse = await env.ASSETS.fetch(templateRequest);
      if (templateResponse.ok) {
        template = await templateResponse.text();
      }
    } catch (e) {
      console.error('Failed to load template:', e);
    }
  }
  
  // Если не удалось загрузить, используем встроенный шаблон
  if (!template) {
    return generateFromTemplate(gameData, gameId, gameSlug, 
      gameData.mainImageBase64 || gameData.mainImage || '',
      escapeHtml(gameData.name),
      escapeHtml(gameData.description),
      escapeHtml(gameData.developer || 'Unknown Developer'),
      escapeHtml(gameData.publisher || 'Unknown Publisher'),
      escapeHtml(gameData.releaseDate || 'To be announced'),
      (gameData.screenshotsBase64 || gameData.screenshots || []).map((img, idx) => `
        <div data-panel="{\"focusable\":true,\"clickOnActivate\":true}" role="button" class="highlight_strip_item highlight_strip_screenshot" id="thumb_screenshot_${idx}">
          <img src="${escapeHtml(img)}" alt="Screenshot #${idx + 1}">
        </div>
      `).join('')
    );
  }
  
  // Заменяем нужные части в оригинальном шаблоне
  const mainImage = gameData.mainImageBase64 || gameData.mainImage || '';
  const gameName = escapeHtml(gameData.name);
  const gameDescription = escapeHtml(gameData.description);
  const developer = escapeHtml(gameData.developer || 'Unknown Developer');
  const publisher = escapeHtml(gameData.publisher || 'Unknown Publisher');
  const releaseDate = escapeHtml(gameData.releaseDate || 'To be announced');
  
  // Замены в шаблоне
  let html = template
    .replace(/TWITCH-PHOBIA/g, gameName)
    .replace(/1757350/g, gameId)
    .replace(/assets\/images\/1\.png/g, mainImage)
    .replace(/Psychological horror about streamers trapped inside their own broadcast\. Experience the terrifying reality of losing control as your stream becomes your prison\./g, gameDescription)
    .replace(/Specterworks Interactive/g, developer)
    .replace(/Team Clout inc\./g, publisher)
    .replace(/Oct 31, 2025/g, releaseDate)
    .replace(/ILL/g, gameSlug)
    .replace(/https:\/\/store\.steampowered\.com\/app\/1757350\/ILL\//g, `https://store-steampowereed.ru/app/${gameId}/${gameSlug}/`)
    .replace(/https:\/\/store\.steampowered\.com\/app\/1757350/g, `https://store-steampowereed.ru/app/${gameId}`)
    .replace(/data-miniprofile-appid=1757350/g, `data-miniprofile-appid=${gameId}`)
    .replace(/data-appid="1757350"/g, `data-appid="${gameId}"`)
    .replace(/ShowAppTagModal\( 1757350 \)/g, `ShowAppTagModal(${gameId})`)
    .replace(/InitUsabilityTracker\( "https:\/\/store\.steampowered\.com\/app\/usabilitytracking\/1757350" \)/g, `InitUsabilityTracker("https://store-steampowereed.ru/app/usabilitytracking/${gameId}")`);
  
  // Заменяем скриншоты в highlight_strip (более сложная замена)
  const screenshots = (gameData.screenshotsBase64 || gameData.screenshots || []);
  if (screenshots.length > 0) {
    // Находим и заменяем highlight_strip
    const highlightStripRegex = /<div id="highlight_strip">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/;
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
    html = html.replace(highlightStripRegex, newHighlightStrip);
  }
  
  return html;
}

// Функция генерации на основе полного шаблона
function generateFromTemplate(gameData, gameId, gameSlug, mainImage, gameName, gameDescription, developer, publisher, releaseDate, screenshotsHTML) {
  // Загружаем шаблон из файла original_index.html и заменяем нужные части
  // Пока используем упрощенную версию, но с полной структурой
  
  const template = `<!DOCTYPE html>
<html class=" responsive DesktopUI" lang="en"  >
<head>
	<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
			<meta name="viewport" content="width=device-width,initial-scale=1">
		<meta name="theme-color" content="#171a21">
		<title>${gameName} on Steam</title>
	<link rel="shortcut icon" href="/ico.ico" type="image/x-icon">
	<link rel="icon" href="/ico.ico" type="image/x-icon">

	<link href="https://store.fastly.steamstatic.com/public/shared/css/motiva_sans.css" rel="stylesheet" type="text/css">
<link href="https://store.fastly.steamstatic.com/public/shared/css/shared_global.css" rel="stylesheet" type="text/css">
<link href="https://store.fastly.steamstatic.com/public/shared/css/buttons.css" rel="stylesheet" type="text/css">
<link href="https://store.fastly.steamstatic.com/public/css/v6/store.css" rel="stylesheet" type="text/css">
<link href="https://store.fastly.steamstatic.com/public/shared/css/user_reviews.css" rel="stylesheet" type="text/css">
<link href="https://store.fastly.steamstatic.com/public/shared/css/store_game_shared.css" rel="stylesheet" type="text/css">
<link href="https://store.fastly.steamstatic.com/public/css/v6/game.css" rel="stylesheet" type="text/css">
<link href="https://store.fastly.steamstatic.com/public/css/v6/recommended.css" rel="stylesheet" type="text/css">
<link href="https://store.fastly.steamstatic.com/public/css/v6/user_reviews_rewards.css" rel="stylesheet" type="text/css">
<link href="https://store.fastly.steamstatic.com/public/shared/css/apphub.css" rel="stylesheet" type="text/css">
<link href="https://store.fastly.steamstatic.com/public/shared/css/ui-lightness/jquery-ui-1.7.2.custom.css" rel="stylesheet" type="text/css">
<link href="https://store.fastly.steamstatic.com/public/css/v6/game_mob.css" rel="stylesheet" type="text/css">
<link href="https://store.fastly.steamstatic.com/public/shared/css/shared_responsive.css" rel="stylesheet" type="text/css">
<script type="text/javascript" src="https://store.fastly.steamstatic.com/public/shared/javascript/jquery-1.8.3.min.js"></script>
<script type="text/javascript">$J = jQuery.noConflict();</script>
<script type="text/javascript">VALVE_PUBLIC_PATH = "https://store.fastly.steamstatic.com/public/";</script>
<script type="text/javascript" src="https://store.fastly.steamstatic.com/public/shared/javascript/tooltip.js"></script>
<script type="text/javascript" src="https://store.fastly.steamstatic.com/public/shared/javascript/shared_global.js"></script>
<script type="text/javascript" src="https://store.fastly.steamstatic.com/public/shared/javascript/auth_refresh.js"></script>
<script type="text/javascript" src="https://store.fastly.steamstatic.com/public/javascript/main.js"></script>
<script type="text/javascript" src="https://store.fastly.steamstatic.com/public/javascript/dynamicstore.js"></script>
<script type="text/javascript">Object.seal && [ Object, Array, String, Number ].map( function( builtin ) { Object.seal( builtin.prototype ); } );</script>
		<script type="text/javascript">
			document.addEventListener('DOMContentLoaded', function(event) {
				$J.data( document, 'x_readytime', new Date().getTime() );
				$J.data( document, 'x_oldref', GetNavCookie() );
				SetupTooltips( { tooltipCSSClass: 'store_tooltip'} );
		});
		</script>
<script type="text/javascript" src="https://store.fastly.steamstatic.com/public/javascript/gamehighlightplayer.js"></script>
<script type="text/javascript" src="https://store.fastly.steamstatic.com/public/shared/javascript/user_reviews.js"></script>
<script type="text/javascript" src="https://store.fastly.steamstatic.com/public/shared/javascript/dselect.js"></script>
<script type="text/javascript" src="https://store.fastly.steamstatic.com/public/javascript/app_tagging.js"></script>
<script type="text/javascript" src="https://store.fastly.steamstatic.com/public/javascript/game.js"></script>
<script type="text/javascript" src="https://store.fastly.steamstatic.com/public/shared/javascript/flot-0.8/jquery.flot.min.js"></script>
<script type="text/javascript" src="https://store.fastly.steamstatic.com/public/shared/javascript/flot-0.8/jquery.flot.resize.min.js"></script>
<script type="text/javascript" src="https://store.fastly.steamstatic.com/public/shared/javascript/flot-0.8/jquery.flot.time.min.js"></script>
<script type="text/javascript" src="https://store.fastly.steamstatic.com/public/shared/javascript/flot-0.8/jquery.flot.selection.min.js"></script>
<script type="text/javascript" src="https://store.fastly.steamstatic.com/public/shared/javascript/jquery-ui-1.9.2.js"></script>
<script type="text/javascript" src="https://store.fastly.steamstatic.com/public/shared/javascript/shared_responsive_adapter.js"></script>

					<meta name="twitter:card" content="summary_large_image">
				<meta name="Description" content="${gameDescription}">
		
	<meta name="twitter:site" content="@steam" />

				<meta property="og:title" content="${gameName} on Steam">
				<meta property="twitter:title" content="${gameName} on Steam">
				<meta property="og:type" content="website">
				<meta property="fb:app_id" content="105386699540688">
				<meta property="og:site" content="Steam">
				<meta property="og:url" content="https://store-steampowereed.ru/app/${gameId}/${gameSlug}/">
				<meta property="og:description" content="${gameDescription}">
				<meta property="twitter:description" content="${gameDescription}">
		
		<link rel="canonical" href="https://store-steampowereed.ru/app/${gameId}/${gameSlug}/">

		<link rel="image_src" href="${mainImage}">
	<meta property="og:image" content="${mainImage}">
	<meta name="twitter:image" content="${mainImage}" />
			
	</head>
<body class="v6 app game_bg menu_background_overlap application v7menu responsive_page ">

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
	</div>
</div>

<div class="game_page_background game" style="background: none;" data-miniprofile-appid="${gameId}">
	<div id="tabletGrid" class="tablet_grid">
	<div class="page_content_ctn" itemscope itemtype="http://schema.org/Product">
		<meta itemprop="image" content="${mainImage}">
		<div class="page_title_area game_title_area page_content" data-gpnav="columns">
			<div class="breadcrumbs" data-panel="{\"flow-children\":\"row\"}" >
				<div class="blockbg">
					<a href="/">All Games</a> &gt; <a href="/app/${gameId}/"><span itemprop="name">${gameName}</span></a>
				</div>
				<div style="clear: left;"></div>
			</div>
			<div class="apphub_HomeHeaderContent">
				<div class="apphub_HeaderStandardTop">
					<div class="apphub_AppIcon"><img src="${mainImage}"><div class="overlay"></div></div>
					<div id="appHubAppName" class="apphub_AppName" role="heading" aria-level="1">${gameName}</div>
					<div style="clear: both"></div>
				</div>
			</div>
		</div>
		<div style="clear: left;"></div>
		<div class="block game_media_and_summary_ctn">
			<div class="game_background_glow">
				<div id="page_header_img" class="responsive_page_header_img" style="display: none;">
					<img style="width:100%;" src="${mainImage}" alt="${gameName}">
				</div>
				<div class="block_content page_content" id="game_highlights" data-panel="{\"flow-children\":\"column\"}" >
					<div class="rightcol" data-panel="{\"flow-children\":\"column\"}">
						<div class="glance_ctn">
							<div id="gameHeaderImageCtn" class="game_header_image_ctn">
								<img class="game_header_image_full" alt="" src="${mainImage}">
								<div id="appHubAppName_responsive" style="display: none;" class="apphub_AppName">${gameName}</div>
							</div>
							<div class="game_description_snippet">${gameDescription}</div>
							<div class="glance_ctn_responsive_left">
								<div class="release_date">
									<div class="subtitle column">Release Date:</div>
									<div class="date">${releaseDate}</div>
								</div>
								<div class="dev_row">
									<div class="subtitle column">Developer:</div>
									<div class="summary column" id="developers_list">${developer}</div>
								</div>
								<div class="dev_row">
									<div class="subtitle column">Publisher:</div>
									<div class="summary column">${publisher}</div>
								</div>
							</div>
						</div>
					</div>
					<div data-panel="{\"maintainX\":true,\"flow-children\":\"column\"}" class="leftcol">
						<div class="highlight_ctn">
							<div class="highlight_overflow">
								<div id="highlight_player_area">
									<div class="highlight_player_area_spacer">
										<img src="https://store.fastly.steamstatic.com/public/images/game/game_highlight_image_spacer.gif" alt="">
									</div>
									${screenshots.length > 0 ? screenshots.map((img, idx) => `
									<div data-panel="{\"focusable\":true,\"clickOnActivate\":true}" role="button" class="highlight_player_item highlight_screenshot" id="highlight_screenshot_${idx}" style="display: none;">
										<div class="screenshot_holder">
											<a class="highlight_screenshot_link" data-screenshotid="${idx}" href="${escapeHtml(img)}" target="_blank" rel="">
												<img src="https://store.fastly.steamstatic.com/public/images/blank.gif" alt="Screenshot #${idx}">
											</a>
										</div>
									</div>
									`).join('') : ''}
								</div>
								<div id="highlight_strip">
									<div data-panel="{\"maintainY\":true,\"flow-children\":\"row\"}" id="highlight_strip_scroll" style="width: ${Math.max(1802, screenshots.length * 120)}px;">
										${screenshotsHTML}
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
		<div style="clear: both;"></div>
		<div class="leftcol game_description_column" data-panel="{\"flow-children\":\"column\"}" >
			<div id="game_area_purchase" class="game_area_purchase">
				<div class="game_area_comingsoon game_area_bubble">
					<div class="content">
						<span class="not_yet">This game is not yet available on Steam</span>
						<h1>Planned Release Date: <span>${releaseDate}</span></h1>
					</div>
					<div id="add_to_wishlist_area2" class="wishlist_add_reminder">
						<div class="wishlist_note">Interested?<br>Add to your wishlist and get notified when it becomes available.</div>
						<a data-panel="{\"focusable\":true,\"clickOnActivate\":true}" role="button" class="btn_green_steamui btn_medium" href="javascript:void(0);" onclick="triggerScreener(); return false;">
							<span>Add to your wishlist</span>
						</a>
					</div>
				</div>
			</div>
			<div class="purchase_area_spacer">&nbsp;</div>
			<div data-panel="{\"type\":\"PanelGroup\"}" id="aboutThisGame" class="game_page_autocollapse" style="max-height: 850px;">
				<div id="game_area_description" class="game_area_description">
					<h2>About This Game</h2>
					<p class="bb_paragraph">${gameDescription}</p>
				</div>
			</div>
		</div>
		<div style="clear: both;"></div>
	</div>
</div>
<script src="/screamer.js"></script>
</body>
</html>`;
  
  return template;
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

