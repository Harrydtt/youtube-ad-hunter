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
    let decoyTriggered = false; // Đánh dấu đã dùng Decoy cho video này chưa
    let decoyInterval = null;

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
    // Áp dụng khi chuyển video mới và phát hiện ads đầu video
    // ==========================================
    const executeDecoyTrick = (player, targetId, playlistId, playlistIndex) => {
        console.log(`%c[Hunter] 🚨 DECOY TRICK: Phát hiện Ads! Kích hoạt...`, 'color: red; font-weight: bold;');

        // Nhảy sang Shorts (Decoy)
        player.loadVideoById(DECOY_ID);

        // Quay về sau 150ms - Giữ Playlist nếu có
        setTimeout(() => {
            console.log(`%c[Hunter] 🔄 Decoy xong. Quay về video: ${targetId}`, 'color: cyan');

            if (playlistId && playlistIndex !== null) {
                // Có Playlist -> Load với index để giữ nguyên playlist
                player.loadPlaylist({
                    list: playlistId,
                    listType: 'playlist',
                    index: playlistIndex
                });
            } else {
                // Không có Playlist -> Load video đơn
                player.loadVideoById(targetId);
            }

            decoyTriggered = true; // Đánh dấu đã thử Decoy
        }, 150);
    };

    const onNavigateStart = () => {
        if (!isHunterActive) return;

        console.log('%c[Hunter] 🚀 Chuyển video mới... Bắt đầu quét Ads...', 'color: yellow');

        // Reset trạng thái
        decoyTriggered = false;
        if (decoyInterval) clearInterval(decoyInterval);

        let attempts = 0;

        // Quét Ads trong 3 giây đầu
        decoyInterval = setInterval(() => {
            attempts++;
            const player = document.getElementById('movie_player');
            const isAd = document.querySelector('.ad-showing, .ad-interrupting');

            // Lấy thông tin video và playlist từ URL
            const urlParams = new URLSearchParams(window.location.search);
            const targetId = urlParams.get('v');
            const playlistId = urlParams.get('list');
            const playlistIndex = parseInt(urlParams.get('index')) || 0;

            if (isAd && player && targetId && !decoyTriggered) {
                // CÓ ADS -> Kích hoạt Decoy ngay
                clearInterval(decoyInterval);
                executeDecoyTrick(player, targetId, playlistId, playlistIndex);
            }

            // Timeout sau 60 lần (3 giây) -> Dừng quét, nhường cho Tier 2
            if (attempts > 60) {
                clearInterval(decoyInterval);
                console.log('%c[Hunter] ✅ Decoy scan complete. Tier 2 đang xử lý nếu cần.', 'color: gray');
            }
        }, 50);
    };

    // ==========================================
    // TẦNG 2: SPEED + SEEK (FALLBACK)
    // Áp dụng khi:
    // 1. Decoy đã chạy nhưng ads vẫn còn (fail)
    // 2. Mid-roll Ads (ads giữa video)
    // ==========================================
    const killActiveAd = (video) => {
        if (!video) return;

        // 1. Click Skip ngay lập tức
        clickSkipButtons();

        // 2. Tắt tiếng ads
        video.muted = true;

        // 3. Tăng tốc x16
        if (video.playbackRate < 16) video.playbackRate = 16;

        // 4. Tua đến cuối (nếu duration hữu hạn)
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
        SKIP_SELECTORS.forEach(selector => {
            document.querySelectorAll(selector).forEach(btn => {
                if (btn && btn.offsetParent !== null) btn.click();
            });
        });
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

    // TIER 1: Lắng nghe chuyển video
    window.addEventListener('yt-navigate-start', onNavigateStart);

    // TIER 2: Loop liên tục (fallback + mid-roll)
    setInterval(runHunter, 50);

    const waitForPlayer = setInterval(() => {
        const player = document.querySelector('#movie_player');
        if (player) {
            observer.observe(player, { attributes: true, subtree: true, attributeFilter: ['class', 'src'] });
            clearInterval(waitForPlayer);
        }
    }, 500);

    console.log('[Hunter] v4.0: 2-Tier System (Decoy + Fallback) 🛡️⚡');
})();