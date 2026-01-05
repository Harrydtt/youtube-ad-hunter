// content.js - v31.3: Respect All Settings
(function () {
    console.log('[Hunter] Initializing v31.3... 👻');

    // --- STATE (All settings, loaded from storage) ---
    let settings = {
        hunterActive: true,      // Master toggle (header button)
        jsonCutEnabled: true,    // JSON pruning
        offscreenEnabled: true,  // Fake beacon
        logic2Enabled: true,     // Speed/Skip fallback
        staticAdsEnabled: false  // Block static ads (default OFF)
    };

    let SKIP_SELECTORS = [
        '.video-ads.ytp-ad-module',
        '.ytp-ad-player-overlay',
        '.ytp-ad-image-overlay',
        '.ytp-ad-skip-button',
        '.ytp-ad-overlay-container',
        'ytd-promoted-sparkles-web-renderer',
        'ytd-display-ad-renderer',
        'ytd-compact-promoted-video-renderer',
        'ytd-miniplayer-toast',
        'ytd-mealbar-promo-renderer'
    ];

    let STATIC_AD_SELECTORS = [
        '#masthead-ad',
        'ytd-rich-item-renderer.style-scope.ytd-rich-grid-row #content:has(ytd-display-ad-renderer)',
        'ytd-rich-item-renderer.style-scope.ytd-rich-grid-row #content:has(ytd-ad-slot-renderer)',
        '#player-ads'
    ];

    const SELECTORS_URL = 'https://raw.githubusercontent.com/Harrydtt/youtube-ad-hunter/main/selectors.json';
    const UPDATE_INTERVAL = 3600 * 1000;

    // --- LOAD ALL SETTINGS FROM STORAGE ---
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

            console.log('[Hunter] Settings loaded:', settings);
            updateButtonAppearance();
            syncWithInjectJS();
        });
    };

    // Listen for storage changes (when user toggles in popup)
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local') {
            if (changes.hunterActive) settings.hunterActive = changes.hunterActive.newValue;
            if (changes.jsonCutEnabled) settings.jsonCutEnabled = changes.jsonCutEnabled.newValue;
            if (changes.offscreenEnabled) settings.offscreenEnabled = changes.offscreenEnabled.newValue;
            if (changes.logic2Enabled) settings.logic2Enabled = changes.logic2Enabled.newValue;
            if (changes.staticAdsEnabled) settings.staticAdsEnabled = changes.staticAdsEnabled.newValue;

            console.log('[Hunter] Settings updated:', settings);
            updateButtonAppearance();
            syncWithInjectJS();
        }
    });

    const syncWithInjectJS = () => {
        window.postMessage({ type: 'HUNTER_SET_JSONCUT', enabled: settings.hunterActive && settings.jsonCutEnabled }, '*');
    };

    const updateButtonAppearance = () => {
        const btn = document.getElementById('hunter-toggle-btn');
        if (btn) {
            btn.textContent = settings.hunterActive ? '🎯 Hunter: ON' : '🎯 Hunter: OFF';
            btn.style.background = settings.hunterActive ? '#cc0000' : '#666';
        }
    };

    // --- UTIL ---
    const checkAndTriggerNavigate = () => {
        window.postMessage({ type: 'HUNTER_NAVIGATE_URGENT' }, '*');
    };

    // --- CORE LOGIC (Respects Settings) ---
    const clickSkipButton = () => {
        if (!settings.logic2Enabled) return false; // Respect setting

        const skipBtn = document.querySelector('.ytp-ad-skip-button') ||
            document.querySelector('.ytp-ad-skip-button-modern') ||
            document.querySelector('.videoAdUiSkipButton');
        if (skipBtn) {
            skipBtn.click();
            console.log('[Hunter] ⏩ Skipped Ad (Click)');
            return true;
        }
        return false;
    };

    const fastForwardAd = () => {
        if (!settings.logic2Enabled) return; // Respect setting

        const video = document.querySelector('video');
        if (video) {
            let isAd = false;
            if (document.querySelector('.ad-showing') || document.querySelector('.ad-interrupting')) {
                isAd = true;
            }
            const adModule = document.querySelector('.video-ads.ytp-ad-module');
            if (adModule && adModule.children.length > 0) {
                isAd = true;
            }

            if (isAd && !isNaN(video.duration) && video.duration > 0) {
                video.playbackRate = 16.0;
                video.currentTime = video.duration;
                console.log('[Hunter] ⏩ Fast Forwarded Ad');
                if (video.paused) video.play();
            }
        }
    };

    const removeStaticAds = () => {
        if (!settings.staticAdsEnabled) return; // Respect setting

        STATIC_AD_SELECTORS.forEach(sel => {
            const els = document.querySelectorAll(sel);
            els.forEach(el => { el.style.display = 'none'; });
        });
    };

    const runHunterLoop = () => {
        if (!settings.hunterActive) return; // Master toggle

        clickSkipButton();      // Only runs if logic2Enabled
        fastForwardAd();        // Only runs if logic2Enabled 
        removeStaticAds();      // Only runs if staticAdsEnabled
    };

    // --- INJECT SCRIPT ---
    const injectScript = () => {
        const script = document.createElement('script');
        script.id = 'hunter-config-data';
        script.type = 'application/json';
        script.textContent = JSON.stringify({});
        (document.head || document.documentElement).appendChild(script);
    };

    // --- BACKGROUND COMMS ---
    window.addEventListener('message', (event) => {
        if (event.data.type === 'HUNTER_SEND_TO_BACKGROUND') {
            if (!settings.offscreenEnabled) return; // Respect setting
            try {
                chrome.runtime.sendMessage({
                    type: 'sendToOffscreen',
                    urls: event.data.urls
                });
            } catch (e) { }
        }
    });

    // --- SELECTOR UPDATE ---
    const updateSelectorsFromGithub = async () => {
        try {
            const lastUpdate = localStorage.getItem('hunter_selectors_time');
            if (lastUpdate && Date.now() - parseInt(lastUpdate) < UPDATE_INTERVAL) return;

            const response = await fetch(SELECTORS_URL + '?t=' + Date.now());
            if (response.ok) {
                const data = await response.json();
                if (data.skipSelectors) SKIP_SELECTORS = data.skipSelectors;
                if (data.adHideSelectors) STATIC_AD_SELECTORS = data.adHideSelectors;

                localStorage.setItem('hunter_selectors', JSON.stringify(data));
                localStorage.setItem('hunter_selectors_time', Date.now().toString());
                console.log('[Hunter] Selectors updated from GitHub');
            }
        } catch (e) { }
    };

    // --- HEADER BUTTON ---
    const createHeaderButton = () => {
        if (document.getElementById('hunter-toggle-btn')) return;

        const buttonsContainer = document.querySelector('ytd-masthead #end #buttons');
        if (!buttonsContainer) return;

        const btn = document.createElement('button');
        btn.id = 'hunter-toggle-btn';
        btn.style.cssText = `
            background: ${settings.hunterActive ? '#cc0000' : '#666'};
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
        btn.textContent = settings.hunterActive ? '🎯 Hunter: ON' : '🎯 Hunter: OFF';

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            settings.hunterActive = !settings.hunterActive;
            chrome.storage.local.set({ hunterActive: settings.hunterActive });
            updateButtonAppearance();
            syncWithInjectJS();
            console.log(`[Hunter] ${settings.hunterActive ? 'BẬT' : 'TẮT'} (Saved)`);
        });

        buttonsContainer.insertBefore(btn, buttonsContainer.firstChild);
        console.log('[Hunter] Header button created ✅');
    };

    // --- INIT ---
    loadSettings();
    updateSelectorsFromGithub();
    injectScript();

    setTimeout(() => { checkAndTriggerNavigate(); }, 500);
    window.addEventListener('yt-navigate-start', checkAndTriggerNavigate);

    setInterval(runHunterLoop, 50);

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

    console.log(`%c[Hunter] v31.3: Project Phantom Active 👻⚡`, "color: #00ff00; font-weight: bold; font-size: 14px;");
})();