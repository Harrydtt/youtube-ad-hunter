(function () {
    // --- CẤU HÌNH ---
    let isHunterActive = true;
    const BUTTON_ID = 'youtube-hunter-btn';
    const SELECTORS_URL = 'https://raw.githubusercontent.com/Harrydtt/youtube-ad-hunter/main/selectors.json';
    const UPDATE_INTERVAL = 24 * 60 * 60 * 1000;
    const DECOY_ID = 'tPEE9ZwTmy0';

    // --- BIẾN TOÀN CỤC & CỜ TRẠNG THÁI ---
    let currentVideoElement = null;
    let isAdProcessing = false;

    // Cờ kiểm soát xung đột logic
    let isDecoyScanning = false; // Đang trong giai đoạn ưu tiên quét Decoy
    let isDecoyExecuting = false; // Đang thực hiện cú nhảy Decoy

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
    // TẦNG 1: DECOY TRICK (LOGIC 1)
    // ==========================================
    let injectReady = false;

    const injectScript = () => {
        if (document.getElementById('hunter-inject')) return;
        const script = document.createElement('script');
        script.id = 'hunter-inject';
        script.src = chrome.runtime.getURL('inject.js');
        document.head.appendChild(script);
        script.onload = () => { injectReady = true; };
    };

    const executeDecoyTrick = (targetId) => {
        console.log(`%c[Decoy] 🚨 Kích hoạt!`, 'color: red; font-weight: bold;');
        isDecoyExecuting = true; // Đánh dấu đang thực hiện nhảy
        window.postMessage({ type: 'HUNTER_DECOY', decoyId: DECOY_ID, targetId: targetId }, '*');
    };

    let scanInterval = null;

    const onNavigateStart = () => {
        if (!isHunterActive) return;

        console.log('%c[Hunter] 🚀 Chuyển bài... Ưu tiên Decoy 3s...', 'color: yellow');

        // BẬT CHẾ ĐỘ ƯU TIÊN DECOY -> CHẶN LOGIC 2
        isDecoyScanning = true;
        isDecoyExecuting = false;

        if (scanInterval) clearInterval(scanInterval);

        let attempts = 0;

        scanInterval = setInterval(() => {
            attempts++;
            const isAd = document.querySelector('.ad-showing, .ad-interrupting');
            const urlParams = new URLSearchParams(window.location.search);
            const targetId = urlParams.get('v');

            // Nếu phát hiện Ads trong thời gian quét
            if (isAd && targetId && !isDecoyExecuting) {
                clearInterval(scanInterval);
                console.log(`%c[Hunter] 🔍 Phát hiện ADS (attempt ${attempts}) -> Gọi Decoy`, 'color: red; font-weight: bold;');
                executeDecoyTrick(targetId);
            }

            // Hết 3 giây không thấy gì -> Thả cho Logic 2 chạy
            if (attempts > 60) {
                clearInterval(scanInterval);
                if (!isDecoyExecuting) {
                    console.log('%c[Hunter] ✅ Video sạch (hoặc timeout). Thả Logic 2.', 'color: green');
                    isDecoyScanning = false; // Tắt chế độ ưu tiên
                }
            }
        }, 50);
    };

    // ==========================================
    // TẦNG 2: SPEED + SEEK (FALLBACK)
    // ==========================================
    const killActiveAd = (video) => {
        if (!video) return;

        // --- KHÓA LOGIC 2 ---
        // Nếu Decoy đang quét hoặc đang nhảy -> Logic 2 đứng im
        if (isDecoyScanning || isDecoyExecuting) {
            // Chỉ mute để đỡ ồn trong lúc chờ Decoy kích hoạt
            if (!video.muted) video.muted = true;
            return;
        }

        // Logic cũ (chỉ chạy khi Decoy đã xong hoặc timeout)
        const skipped = clickSkipButtons();
        if (skipped) console.log(`%c[Logic 2] ✓ Click SKIP`, 'color: lime');

        if (!video.muted) {
            video.muted = true;
            console.log(`%c[Logic 2] ✓ MUTE`, 'color: #aaa');
        }

        if (video.playbackRate < 16) {
            video.playbackRate = 16;
            console.log(`%c[Logic 2] ✓ Speed x16`, 'color: #ffd93d');
        }

        if (video.readyState >= 1 && Number.isFinite(video.duration) && video.duration > 0 && video.currentTime < video.duration - 0.5) {
            video.currentTime = video.duration;
            console.log(`%c[Logic 2] ✓ SEEK đến cuối`, 'color: cyan');
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

    // --- MAIN LOOP ---
    const runHunter = () => {
        createHeaderButton();
        if (!isHunterActive) return;

        const video = document.querySelector('video');

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
            killActiveAd(video); // Gọi hàm xử lý (đã có check khóa bên trong)
        } else {
            // Khi hết ads -> Reset mọi trạng thái
            if (isAdProcessing && video) {
                // Chỉ unmute khi Decoy đã chạy xong hẳn
                if (!isDecoyScanning && !isDecoyExecuting) {
                    if (video.muted) video.muted = false;
                    if (video.playbackRate > 1) video.playbackRate = 1;
                    isAdProcessing = false;
                }
            }
            const controls = document.querySelector('.ytp-chrome-bottom');
            if (controls && controls.style.opacity === '0') controls.style.opacity = 1;
        }

        hideStaticAds();
        skipSurveys();
    };

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

    // --- INIT ---
    updateSelectorsFromGithub();
    updateAdHideCSS();
    injectScript();

    let lastVideoId = null;

    const checkAndTriggerNavigate = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const currentVideoId = urlParams.get('v');

        if (currentVideoId && currentVideoId !== lastVideoId) {
            console.log(`%c[Hunter] ⚡ Đã bắt được user chuyển bài: ${lastVideoId} → ${currentVideoId}`, 'color: green; font-weight: bold; font-size: 14px;');
            lastVideoId = currentVideoId;
            onNavigateStart(); // Kích hoạt quy trình ưu tiên Decoy
        }
    };

    window.addEventListener('message', (e) => {
        // Khi Decoy chạy xong -> Thả Logic 2 ra để dọn dẹp nếu cần
        if (e.data.type === 'HUNTER_DECOY_DONE') {
            console.log('%c[Decoy] 🔄 Quay về xong! Mở khóa Logic 2.', 'color: cyan');
            isDecoyExecuting = false;
            isDecoyScanning = false;

            // Fix lỗi sau khi quay về video vẫn bị mute
            const v = document.querySelector('video');
            if (v && v.muted) v.muted = false;
        }

        if (e.data.type === 'HUNTER_NAVIGATE_URGENT') {
            checkAndTriggerNavigate();
        }
    });

    setTimeout(() => { checkAndTriggerNavigate(); }, 500);
    window.addEventListener('yt-navigate-start', checkAndTriggerNavigate);

    setInterval(runHunter, 50);

    const waitForPlayer = setInterval(() => {
        const player = document.querySelector('#movie_player');
        if (player) {
            observer.observe(player, { attributes: true, subtree: true, attributeFilter: ['class', 'src'] });
            clearInterval(waitForPlayer);
        }
    }, 500);

    console.log('[Hunter] v7.0: Priority Lock Implemented 🛡️🔒');
})();