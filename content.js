(function () {
    // --- CẤU HÌNH ---
    // Load state from localStorage, default to true
    let isHunterActive = localStorage.getItem('hunter_status') !== 'false';
    const BUTTON_ID = 'youtube-hunter-btn';
    const SELECTORS_URL = 'https://raw.githubusercontent.com/Harrydtt/youtube-ad-hunter/main/selectors.json';
    const UPDATE_INTERVAL = 24 * 60 * 60 * 1000;

    // --- BIẾN TOÀN CỤC ---
    let currentVideoElement = null;

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
        // Premium Promo & Shorts Ads (v3.1)
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

        // Initial style based on saved state
        const bgColor = isHunterActive ? '#cc0000' : '#444';
        const text = isHunterActive ? '🎯 Hunter: ON' : '⚪ OFF';

        Object.assign(btn.style, {
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            margin: '0 8px', height: '36px', borderRadius: '18px', backgroundColor: bgColor,
            color: 'white', padding: '0 12px', fontSize: '12px', fontWeight: '700', zIndex: '9999'
        });
        btn.textContent = text;

        btn.onclick = () => {
            isHunterActive = !isHunterActive;
            localStorage.setItem('hunter_status', isHunterActive); // Save state

            btn.textContent = isHunterActive ? '🎯 Hunter: ON' : '⚪ OFF';
            btn.style.backgroundColor = isHunterActive ? '#cc0000' : '#444';
        };
        container.insertBefore(btn, container.firstChild);
    };

    // --- CORE LOGIC: XỬ LÝ ADS ---
    const killActiveAd = (video) => {
        if (!video) return;

        // 1. Click Skip ngay lập tức (Ưu tiên số 1)
        clickSkipButtons();

        // 2. Luôn tắt tiếng ads
        video.muted = true;

        // 3. Tăng tốc tối đa (16x)
        if (video.playbackRate < 16) video.playbackRate = 16;

        // 4. Force Play nếu bị pause (để tránh màn hình đen đứng yên)
        if (video.paused) video.play();

        // 5. Tuyệt đối KHÔNG tua (Seek)
        // Việc tua khiến server từ chối phục vụ -> Màn hình đen lâu.
        // Chỉ dùng Speed 16x là đủ nhanh (0.9s cho ads 15s) và an toàn.
    };

    // --- EVENT LISTENER ---
    const onVideoEvent = (e) => {
        if (!isHunterActive) return;
        // Check ngay khi video có sự kiện mới
        if (checkIfAdIsShowing()) {
            killActiveAd(e.target);
        }
    };

    // --- HÀM KIỂM TRA TRẠNG THÁI ADS ---
    const checkIfAdIsShowing = () => {
        const adElement = document.querySelector('.ad-showing, .ad-interrupting');
        const skipBtn = document.querySelector('.ytp-ad-skip-button');
        return !!(adElement || skipBtn);
    };

    // --- HÀM CLICK NÚT SKIP ---
    const clickSkipButtons = () => {
        SKIP_SELECTORS.forEach(selector => {
            document.querySelectorAll(selector).forEach(btn => {
                if (btn && btn.offsetParent !== null) { // Visible
                    btn.click();
                }
            });
        });
    };

    // --- VÒNG LẶP CHÍNH ---
    const runHunter = () => {
        createHeaderButton();
        if (!isHunterActive) return;

        const video = document.querySelector('video');

        // 1. Quản lý Event Listener gọn gàng
        if (video && video !== currentVideoElement) {
            // Remove old listeners
            if (currentVideoElement) {
                ['loadedmetadata', 'play', 'playing'].forEach(evt => {
                    currentVideoElement.removeEventListener(evt, onVideoEvent);
                });
            }
            currentVideoElement = video;
            // Add listeners
            ['loadedmetadata', 'play', 'playing'].forEach(evt => {
                video.addEventListener(evt, onVideoEvent);
            });
        }

        // 2. Xử lý Ads liên tục
        if (checkIfAdIsShowing() && video) {
            killActiveAd(video);
        } else {
            // Restore video chính (nếu cần) khi hết ads
            if (video && !checkIfAdIsShowing() && (video.muted || video.playbackRate > 1)) {
                // Chỉ restore nhẹ nhàng, tránh conflict
                if (video.playbackRate === 16) video.playbackRate = 1;
                if (video.muted) video.muted = false;
            }
        }

        // 3. Ẩn ads rác
        updateAdHideCSS(); // Đảm bảo CSS luôn inject
        SURVEY_SELECTORS.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => {
                const close = el.querySelector('button');
                if (close) close.click(); else el.remove();
            });
        });
    };

    // --- KHỞI ĐỘNG ---
    updateSelectorsFromGithub();
    updateAdHideCSS();

    // Loop kiểm tra mỗi 100ms
    setInterval(runHunter, 100);

    console.log('[Hunter] Loaded v3.7: Stable Speed Mode 🛡️');
})();