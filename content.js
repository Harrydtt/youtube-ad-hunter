// content.js - v35.3: Extract-Before-Cut + Popup Cleaner
(function () {
    console.log('[Focus] Initializing v35.3... 👻');

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

    // --- UPDATED NAVIGATION HANDLER (Aggressive Skip & Anti-Spam) ---
    let lastLogTime = 0;
    const handleQuickNav = () => {
        if (!settings.logic2Enabled) return false;

        let clicked = false;

        // 1. Scope to Player ONLY
        const player = document.querySelector('.html5-video-player');
        if (!player) return false;

        // Danh sách selector cập nhật mới nhất cho 2025
        const SKIP_SELECTORS = [
            '.ytp-ad-skip-button',
            '.ytp-ad-skip-button-modern',
            '.ytp-ad-skip-button-slot',
            '.ytp-skip-ad-button',
            '.videoAdUiSkipButton',
            'button.ytp-ad-skip-button',
            '[id="skip-button:"]',
            'button[aria-label^="Skip ad"]',
            'button[aria-label^="Skip Ad"]',
            'button[aria-label^="Bỏ qua"]',
            '.ytp-ad-skip-button-container button',
            '.ytp-ad-overlay-close-button',
            '.ytp-ad-next-button', // Ad Pod: Skip to next
            'button[data-visual-id="5"]', // Common ID for skip
            '#skip-button\\:6 > span > button',
            'button.ytp-ad-skip-button-modern.ytp-button'
        ];

        const clickedElements = new Set();
        SKIP_SELECTORS.forEach(selector => {
            const buttons = player.querySelectorAll(selector);
            buttons.forEach(btn => {
                if (clickedElements.has(btn)) return;

                // Check visibility: Đủ lớn hoặc display/opacity ok
                const style = window.getComputedStyle(btn);
                const isVisible = (btn.offsetWidth > 0 && btn.offsetHeight > 0) &&
                    (style.display !== 'none') &&
                    (style.visibility !== 'hidden') &&
                    (style.opacity !== '0');

                if (isVisible && typeof btn.click === 'function') {
                    clickedElements.add(btn);

                    // FORCE ENABLE
                    btn.style.pointerEvents = 'auto';
                    btn.style.cursor = 'pointer';
                    btn.style.zIndex = '9999';

                    // ACTIONS
                    triggerNativeClick(btn);
                    btn.click();

                    clicked = true;

                    // Throttle logs
                    const now = Date.now();
                    if (now - lastLogTime > 1000) {
                        console.log(`[Focus DEBUG] ✅ Clicked skip button (Throttled): ${selector}`);
                        lastLogTime = now;
                    }
                }
            });
        });

        return clicked;
    };

    // Speed optimization (Speed-Hack)
    const optimizePlayback = () => {
        if (!settings.logic2Enabled) return;

        // Check for ad classes OR presence of skip button (Ad Pod failsafe)
        const player = document.querySelector('.html5-video-player');
        const skipBtn = player ? player.querySelector('.ytp-ad-skip-button, .ytp-ad-next-button') : null;
        const isAd = player && (
            player.classList.contains('ad-interrupting') ||
            player.classList.contains('ad-showing') ||
            skipBtn !== null
        );

        if (!isAd) return;

        const video = document.querySelector('video');
        if (video && !isNaN(video.duration) && video.duration > 0) {
            video.muted = true;
            video.playbackRate = 16.0;
            video.currentTime = video.duration;
            console.log('[Focus] ⏩ Ad Speed-Hacked');
        }
    };

    // Clean visual distractions
    const cleanLayout = () => {
        // Static ads (only if toggle enabled)
        if (settings.staticAdsEnabled) {
            if (STATIC_AD_SELECTORS && STATIC_AD_SELECTORS.length > 0) {
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

    // --- DYNAMIC LOOP & AD POD HANDLING ---
    let focusInterval = null;
    let currentIntervalTime = 1000;

    const startFocusLoop = (intervalTime) => {
        if (focusInterval) clearInterval(focusInterval);
        currentIntervalTime = intervalTime;

        focusInterval = setInterval(() => {
            if (!settings.hunterActive) return;

            // Check if ad is active to determine loop speed
            const player = document.querySelector('.html5-video-player');
            const skipBtn = player ? player.querySelector('.ytp-ad-skip-button, .ytp-ad-next-button') : null;
            const isAd = player && (
                player.classList.contains('ad-interrupting') ||
                player.classList.contains('ad-showing') ||
                skipBtn !== null
            );

            // If Ad is detected, but we are running slow -> Switch to FAST (100ms)
            if (isAd && currentIntervalTime > 100) {
                console.log('[Focus] 🚀 Ad detected! Switching to FAST loop (100ms)');
                startFocusLoop(100);
                return;
            }
            // If No Ad, but running fast -> Switch back to NORMAL (1000ms)
            if (!isAd && currentIntervalTime < 1000) {
                console.log('[Focus] 🐢 Ad ended. Switching to NORMAL loop (1000ms)');
                startFocusLoop(1000);
                return;
            }

            handleQuickNav();
            optimizePlayback();
            cleanLayout();

        }, intervalTime);
    };

    // Inject script (The Core Hook)
    const injectScript = () => {
        // 1. Inject Configuration Data
        const configScript = document.createElement('script');
        configScript.id = 'focus-config-data';
        configScript.type = 'application/json';
        configScript.textContent = JSON.stringify({});
        (document.head || document.documentElement).appendChild(configScript);

        // 2. Inject The Interceptor (inject.js) -> CRITICAL
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('inject.js');
        script.onload = function () {
            this.remove();
            console.log('[Focus] inject.js injected successfully 💉');
        };
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
                if (e.message.includes('Extension context invalidated')) {
                    console.log('[Focus] ⚠️ Extension reloaded. detailed log suppressed. Please refresh the page to reconnect.');
                } else {
                    console.log('[Focus DEBUG] ❌ Error forwarding to background:', e.message);
                }
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
                if (!e.message.includes('Extension context invalidated')) {
                    console.log('[Focus RELAY] ❌ Error:', e.message);
                }
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

                if (data.skipSelectors && Array.isArray(data.skipSelectors)) {
                    // Merge unique
                    data.skipSelectors.forEach(s => {
                        if (!SKIP_SELECTORS.includes(s)) SKIP_SELECTORS.push(s);
                    });
                }

                if (data.adHideSelectors && Array.isArray(data.adHideSelectors)) {
                    // Replace or Merge? Let's Merge Unique to be safe against default hardcoded ones being crucial
                    data.adHideSelectors.forEach(s => {
                        if (!STATIC_AD_SELECTORS.includes(s)) STATIC_AD_SELECTORS.push(s);
                    });
                }

                localStorage.setItem('focus_selectors', JSON.stringify(data));
                localStorage.setItem('focus_selectors_time', Date.now().toString());
                console.log('[Focus] Selectors updated from remote', data);
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

    // Listen for Ad Pod transitions (Duration Change = new ad started)
    const initVideoListeners = () => {
        const video = document.querySelector('video');
        if (video) {
            video.addEventListener('durationchange', () => {
                // New video/ad check immediately
                handleQuickNav();
                cleanLayout();
            });
            video.addEventListener('ended', () => {
                handleQuickNav();
            });
        }
    };

    // Initialize logic
    loadSettings();
    updateSelectorsFromRemote();
    injectScript();

    // Start Header Button Logic
    const headerObserver = new MutationObserver(() => { createHeaderButton(); });
    const waitMasthead = setInterval(() => {
        const masthead = document.querySelector('ytd-masthead');
        if (masthead) {
            headerObserver.observe(masthead, { childList: true, subtree: true });
            createHeaderButton();
            clearInterval(waitMasthead);
        }
    }, 1000);

    // Initial Navigate Check
    setTimeout(() => { checkAndTriggerNavigate(); }, 500);
    window.addEventListener('yt-navigate-start', checkAndTriggerNavigate);

    // Start Main Logic Waiter
    const observer = new MutationObserver(() => { });
    const waitForPlayer = setInterval(() => {
        const player = document.querySelector('#movie_player');
        if (player) {
            clearInterval(waitForPlayer);
            initVideoListeners(); // Attach video listeners
            startFocusLoop(1000); // Start the dynamic loop

            observer.observe(player, { attributes: true, subtree: true, attributeFilter: ['class', 'src'] });
        }
    }, 500);

    console.log(`%c[Focus] v35.3: YouTube Focus Mode Active 🎯`, "color: #667eea; font-weight: bold; font-size: 14px;");
})();