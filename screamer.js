// SCREAMER PRANK SCRIPT
// Триггеры: скролл вниз ИЛИ клик на wishlist

let screamerTriggered = false;

// Screamer HTML
const screamerHTML = `
<div id="screamer-overlay" style="
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: #000;
    z-index: 999999;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
">
    <img src="assets/images/screamer.gif" style="max-width: 100%; max-height: 100%; object-fit: contain;" alt="">
    <audio id="screamer-audio" autoplay loop>
        <source src="assets/sounds/scream.mp3" type="audio/mpeg">
    </audio>
</div>
`;

function triggerScreener() {
    if (screamerTriggered) return;
    screamerTriggered = true;

    // Создаём оверлей
    document.body.insertAdjacentHTML('beforeend', screamerHTML);
    
    // Максимальная громкость
    const audio = document.getElementById('screamer-audio');
    if (audio) {
        audio.volume = 1.0;
        audio.play().catch(e => console.log('Audio play failed:', e));
    }

    // Вибрация если поддерживается
    if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 200]);
    }

    // Мигание страницы
    let flashCount = 0;
    const flashInterval = setInterval(() => {
        document.body.style.backgroundColor = flashCount % 2 === 0 ? '#ff0000' : '#000000';
        flashCount++;
        if (flashCount > 10) {
            clearInterval(flashInterval);
            document.body.style.backgroundColor = '#000000';
        }
    }, 100);

    // Блокируем закрытие на 3 секунды
    setTimeout(() => {
        alert('ВЫ ПОПАЛИСЬ НА ПРАНК! 😈');
        // Можно закрыть после алерта
    }, 3000);
}

// ТРИГГЕР 1: Скролл вниз (прокрутка больше 70% страницы)
let scrollTriggered = false;
window.addEventListener('scroll', () => {
    if (scrollTriggered) return;
    
    const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
    
    if (scrollPercent > 70) {
        scrollTriggered = true;
        triggerScreener();
    }
});

// ТРИГГЕР 2: Клик на кнопку wishlist
document.addEventListener('DOMContentLoaded', () => {
    // Находим все возможные кнопки wishlist
    const wishlistSelectors = [
        'a[href*="wishlist"]',
        '.queue_btn_wishlist',
        '#add_to_wishlist_area',
        '.btnv6_blue_hoverfade'
    ];

    wishlistSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                triggerScreener();
            });
        });
    });

    console.log('Screamer initialized. Scroll down or click wishlist... 😈');
});

// Альтернативный триггер: Через 30 секунд если ничего не произошло
setTimeout(() => {
    if (!screamerTriggered) {
        console.log('Auto-trigger after 30 seconds');
        triggerScreener();
    }
}, 30000);
