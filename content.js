(function () {
    // --- CẤU HÌNH ---
    let isHunterActive = true;
    const BUTTON_ID = 'youtube-hunter-btn';
    const SELECTORS_URL = 'https://raw.githubusercontent.com/Harrydtt/youtube-ad-hunter/main/selectors.json';
    const UPDATE_INTERVAL = 24 * 60 * 60 * 1000;
    const DECOY_ID = 'tPEE9ZwTmy0';

    // --- BIẾN CỜ QUAN TRỌNG (STATE FLAGS) ---
    let currentVideoElement = null;
    let isDecoyPending = false; // Cờ: Đang chờ cơ hội để dùng Decoy
    let isDecoyExecuting = false; // Cờ: Đang trong quá trình nhảy Decoy

    // --- SELECTORS ---
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

    // --- HELPER FETCH SELECTORS ---
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

    const updateAdHideCSS = () => {
        const id = 'hunter-hide-ads';
        const existing = document.getElementById(id);
        if (existing) existing.remove();
        const style = document.createElement('style');
        style.id = id;
        style.textContent = `${AD_HIDE_SELECTORS.join(', ')} { display: none !important; } .ytp-ad-module, .ytp-ad-image-overlay, .ytp-ad-overlay-slot { display: none !important; }`;
        document.head.appendChild(style);
    };

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
    // MODULE: INJECT & DECOY
    // ==========================================
    const injectScript = () => {
        if (document.getElementById('hunter-inject')) return;
        const script = document.createElement('script');
        script.id = 'hunter-inject';
        script.src = chrome.runtime.getURL('inject.js');
        document.head.appendChild(script);
    };

    const executeDecoyTrick = (targetId) => {
        console.log(`%c[Decoy] 🚨 Kích hoạt ngay lập tức!`, 'color: red; font-weight: bold;');
        isDecoyExecuting = true;
        isDecoyPending = false; // Đã dùng xong quyền Decoy cho lần chuyển bài này
        window.postMessage({ type: 'HUNTER_DECOY', decoyId: DECOY_ID, targetId: targetId }, '*');
    };

    // ==========================================
    // MODULE: UNIFIED HANDLER (BỘ NÃO TRUNG TÂM)
    // ==========================================

    // Hàm này sẽ được gọi bởi TẤT CẢ các triggers (Event, Observer, Interval)
    // Nó quyết định dùng vũ khí gì (Decoy hay Speedup)
    const handleAdDetection = (source, video) => {
        if (!isHunterActive) return;

        // 1. Kiểm tra xem có Ads không
        const isAd = checkIfAdIsShowing();

        if (isAd && video) {
            // --- CÓ ADS ---

            // Nếu đang chạy Decoy thì kệ nó, đừng can thiệp
            if (isDecoyExecuting) return;

            // KIỂM TRA QUYỀN ƯU TIÊN DECOY
            const urlParams = new URLSearchParams(window.location.search);
            const targetId = urlParams.get('v');

            if (isDecoyPending && targetId) {
                // ƯU TIÊN 1: DÙNG DECOY (Vũ khí hạng nặng)
                // Lợi dụng tốc độ detect của Logic 2 để kích hoạt Logic 1
                console.log(`%c[Hunter] ⚡ Phát hiện Ads từ ${source} -> Gọi DECOY`, 'color: magenta; font-weight: bold;');
                executeDecoyTrick(targetId);
            } else {
                // ƯU TIÊN 2: DÙNG SPEED/SKIP (Vũ khí hạng nhẹ)
                // Dùng khi Decoy đã xài rồi, hoặc ads mid-roll
                // console.log(`%c[Hunter] ⚡ Phát hiện Ads từ ${source} -> Gọi SPEEDUP`, 'color: orange;');
                killActiveAd(video);
            }
        } else {
            // --- KHÔNG CÓ ADS ---
            if (video && !isDecoyExecuting) {
                if (video.muted) video.muted = false;
                if (video.playbackRate > 1) video.playbackRate = 1;
            }
            const controls = document.querySelector('.ytp-chrome-bottom');
            if (controls && controls.style.opacity === '0') controls.style.opacity = 1;
        }

        hideStaticAds();
        skipSurveys();
    };

    // Logic cũ (Speedup/Skip) giờ chỉ là hàm phụ trợ
    const killActiveAd = (video) => {
        const skipped = clickSkipButtons();
        if (!video.muted) video.muted = true;
        if (video.playbackRate < 16) video.playbackRate = 16;
        if (video.readyState >= 1 && Number.isFinite(video.duration) && video.duration > 0 && video.currentTime < video.duration - 0.5) {
            video.currentTime = video.duration;
        }
    };

    // ==========================================
    // TRIGGERS (CÁC GIÁC QUAN)
    // ==========================================

    // 1. Event Listener: Loaded Metadata (Cực nhanh)
    const onMetadataLoaded = (e) => {
        handleAdDetection('MetadataEvent', e.target);
    };

    // 2. Interval Loop (Quét dọn những gì Event bỏ sót)
    const runHunterLoop = () => {
        createHeaderButton();
        const video = document.querySelector('video');

        // Quản lý Event Listeners
        if (video && video !== currentVideoElement) {
            if (currentVideoElement) {
                ['loadedmetadata', 'durationchange', 'play', 'playing'].forEach(evt => {
                    currentVideoElement.removeEventListener(evt, onMetadataLoaded);
                });
            }
            currentVideoElement = video;
            ['loadedmetadata', 'durationchange', 'play', 'playing'].forEach(evt => {
                video.addEventListener(evt, onMetadataLoaded);
            });
        }

        handleAdDetection('IntervalLoop', video);
    };

    // 3. Mutation Observer (Bắt thay đổi class DOM)
    const observer = new MutationObserver((mutations) => {
        if (!isHunterActive) return;
        for (const mutation of mutations) {
            if (mutation.type === 'attributes' && (mutation.attributeName === 'class' || mutation.attributeName === 'src')) {
                const video = document.querySelector('video');
                handleAdDetection('MutationObserver', video);
            }
        }
    });

    // ==========================================
    // NAVIGATE HANDLER
    // ==========================================
    let lastVideoId = null;

    const onNavigateStart = () => {
        console.log('%c[Hunter] 🚀 Chuyển bài -> Nạp đạn Decoy', 'color: yellow');

        // Chỉ đơn giản là nạp cờ, không cần chạy vòng lặp quét riêng nữa
        // Các trigger ở trên (Metadata/Loop) sẽ tự thấy cờ này và bắn
        isDecoyPending = true;
        isDecoyExecuting = false;

        // Timeout an toàn: Nếu sau 5s mà không gặp ads nào thì hủy cờ Decoy
        // Để tránh việc kích hoạt Decoy nhầm cho video sau (mid-roll)
        setTimeout(() => {
            if (isDecoyPending) {
                isDecoyPending = false;
                // console.log('[Hunter] Timeout Decoy pending -> Video sạch');
            }
        }, 5000);
    };

    const checkAndTriggerNavigate = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const currentVideoId = urlParams.get('v');

        if (currentVideoId && currentVideoId !== lastVideoId) {
            lastVideoId = currentVideoId;
            onNavigateStart();
        }
    };

    // ==========================================
    // HELPER FUNCTIONS
    // ==========================================
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

    // ==========================================
    // INIT
    // ==========================================
    updateSelectorsFromGithub();
    updateAdHideCSS();
    injectScript();

    window.addEventListener('message', (e) => {
        if (e.data.type === 'HUNTER_DECOY_DONE') {
            console.log('%c[Decoy] 🔄 Xong! Mở khóa Speedup.', 'color: cyan');
            isDecoyExecuting = false;
            // isDecoyPending đã set false lúc execute rồi

            // Fix mute
            const v = document.querySelector('video');
            if (v && v.muted) v.muted = false;
        }

        if (e.data.type === 'HUNTER_NAVIGATE_URGENT') {
            checkAndTriggerNavigate();
        }
    });

    setTimeout(() => { checkAndTriggerNavigate(); }, 500);
    window.addEventListener('yt-navigate-start', checkAndTriggerNavigate);

    // Vòng lặp chính chạy song song với Event
    setInterval(runHunterLoop, 50);

    const waitForPlayer = setInterval(() => {
        const player = document.querySelector('#movie_player');
        if (player) {
            observer.observe(player, { attributes: true, subtree: true, attributeFilter: ['class', 'src'] });
            clearInterval(waitForPlayer);
        }
    }, 500);

    console.log('[Hunter] v8.0: Unified Detection Engine 🧠⚡');
})();