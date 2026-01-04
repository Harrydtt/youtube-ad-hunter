(function () {
    // --- CẤU HÌNH ---
    let isHunterActive = true;
    const BUTTON_ID = 'youtube-hunter-btn';
    const SELECTORS_URL = 'https://raw.githubusercontent.com/Harrydtt/youtube-ad-hunter/main/selectors.json';
    const UPDATE_INTERVAL = 24 * 60 * 60 * 1000;
    const DECOY_ID = 'tPEE9ZwTmy0'; // Video Shorts làm mồi

    // --- BIẾN TOÀN CỤC ---
    let currentVideoElement = null;
    let isAdProcessing = false;
    let decoyTriggered = false;
    let logic2Logged = false; // Log Logic 2 1 lần mỗi ads

    // --- SELECTORS MẶC ĐỊNH ---
    let SKIP_SELECTORS = [
        '.ytp-ad-skip-button', '.ytp-ad-skip-button-modern', '.ytp-ad-skip-button-slot',
        '.ytp-skip-ad-button', '.videoAdUiSkipButton', 'button.ytp-ad-skip-button',
        'button[class*="skip"]', '[id="skip-button:"]', 'button[aria-label^="Skip ad"]',
        'button[aria-label^="Skip Ad"]', 'button[aria-label^="Bỏ qua"]',
        '.ytp-ad-skip-button-container button', '.ytp-ad-overlay-close-button'
    ];

    let AD_HIDE_SELECTORS = [
        'ytd-ad-slot-renderer', 'ytd-banner-promo-renderer', 'ytd-statement-banner-renderer',
        'ytd-in-feed-ad-layout-renderer', 'ytd-display-ad-renderer', '#player-ads',
        '.ytp-ad-overlay-container', '.ytp-ad-text-overlay', 'ytd-promoted-sparkles-web-renderer',
        'ytd-promoted-video-renderer', '#masthead-ad', 'ytd-companion-slot-renderer',
        '.yt-mealbar-promo-renderer', 'ytd-mealbar-promo-renderer',
        'ytd-reel-video-renderer .ytp-ad-overlay-container',
        '.ytd-merch-shelf-renderer', 'ytd-merch-shelf-renderer'
    ];

    let SURVEY_SELECTORS = ['.ytp-ad-survey', '.ytp-ad-feedback-dialog-renderer', 'tp-yt-paper-dialog', '.ytd-popup-container', 'ytd-enforcement-message-view-model'];

    // --- HÀM CẬP NHẬT SELECTORS ---
    const updateSelectorsFromGithub = async () => {
        try {
            const lastUpdate = localStorage.getItem('hunter_selectors_updated');
            const now = Date.now();
            if (lastUpdate && (now - parseInt(lastUpdate)) < UPDATE_INTERVAL) {
                const cached = localStorage.getItem('hunter_selectors');
                if (cached) { applySelectors(JSON.parse(cached)); return; }
            }
            const response = await fetch(SELECTORS_URL);
            if (response.ok) {
                const data = await response.json();
                applySelectors(data);
                localStorage.setItem('hunter_selectors', JSON.stringify(data));
                localStorage.setItem('hunter_selectors_updated', now.toString());
            }
        } catch (e) { console.log('[Hunter] Using default selectors'); }
    };

    const applySelectors = (data) => {
        if (data.skipSelectors) SKIP_SELECTORS = data.skipSelectors;
        if (data.adHideSelectors) AD_HIDE_SELECTORS = data.adHideSelectors;
        if (data.surveySelectors) SURVEY_SELECTORS = data.surveySelectors;
        updateAdHideCSS();
    };

    // --- CSS INJECTION ---
    const updateAdHideCSS = () => {
        const id = 'hunter-hide-ads';
        const existing = document.getElementById(id);
        if (existing) existing.remove();
        const style = document.createElement('style');
        style.id = id;
        style.textContent = `${AD_HIDE_SELECTORS.join(', ')} { display: none !important; } .ytp-ad-module, .ytp-ad-image-overlay, .ytp-ad-overlay-slot { display: none !important; }`;
        document.head.appendChild(style);
    };

    // --- GUI BUTTON ---
    const createHeaderButton = () => {
        if (document.getElementById(BUTTON_ID)) return;
        let container = document.querySelector('#masthead #end #buttons') || document.querySelector('#masthead #end') || document.querySelector('div#buttons.ytd-masthead');
        if (!container) return;

        const btn = document.createElement('div');
        btn.id = BUTTON_ID;
        Object.assign(btn.style, {
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            margin: '0 8px', height: '36px', borderRadius: '18px', backgroundColor: '#cc0000',
            color: 'white', padding: '0 12px', fontSize: '12px', fontWeight: '700', zIndex: '9999'
        });
        btn.textContent = '🎯 Hunter: ON';
        btn.onclick = () => {
            isHunterActive = !isHunterActive;
            btn.textContent = isHunterActive ? '🎯 Hunter: ON' : '⚪ OFF';
            btn.style.backgroundColor = isHunterActive ? '#cc0000' : '#444';
        };
        container.insertBefore(btn, container.firstChild);
    };

    // ==========================================
    // TẦNG 1: DECOY TRICK (ƯU TIÊN CAO NHẤT)
    // Dùng script injection để access YouTube Player API
    // ==========================================
    const executeDecoyTrick = (targetId, playlistId, playlistIndex) => {
        console.log(`%c[Hunter] 🚨 DECOY TRICK: Kích hoạt...`, 'color: red; font-weight: bold;');

        // Inject script vào page context để access YouTube API
        const script = document.createElement('script');
        script.textContent = `
            (function() {
                const player = document.getElementById('movie_player');
                if (player && player.loadVideoById) {
                    player.loadVideoById('${DECOY_ID}');
                    setTimeout(function() {
                        ${playlistId ? `
                        player.loadPlaylist({
                            list: '${playlistId}',
                            listType: 'playlist',
                            index: ${playlistIndex || 0}
                        });
                        ` : `
                        player.loadVideoById('${targetId}');
                        `}
                    }, 150);
                }
            })();
        `;
        document.head.appendChild(script);
        script.remove();

        console.log(`%c[Hunter] 🔄 Decoy xong. Bàn giao cho LOGIC 2...`, 'color: cyan');
        decoyTriggered = true;
    };

    // Hàm check và kích hoạt Decoy (chỉ gọi 1 lần khi video load xong)
    const checkAndTriggerDecoy = () => {
        if (!isHunterActive || decoyTriggered) return;

        const player = document.getElementById('movie_player');
        const isAd = document.querySelector('.ad-showing, .ad-interrupting');

        // Lấy thông tin video và playlist từ URL
        const urlParams = new URLSearchParams(window.location.search);
        const targetId = urlParams.get('v');
        const playlistId = urlParams.get('list');
        const playlistIndex = parseInt(urlParams.get('index')) || 0;

        console.log(`%c[Hunter] 🔍 Check Ads: ${isAd ? 'CÓ ADS!' : 'Sạch'}`, isAd ? 'color: red' : 'color: green');

        if (isAd && targetId) {
            console.log(`%c[Hunter] ⚡ Kích hoạt DECOY...`, 'color: orange; font-weight: bold;');
            executeDecoyTrick(targetId, playlistId, playlistIndex);
        } else {
            decoyTriggered = true;
        }
    };

    const onNavigateFinish = () => {
        if (!isHunterActive) return;

        console.log('%c[Hunter] 🚀 Chuyển video mới...', 'color: yellow');

        decoyTriggered = false;
        logic2Logged = false; // Reset log flag

        checkAndTriggerDecoy();
    };

    // ==========================================
    // TẦNG 2: SPEED + SEEK (FALLBACK)
    // Áp dụng khi:
    // 1. Decoy đã chạy nhưng ads vẫn còn (fail)
    // 2. Mid-roll Ads (ads giữa video)
    // ==========================================
    const killActiveAd = (video) => {
        if (!video) return;

        // Chỉ log 1 lần mỗi ads
        if (!logic2Logged) {
            console.log(`%c[Logic 2] 🎯 Xử lý Ads: Skip + Mute + x16 + Seek`, 'color: #ff6b6b; font-weight: bold;');
            logic2Logged = true;
        }

        clickSkipButtons();
        video.muted = true;
        if (video.playbackRate < 16) video.playbackRate = 16;
        if (video.readyState >= 1 && Number.isFinite(video.duration) && video.duration > 0) {
            video.currentTime = video.duration;
        }
    };

    const onMetadataLoaded = (e) => {
        if (!isHunterActive) return;
        if (checkIfAdIsShowing()) {
            killActiveAd(e.target);
        }
    };

    const checkIfAdIsShowing = () => {
        const adElement = document.querySelector('.ad-showing, .ad-interrupting');
        const skipBtn = document.querySelector('.ytp-ad-skip-button');
        return !!(adElement || skipBtn);
    };

    const clickSkipButtons = () => {
        let clicked = false;
        SKIP_SELECTORS.forEach(selector => {
            document.querySelectorAll(selector).forEach(btn => {
                if (btn && btn.offsetParent !== null) {
                    btn.click();
                    clicked = true;
                }
            });
        });
        return clicked;
    };

    const hideStaticAds = () => {
        AD_HIDE_SELECTORS.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => el.style.display = 'none');
        });
    };

    const skipSurveys = () => {
        SURVEY_SELECTORS.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => {
                const close = el.querySelector('button');
                if (close) close.click(); else el.remove();
            });
        });
    };

    // --- VÒNG LẶP CHÍNH (TIER 2: FALLBACK + MID-ROLL HANDLER) ---
    const runHunter = () => {
        createHeaderButton();
        if (!isHunterActive) return;

        const video = document.querySelector('video');

        // Quản lý Event Listeners
        if (video && video !== currentVideoElement) {
            if (currentVideoElement) {
                ['loadedmetadata', 'durationchange', 'play', 'playing', 'canplay'].forEach(evt => {
                    currentVideoElement.removeEventListener(evt, onMetadataLoaded);
                });
            }
            currentVideoElement = video;
            ['loadedmetadata', 'durationchange', 'play', 'playing', 'canplay'].forEach(evt => {
                video.addEventListener(evt, onMetadataLoaded);
            });
        }

        const isAd = checkIfAdIsShowing();

        if (isAd && video) {
            isAdProcessing = true;
            killActiveAd(video);
        } else {
            if (isAdProcessing && video) {
                if (video.muted) video.muted = false;
                if (video.playbackRate > 1) video.playbackRate = 1;
                isAdProcessing = false;
            }
            const controls = document.querySelector('.ytp-chrome-bottom');
            if (controls && controls.style.opacity === '0') controls.style.opacity = 1;
        }

        hideStaticAds();
        skipSurveys();
    };

    // --- MUTATION OBSERVER (MID-ROLL SUPPORT) ---
    const observer = new MutationObserver((mutations) => {
        if (!isHunterActive) return;
        for (const mutation of mutations) {
            if (mutation.type === 'attributes' && (mutation.attributeName === 'class' || mutation.attributeName === 'src')) {
                if (checkIfAdIsShowing()) {
                    runHunter();
                }
            }
        }
    });

    // --- KHỞI ĐỘNG ---
    updateSelectorsFromGithub();
    updateAdHideCSS();

    // TIER 1: Lắng nghe chuyển video (manual + auto-next)
    window.addEventListener('yt-navigate-finish', onNavigateFinish); // Khi video load xong
    window.addEventListener('yt-page-data-updated', onNavigateFinish); // Backup cho SPA

    // TIER 2: Loop liên tục (fallback + mid-roll)
    setInterval(runHunter, 50);

    const waitForPlayer = setInterval(() => {
        const player = document.querySelector('#movie_player');
        if (player) {
            observer.observe(player, { attributes: true, subtree: true, attributeFilter: ['class', 'src'] });
            clearInterval(waitForPlayer);
        }
    }, 500);

    console.log('[Hunter] v4.1: 2-Tier System (Decoy once + Fallback) 🛡️⚡');
})();