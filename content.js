// content.js - v35.0: Extract-Before-Cut + Popup Cleaner
(function () {
    console.log('[Focus] Initializing v35.0... 👻');

    // --- STATE (Settings loaded from storage) ---
    let settings = {
        hunterActive: true,
        jsonCutEnabled: true,
        offscreenEnabled: true,
        logic2Enabled: true,
        staticAdsEnabled: false
    };

    // Selectors for cleaning visual distractions (respects toggle)
    let STATIC_AD_SELECTORS = [
        '#masthead-ad',
        '#player-ads',
        'ytd-ad-slot-renderer',
        'ytd-banner-promo-renderer',
        'ytd-statement-banner-renderer',
        'ytd-in-feed-ad-layout-renderer',
        'ytd-display-ad-renderer',
        '.ytp-ad-overlay-container',
        '.ytp-ad-text-overlay',
        'ytd-promoted-sparkles-web-renderer',
        'ytd-promoted-video-renderer',
        'ytd-companion-slot-renderer',
        '.yt-mealbar-promo-renderer',
        'ytd-mealbar-promo-renderer',
        '.ytd-merch-shelf-renderer',
        'ytd-merch-shelf-renderer',
        'ytd-rich-item-renderer.style-scope.ytd-rich-grid-row #content:has(ytd-display-ad-renderer)',
        'ytd-rich-item-renderer.style-scope.ytd-rich-grid-row #content:has(ytd-ad-slot-renderer)'
    ];

    // Anti-adblock popups (ALWAYS hide, regardless of settings)
    const ANTI_ADBLOCK_SELECTORS = [
        'ytd-enforcement-message-view-model',
        'tp-yt-paper-dialog.ytd-popup-container:has(ytd-enforcement-message-view-model)',
        '.yt-playability-error-supported-renderers',
        'div[id^="enforcement-message"]'
    ];

    const SELECTORS_URL = 'https://raw.githubusercontent.com/Harrydtt/youtube-ad-hunter/main/selectors.json';
    const UPDATE_INTERVAL = 3600 * 1000;

    // Load settings from storage
    const loadSettings = () => {
        chrome.storage.local.get([
            'hunterActive',
            'jsonCutEnabled',
            'offscreenEnabled',
            'logic2Enabled',
            'staticAdsEnabled'
        ], (result) => {
            settings.hunterActive = result.hunterActive !== false;
            settings.jsonCutEnabled = result.jsonCutEnabled !== false;
            settings.offscreenEnabled = result.offscreenEnabled !== false;
            settings.logic2Enabled = result.logic2Enabled !== false;
            settings.staticAdsEnabled = result.staticAdsEnabled === true;

            console.log('[Focus] Settings loaded:', settings);
            updateButtonAppearance();
            syncWithInjectJS();
        });
    };

    // Listen for storage changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local') {
            if (changes.hunterActive) settings.hunterActive = changes.hunterActive.newValue;
            if (changes.jsonCutEnabled) settings.jsonCutEnabled = changes.jsonCutEnabled.newValue;
            if (changes.offscreenEnabled) settings.offscreenEnabled = changes.offscreenEnabled.newValue;
            if (changes.logic2Enabled) settings.logic2Enabled = changes.logic2Enabled.newValue;
            if (changes.staticAdsEnabled) settings.staticAdsEnabled = changes.staticAdsEnabled.newValue;

            console.log('[Focus] Settings updated:', settings);
            updateButtonAppearance();
            syncWithInjectJS();
        }
    });

    const syncWithInjectJS = () => {
        window.postMessage({ type: 'FOCUS_SET_FILTER', enabled: settings.hunterActive && settings.jsonCutEnabled }, '*');
    };

    const updateButtonAppearance = () => {
        const btn = document.getElementById('focus-toggle-btn');
        if (btn) {
            btn.textContent = settings.hunterActive ? '🎯 Focus: ON' : '🎯 Focus: OFF';
            btn.style.background = settings.hunterActive ? '#667eea' : '#666';
        }
    };

    const checkAndTriggerNavigate = () => {
        window.postMessage({ type: 'FOCUS_NAVIGATE_URGENT' }, '*');
    };

    // Navigation optimization selectors
    const SKIP_SELECTORS = [
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
        'button[aria-label^="Bỏ qua"]',
        '.ytp-ad-skip-button-container button',
        '.ytp-ad-overlay-close-button',
        '#skip-button\\:6 > span > button',
        'button.ytp-ad-skip-button-modern.ytp-button'
    ];

    // Check if content optimization is needed
    const checkIfOptimizationNeeded = () => {
        return !!(
            document.querySelector('.ad-showing') ||
            document.querySelector('.ad-interrupting') ||
            document.querySelector('.ytp-ad-skip-button')
        );
    };

    // --- NATIVE CLICK SIMULATOR (Mô phỏng ngón tay thật) ---
    const triggerNativeClick = (element) => {
        const events = ['mouseover', 'mousedown', 'mouseup', 'click'];
        events.forEach(type => {
            const event = new MouseEvent(type, {
                bubbles: true,
                cancelable: true,
                view: window,
                buttons: 1 // 1 = Chuột trái
            });
            element.dispatchEvent(event);
        });
    };

    // --- UPDATED NAVIGATION HANDLER ---
    const handleQuickNav = () => {
        if (!settings.logic2Enabled) return false;

        let clicked = false;

        // Chỉ tìm button trong video player để tránh ảnh hưởng header
        const player = document.querySelector('.html5-video-player');
        if (!player) return false;

        // Danh sách selector cập nhật mới nhất cho 2025 - CHỈ SKIP AD BUTTONS
        const SKIP_SELECTORS = [
            '.ytp-ad-skip-button',
            '.ytp-ad-skip-button-modern',
            '.ytp-ad-skip-button-slot',
            '.ytp-skip-ad-button',
            '.videoAdUiSkipButton',
            'button.ytp-ad-skip-button',
            '.ytp-ad-skip-button-container button',
            '.ytp-ad-overlay-close-button',
            'button.ytp-ad-skip-button-modern.ytp-button',
            'button[aria-label^="Skip ad"]',
            'button[aria-label^="Skip Ad"]',
            'button[aria-label^="Bỏ qua"]'
        ];

        SKIP_SELECTORS.forEach(selector => {
            // Tìm trong player thôi, không tìm toàn page
            const buttons = player.querySelectorAll(selector);
            buttons.forEach(btn => {
                // Kiểm tra kỹ: Nút phải tồn tại VÀ hiển thị (kích thước > 0)
                // offsetParent !== null là cách check xem element có bị hidden không
                if (btn && typeof btn.click === 'function' && (btn.offsetParent !== null || btn.offsetWidth > 0)) {

                    // 1. Dùng Native Click (Quan trọng nhất)
                    triggerNativeClick(btn);

                    // 2. Click dự phòng (Fallback)
                    btn.click();

                    clicked = true;
                    console.log(`[Focus DEBUG] ✅ Hard-Clicked skip button: ${selector}`);
                }
            });
        });

        return clicked;
    };

    // Speed optimization
    const optimizePlayback = () => {
        if (!settings.logic2Enabled) return;

        const video = document.querySelector('video');
        if (video && !isNaN(video.duration) && video.duration > 0) {
            video.muted = true;
            video.playbackRate = 16.0;
            video.currentTime = video.duration;
            console.log('[Focus] ⏩ Playback optimized');
        }
    };

    // Clean visual distractions
    const cleanLayout = () => {
        // Static ads (only if toggle enabled)
        if (settings.staticAdsEnabled) {
            STATIC_AD_SELECTORS.forEach(sel => {
                const els = document.querySelectorAll(sel);
                els.forEach(el => {
                    if (el.style.display !== 'none') {
                        el.style.display = 'none';
                        console.log(`[Focus DEBUG] 🧹 Hidden static: ${sel}`);
                    }
                });
            });
        }

        // Anti-adblock popups - ALWAYS remove (most important for user experience)
        ANTI_ADBLOCK_SELECTORS.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => {
                el.remove();
                console.log(`[Focus] 🚫 Removed anti-adblock: ${sel}`);
            });
        });

        // Also remove feedback dialog if present
        const dialog = document.querySelector('tp-yt-paper-dialog');
        if (dialog && dialog.id === 'feedback-dialog') dialog.remove();
    };

    // Main loop
    const runFocusLoop = () => {
        if (!settings.hunterActive) return;

        const needsOptimization = checkIfOptimizationNeeded();

        if (needsOptimization) {
            handleQuickNav();
            optimizePlayback();
        }

        // Always clean layout (for popup hiding)
        cleanLayout();
    };

    // Inject script
    const injectScript = () => {
        const script = document.createElement('script');
        script.id = 'focus-config-data';
        script.type = 'application/json';
        script.textContent = JSON.stringify({});
        (document.head || document.documentElement).appendChild(script);
    };

    // Background communication
    window.addEventListener('message', (event) => {
        // Handle extracted URLs from JSON (template URLs)
        if (event.data.type === 'FOCUS_SEND_TO_BACKGROUND') {
            console.log(`[Focus DEBUG] 📨 content.js received ${event.data.urls?.length || 0} URLs from inject.js`);

            if (!settings.offscreenEnabled) {
                console.log('[Focus DEBUG] ⚠️ Offscreen disabled, not forwarding to background');
                return;
            }

            try {
                chrome.runtime.sendMessage({
                    type: 'HUNTER_BEACON_REQUEST',
                    urls: event.data.urls
                });
                console.log('[Focus DEBUG] ✅ Forwarded URLs to background.js');
            } catch (e) {
                console.log('[Focus DEBUG] ❌ Error forwarding to background:', e.message);
            }
        }

        // Handle REAL tracking URLs captured from outgoing requests
        if (event.data.type === 'FOCUS_REAL_TRACKING_URL') {
            const { method, url } = event.data;
            console.log(`[Focus RELAY] 🚀 Captured REAL URL via ${method}, forwarding to offscreen...`);

            if (!settings.offscreenEnabled) {
                console.log('[Focus RELAY] ⚠️ Offscreen disabled');
                return;
            }

            try {
                chrome.runtime.sendMessage({
                    type: 'REPLAY_REAL_URL',
                    method: method,
                    url: url
                });
            } catch (e) {
                console.log('[Focus RELAY] ❌ Error:', e.message);
            }
        }
    });

    // Update selectors from remote
    const updateSelectorsFromRemote = async () => {
        try {
            const lastUpdate = localStorage.getItem('focus_selectors_time');
            if (lastUpdate && Date.now() - parseInt(lastUpdate) < UPDATE_INTERVAL) return;

            const response = await fetch(SELECTORS_URL + '?t=' + Date.now());
            if (response.ok) {
                const data = await response.json();
                if (data.skipSelectors) Object.assign(SKIP_SELECTORS, data.skipSelectors);
                if (data.adHideSelectors) Object.assign(STATIC_AD_SELECTORS, data.adHideSelectors);

                localStorage.setItem('focus_selectors', JSON.stringify(data));
                localStorage.setItem('focus_selectors_time', Date.now().toString());
                console.log('[Focus] Selectors updated from remote');
            }
        } catch (e) { }
    };

    // Header button
    const createHeaderButton = () => {
        if (document.getElementById('focus-toggle-btn')) return;

        const buttonsContainer = document.querySelector('ytd-masthead #end #buttons');
        if (!buttonsContainer) return;

        const btn = document.createElement('button');
        btn.id = 'focus-toggle-btn';
        btn.style.cssText = `
            background: ${settings.hunterActive ? '#667eea' : '#666'};
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 18px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            margin-right: 8px;
            transition: all 0.3s ease;
            z-index: 9999;
            position: relative;
        `;
        btn.textContent = settings.hunterActive ? '🎯 Focus: ON' : '🎯 Focus: OFF';

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            settings.hunterActive = !settings.hunterActive;
            chrome.storage.local.set({ hunterActive: settings.hunterActive });
            updateButtonAppearance();
            syncWithInjectJS();
            console.log(`[Focus] ${settings.hunterActive ? 'Enabled' : 'Disabled'}`);
        });

        buttonsContainer.insertBefore(btn, buttonsContainer.firstChild);
        console.log('[Focus] Header button created ✅');
    };

    // Initialize
    loadSettings();
    updateSelectorsFromRemote();
    injectScript();

    setTimeout(() => { checkAndTriggerNavigate(); }, 500);
    window.addEventListener('yt-navigate-start', checkAndTriggerNavigate);

    setInterval(runFocusLoop, 50);

    const headerObserver = new MutationObserver(() => { createHeaderButton(); });

    const waitMasthead = setInterval(() => {
        const masthead = document.querySelector('ytd-masthead');
        if (masthead) {
            headerObserver.observe(masthead, { childList: true, subtree: true });
            createHeaderButton();
            clearInterval(waitMasthead);
        }
    }, 1000);

    const observer = new MutationObserver(() => { });

    const waitForPlayer = setInterval(() => {
        const player = document.querySelector('#movie_player');
        if (player) {
            observer.observe(player, { attributes: true, subtree: true, attributeFilter: ['class', 'src'] });
            clearInterval(waitForPlayer);
        }
    }, 500);

    console.log(`%c[Focus] v33.0: YouTube Focus Mode Active 🎯`, "color: #667eea; font-weight: bold; font-size: 14px;");
})();