(function () {
    // --- CẤU HÌNH ---
    let isHunterActive = true;
    const BUTTON_ID = 'youtube-hunter-btn';

    // URL của file JSON trên GitHub
    const SELECTORS_URL = 'https://raw.githubusercontent.com/Harrydtt/youtube-ad-hunter/main/selectors.json';
    const UPDATE_INTERVAL = 24 * 60 * 60 * 1000; // 24 giờ

    // --- SELECTORS MẶC ĐỊNH (FALLBACK) ---
    let SKIP_SELECTORS = [
        '.ytp-ad-skip-button',
        '.ytp-ad-skip-button-modern',
        '.ytp-ad-skip-button-slot',
        '.ytp-skip-ad-button',
        '.videoAdUiSkipButton',
        'button.ytp-ad-skip-button',
        'button[class*="skip"]',
        '[id="skip-button:"]',
        'button[aria-label^="Skip ad"]',
        'button[aria-label^="Skip Ad"]',
        'button[aria-label^="Bỏ qua"]',           // Tiếng Việt
        '.ytp-ad-skip-button-container button',
        '.ytp-ad-overlay-close-button',           // Overlay close
    ];

    // --- SELECTORS CHO QUẢNG CÁO CẦN ẨN ---
    let AD_HIDE_SELECTORS = [
        'ytd-ad-slot-renderer',                   // Sidebar ads
        'ytd-banner-promo-renderer',              // Banner promos
        'ytd-statement-banner-renderer',          // Statement banners
        'ytd-in-feed-ad-layout-renderer',         // In-feed ads
        'ytd-display-ad-renderer',                // Display ads
        '#player-ads',                            // Player ads container
        '.ytp-ad-overlay-container',              // Overlay ads
        '.ytp-ad-text-overlay',                   // Text overlay
        'ytd-promoted-sparkles-web-renderer',     // Promoted content
        'ytd-promoted-video-renderer',            // Promoted videos
        '#masthead-ad',                           // Masthead ad
        'ytd-companion-slot-renderer',            // Companion ads
    ];

    // --- SELECTORS CHO SURVEY/POPUP ---
    let SURVEY_SELECTORS = [
        '.ytp-ad-survey',
        '.ytp-ad-feedback-dialog-renderer',
        'tp-yt-paper-dialog',
        '.ytd-popup-container',
        'ytd-enforcement-message-view-model',     // Ad blocker warning
    ];

    // --- AUTO-UPDATE SELECTORS TỪ GITHUB ---
    const updateSelectorsFromGithub = async () => {
        try {
            const lastUpdate = localStorage.getItem('hunter_selectors_updated');
            const now = Date.now();

            // Kiểm tra nếu đã update gần đây
            if (lastUpdate && (now - parseInt(lastUpdate)) < UPDATE_INTERVAL) {
                const cached = localStorage.getItem('hunter_selectors');
                if (cached) {
                    applySelectors(JSON.parse(cached));
                    console.log('[Hunter] Loaded selectors from cache');
                    return;
                }
            }

            // Fetch từ GitHub
            const response = await fetch(SELECTORS_URL);
            if (response.ok) {
                const data = await response.json();
                applySelectors(data);
                localStorage.setItem('hunter_selectors', JSON.stringify(data));
                localStorage.setItem('hunter_selectors_updated', now.toString());
                console.log(`[Hunter] Updated selectors v${data.version}`);
            }
        } catch (error) {
            console.log('[Hunter] Using default selectors (GitHub unreachable)');
        }
    };

    const applySelectors = (data) => {
        if (data.skipSelectors) SKIP_SELECTORS = data.skipSelectors;
        if (data.adHideSelectors) AD_HIDE_SELECTORS = data.adHideSelectors;
        if (data.surveySelectors) SURVEY_SELECTORS = data.surveySelectors;
        updateAdHideCSS();
    };

    // --- CSS INJECTION (CẬP NHẬT ĐỘNG) ---
    let adHideStyleElement = null;

    const updateAdHideCSS = () => {
        if (adHideStyleElement) adHideStyleElement.remove();
        adHideStyleElement = document.createElement('style');
        adHideStyleElement.id = 'hunter-hide-ads';
        adHideStyleElement.textContent = `
            ${AD_HIDE_SELECTORS.join(', ')} { display: none !important; }
            .ytp-ad-module, .ytp-ad-image-overlay, .ytp-ad-overlay-slot { display: none !important; }
        `;
        document.head.appendChild(adHideStyleElement);
    };

    // --- HÀM TẠO NÚT TRÊN HEADER ---
    const createHeaderButton = () => {
        if (document.getElementById(BUTTON_ID)) return;

        // Thử nhiều vị trí khác nhau để chèn nút
        let container = document.querySelector('#masthead #end #buttons');

        // Fallback 1: Nếu không có #buttons, tìm #end
        if (!container) {
            container = document.querySelector('#masthead #end');
        }

        // Fallback 2: Tìm container của Avatar/Sign in
        if (!container) {
            container = document.querySelector('div#buttons.ytd-masthead');
        }

        if (!container) return;

        const btnContainer = document.createElement('div');
        btnContainer.id = BUTTON_ID;

        Object.assign(btnContainer.style, {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            marginRight: '8px',
            marginLeft: '8px',
            height: '36px',             // Chiều cao chuẩn 36px
            maxHeight: '36px',          // Ép cứng chiều cao tối đa
            minWidth: '36px',
            borderRadius: '18px',
            backgroundColor: '#cc0000',
            color: 'white',
            padding: '0 12px',
            fontSize: '14px',
            fontWeight: '500',
            fontFamily: 'Roboto, Arial, sans-serif',
            userSelect: 'none',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            zIndex: '9999',
            boxSizing: 'border-box'     // Đảm bảo padding không làm to nút
        });

        // Tooltip
        btnContainer.title = 'Extension: YouTube Ad Hunter';

        const label = document.createElement('div');
        Object.assign(label.style, {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: '1',            // Line height tối thiểu
            marginTop: '-1px'           // Căn chỉnh vi mô
        });

        const mainText = document.createElement('span');
        mainText.textContent = '🎯 Hunter: ON';
        mainText.style.fontSize = '12px'; // Giảm thêm chút cho vừa vặn
        mainText.style.fontWeight = '700';

        const subText = document.createElement('span');
        subText.textContent = 'by Ad Hunter';
        Object.assign(subText.style, {
            fontSize: '8px',
            opacity: '0.9',
            fontWeight: '400',
            marginTop: '1px'            // Khoảng cách nhỏ với text chính
        });

        label.appendChild(mainText);
        label.appendChild(subText);
        btnContainer.appendChild(label);

        // Hover effect
        btnContainer.onmouseenter = () => {
            btnContainer.style.transform = 'scale(1.05)';
        };
        btnContainer.onmouseleave = () => {
            btnContainer.style.transform = 'scale(1)';
        };

        btnContainer.onclick = () => {
            isHunterActive = !isHunterActive;
            mainText.textContent = isHunterActive ? '🎯 Hunter: ON' : '⚪ OFF';
            btnContainer.style.backgroundColor = isHunterActive ? '#cc0000' : '#444';
            btnContainer.style.color = isHunterActive ? 'white' : '#aaa';
            console.log(`[Hunter] ${isHunterActive ? 'Activated' : 'Deactivated'}`);
        };

        // Chèn vào đầu container
        if (container.firstChild) {
            container.insertBefore(btnContainer, container.firstChild);
        } else {
            container.appendChild(btnContainer);
        }

        console.log('[Hunter] Button created at:', container);
    };

    // --- HÀM CLICK NÚT SKIP (CẢI TIẾN) ---
    const clickSkipButtons = () => {
        let clicked = false;
        SKIP_SELECTORS.forEach(selector => {
            const buttons = document.querySelectorAll(selector);
            buttons.forEach(btn => {
                if (btn && btn.offsetParent !== null) { // Kiểm tra visible
                    try {
                        btn.click();
                        clicked = true;
                        console.log(`[Hunter] Clicked: ${selector}`);
                    } catch (e) {
                        // Thử dispatch event nếu click() không work
                        btn.dispatchEvent(new MouseEvent('click', {
                            bubbles: true,
                            cancelable: true,
                            view: window
                        }));
                    }
                }
            });
        });
        return clicked;
    };

    // --- HÀM ẨN QUẢNG CÁO STATIC ---
    const hideStaticAds = () => {
        AD_HIDE_SELECTORS.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                if (el && el.style.display !== 'none') {
                    el.style.display = 'none';
                    console.log(`[Hunter] Hidden: ${selector}`);
                }
            });
        });
    };

    // --- HÀM SKIP SURVEY ---
    const skipSurveys = () => {
        SURVEY_SELECTORS.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                if (el) {
                    // Tìm nút close/skip trong survey
                    const closeBtn = el.querySelector('[aria-label="Close"], [aria-label="Đóng"], button');
                    if (closeBtn) {
                        closeBtn.click();
                        console.log(`[Hunter] Survey closed: ${selector}`);
                    } else {
                        el.remove();
                        console.log(`[Hunter] Survey removed: ${selector}`);
                    }
                }
            });
        });
    };

    // --- LOGIC DIỆT QUẢNG CÁO CHÍNH (BẢN NÂNG CẤP) ---
    const runHunter = () => {
        createHeaderButton();
        if (!isHunterActive) return;

        const video = document.querySelector('video');
        const adShowing = document.querySelector('.ad-showing, .ad-interrupting');

        // Cập nhật selector này để bắt cả nút skip dạng mới nhất
        // Đôi khi nút skip xuất hiện nhưng chưa visible, ta vẫn click
        const skipped = clickSkipButtons();

        if (adShowing && video) {
            // Đang có quảng cáo

            // 1. Tắt tiếng ngay lập tức
            video.muted = true;

            // 2. Tăng tốc tối đa (ép xung)
            // Ép playbackRate liên tục vì YouTube hay reset về 1
            if (video.playbackRate < 16) {
                video.playbackRate = 16;
            }

            // 3. Tua nhanh đến cuối (Hack duration)
            // Chỉ tua nếu chưa bấm được nút skip (để tránh xung đột lệnh)
            if (!skipped && Number.isFinite(video.duration)) {
                // Nếu video còn dài hơn 0.1s thì mới tua
                if (video.currentTime < video.duration - 0.1) {
                    video.currentTime = video.duration - 0.1;
                }
            }

        } else {
            // Không có quảng cáo hoặc quảng cáo đã hết
            if (video) {
                // Chỉ reset khi chắc chắn không còn class quảng cáo
                // Và video đang chạy quá nhanh (dấu hiệu vừa thoát ad)
                if (video.playbackRate > 1 && !adShowing) {
                    video.playbackRate = 1;
                    video.muted = false;
                }
            }

            // Hiện lại controls nếu bị ẩn
            const controls = document.querySelector('.ytp-chrome-bottom');
            if (controls && controls.style.opacity === '0') {
                controls.style.opacity = 1;
                controls.style.display = 'block';
            }
        }

        // Luôn ẩn static ads và surveys
        hideStaticAds();
        skipSurveys();
    };

    // --- MUTATION OBSERVER (PHẢN ỨNG NHANH) ---
    const observer = new MutationObserver((mutations) => {
        if (!isHunterActive) return;

        for (const mutation of mutations) {
            // Kiểm tra nếu có element mới liên quan đến quảng cáo
            if (mutation.addedNodes.length > 0) {
                const target = mutation.target;
                if (target.classList &&
                    (target.classList.contains('ad-showing') ||
                        target.classList.contains('ad-interrupting') ||
                        target.classList.contains('ytp-ad-player-overlay'))) {
                    runHunter();
                    return;
                }
            }

            // Kiểm tra class changes
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const classList = mutation.target.classList;
                if (classList && classList.contains('ad-showing')) {
                    runHunter();
                    return;
                }
            }
        }
    });

    // Start observing
    const startObserver = () => {
        const player = document.querySelector('#movie_player');
        if (player) {
            observer.observe(player, {
                attributes: true,
                childList: true,
                subtree: true,
                attributeFilter: ['class']
            });
            console.log('[Hunter] MutationObserver started');
        }
    };

    // --- KHỞI ĐỘNG ---
    updateSelectorsFromGithub();
    updateAdHideCSS();

    // THAY ĐỔI QUAN TRỌNG: Giảm thời gian loop xuống 50ms (cũ là 200ms)
    // Giúp phản xạ nhanh gấp 4 lần khi chuyển giao giữa Ad 1 và Ad 2
    setInterval(runHunter, 50);

    const waitForPlayer = setInterval(() => {
        if (document.querySelector('#movie_player')) {
            startObserver();
            clearInterval(waitForPlayer);
        }
    }, 500);

    console.log('[Hunter] Extension Loaded v2.2 🚀 (Aggressive Mode)');
})();