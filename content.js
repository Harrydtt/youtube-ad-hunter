(function () {
    // --- CẤU HÌNH ---
    let isHunterActive = true;
    const BUTTON_ID = 'youtube-hunter-btn';
    const SELECTORS_URL = 'https://raw.githubusercontent.com/Harrydtt/youtube-ad-hunter/main/selectors.json';
    const UPDATE_INTERVAL = 24 * 60 * 60 * 1000;

    // --- BIẾN TOÀN CỤC ---
    let currentVideoElement = null;
    let isAdProcessing = false; // Cờ đánh dấu đang xử lý ads

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

    // --- CORE LOGIC: XỬ LÝ 1 VIDEO ADS ---
    const killActiveAd = (video) => {
        if (!video) return;

        // 1. Click Skip ngay lập tức (Ưu tiên số 1)
        const skipped = clickSkipButtons();

        // 2. Luôn tắt tiếng ads (bất kể loại video nào)
        video.muted = true;

        // 3. Tăng tốc tối đa (16x) - luôn áp dụng
        if (video.playbackRate < 16) video.playbackRate = 16;

        // 4. Tua đến cuối (CHỈ khi duration hữu hạn - không phải Live)
        // readyState >= 1 = HAVE_METADATA (biết được duration)
        if (video.readyState >= 1 && Number.isFinite(video.duration) && video.duration > 0) {
            // Tua đến cuối (Spawn Kill)
            if (video.currentTime < video.duration - 0.1) {
                video.currentTime = video.duration;
            }
        }
        // Nếu duration = Infinity (Live stream ads):
        // -> Đã mute + 16x speed ở trên, không tua (không thể tua Live)
        // -> Ads sẽ chạy nhanh gấp 16 lần rồi tự hết
    };

    // --- EVENT LISTENER: BẮT NGAY KHI LOAD METADATA ---
    // Đây là chìa khóa để xử lý 2 Ads liên tục và Mid-roll
    const onMetadataLoaded = (e) => {
        if (!isHunterActive) return;
        const video = e.target;

        // Check ngay xem lúc video load lên thì có class quảng cáo không
        if (checkIfAdIsShowing()) {
            killActiveAd(video);
        }
    };

    // --- HÀM KIỂM TRA TRẠNG THÁI ADS ---
    const checkIfAdIsShowing = () => {
        const adElement = document.querySelector('.ad-showing, .ad-interrupting');
        // Đôi khi class chưa kịp add, check thêm sự tồn tại của nút skip hoặc overlay
        const skipBtn = document.querySelector('.ytp-ad-skip-button');
        return !!(adElement || skipBtn);
    };

    // --- HÀM CLICK NÚT SKIP ---
    const clickSkipButtons = () => {
        let clicked = false;
        SKIP_SELECTORS.forEach(selector => {
            document.querySelectorAll(selector).forEach(btn => {
                if (btn && btn.offsetParent !== null) { // Visible
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

    // --- VÒNG LẶP CHÍNH (QUÉT LIÊN TỤC 50ms) ---
    const runHunter = () => {
        createHeaderButton();
        if (!isHunterActive) return;

        const video = document.querySelector('video');

        // 1. Quản lý Event Listener (Cho trường hợp chuyển video SPA)
        if (video && video !== currentVideoElement) {
            if (currentVideoElement) {
                currentVideoElement.removeEventListener('loadedmetadata', onMetadataLoaded);
                currentVideoElement.removeEventListener('durationchange', onMetadataLoaded);
            }
            currentVideoElement = video;
            video.addEventListener('loadedmetadata', onMetadataLoaded);
            video.addEventListener('durationchange', onMetadataLoaded);
        }

        const isAd = checkIfAdIsShowing();

        if (isAd && video) {
            // ĐANG CÓ ADS
            isAdProcessing = true;
            killActiveAd(video);
        } else {
            // KHÔNG CÓ ADS
            // Chỉ restore video chính khi chắc chắn vừa thoát khỏi trạng thái xử lý ads
            if (isAdProcessing && video) {
                if (video.muted) video.muted = false;
                if (video.playbackRate > 1) video.playbackRate = 1;
                isAdProcessing = false;
            }

            // Fix lỗi mất controls khi hết ads
            const controls = document.querySelector('.ytp-chrome-bottom');
            if (controls && controls.style.opacity === '0') controls.style.opacity = 1;
        }

        hideStaticAds();
        skipSurveys();
    };

    // --- MUTATION OBSERVER (HỖ TRỢ MID-ROLL) ---
    // Giúp phát hiện khoảnh khắc class 'ad-showing' được add vào giữa video
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

    // Interval cực nhanh để bắt 2 ads liên tiếp
    setInterval(runHunter, 50);

    const waitForPlayer = setInterval(() => {
        const player = document.querySelector('#movie_player');
        if (player) {
            observer.observe(player, { attributes: true, subtree: true, attributeFilter: ['class', 'src'] });
            clearInterval(waitForPlayer);
        }
    }, 500);

    console.log('[Hunter] Loaded v3.0: 1-Ad, 2-Ads, Mid-roll supported 🛡️');
})();