// inject.js - v31: Remote Config + Refactored
(function () {
    console.log('[Hunter] Stealth Engine v31.3: Settings Respect 🛡️');

    // --- 1. CONFIG & STATE ---
    const CONFIG_URL = 'https://raw.githubusercontent.com/Harrydtt/youtube-ad-hunter/main/selectors.json';
    const UPDATE_INTERVAL = 3600 * 1000; // 1 hour

    // Default config (fallback if remote fetch fails)
    let CONFIG = {
        ad_keys: ['adPlacements', 'playerAds', 'adSlots', 'kidsAdPlacements', 'adBreakResponse', 'adBreakHeartbeatParams'],
        tracking_keys: ['impressionEndpoints', 'adImpressionUrl', 'clickthroughEndpoint', 'start', 'firstQuartile', 'midpoint', 'thirdQuartile', 'complete', 'ping'],
        popup_keys: [
            'upsellDialogRenderer', 'promoMessageRenderer', 'tvAppUpsellDialogRenderer',
            'playerErrorMessageRenderer', 'mealbarPromoRenderer', 'actionCompanionAdRenderer',
            'statementBannerRenderer', 'youTubePaymentPromoRenderer'
        ],
        block_urls: ['support.google.com/youtube/answer/3037019']
    };
    let jsonCutEnabled = true;

    // --- 2. REMOTE CONFIG LOADER ---
    const loadRemoteConfig = async () => {
        try {
            const lastUpdate = localStorage.getItem('hunter_config_time');
            if (lastUpdate && Date.now() - parseInt(lastUpdate) < UPDATE_INTERVAL) {
                // Load from cache
                const cached = localStorage.getItem('hunter_config');
                if (cached) {
                    const data = JSON.parse(cached);
                    mergeConfig(data);
                    return;
                }
            }

            const response = await fetch(CONFIG_URL + '?t=' + Date.now());
            if (response.ok) {
                const data = await response.json();
                mergeConfig(data);
                localStorage.setItem('hunter_config', JSON.stringify(data));
                localStorage.setItem('hunter_config_time', Date.now().toString());
                console.log('[Hunter] 🔄 Remote config loaded');
            }
        } catch (e) {
            console.warn('[Hunter] Config fetch failed, using defaults');
        }
    };

    const mergeConfig = (data) => {
        if (data.adJsonKeys) CONFIG.ad_keys = data.adJsonKeys;
        if (data.popupJsonKeys) CONFIG.popup_keys = data.popupJsonKeys;
        if (data.blockUrls) CONFIG.block_urls = data.blockUrls;
    };

    // Load config immediately
    loadRemoteConfig();

    // Also check for local config element (from content.js)
    try {
        const configEl = document.getElementById('hunter-config-data');
        if (configEl) {
            const localConfig = JSON.parse(configEl.textContent);
            mergeConfig(localConfig);
            configEl.remove();
        }
    } catch (e) { }

    // Listen for toggle messages
    window.addEventListener('message', (e) => {
        if (e.data && e.data.type === 'HUNTER_SET_JSONCUT') {
            jsonCutEnabled = e.data.enabled;
            console.log(`%c[Hunter] ⚙️ Cut Mode: ${jsonCutEnabled}`, 'color: orange');
        }
    });

    // --- 3. CSS MUZZLE ---
    const style = document.createElement('style');
    style.id = 'hunter-muzzle-css';
    style.textContent = `
        ytd-enforcement-message-view-model,
        tp-yt-paper-dialog[role="dialog"] ytd-enforcement-message-view-model,
        #mealbar-promo-renderer,
        ytd-popup-container ytd-promo-message-renderer,
        ytd-popup-container ytd-mealbar-promo-renderer,
        .ytp-ad-overlay-container,
        ytd-watch-flexy[player-unavailable] #player-unavailable,
        tp-yt-paper-toast
        { display: none !important; visibility: hidden !important; opacity: 0 !important; 
          pointer-events: none !important; height: 0 !important; width: 0 !important; z-index: -9999 !important; }
    `;
    (document.head || document.documentElement).appendChild(style);

    // --- 4. DOM BOUNCER ---
    const observer = new MutationObserver((mutations) => {
        if (!jsonCutEnabled) return;
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== 1) continue;
                const tag = node.tagName.toLowerCase();
                const id = node.id;

                // Check by tag/id
                if (tag === 'ytd-enforcement-message-view-model' ||
                    tag === 'ytd-mealbar-promo-renderer' ||
                    id === 'mealbar-promo-renderer' ||
                    id === 'player-unavailable' ||
                    (tag === 'tp-yt-paper-dialog' && node.querySelector('ytd-enforcement-message-view-model'))) {
                    node.remove();
                    console.log(`%c[Bouncer] 🥊 Kicked: ${tag}#${id}`, 'color: red; font-weight: bold;');
                    resumeVideo();
                    continue;
                }

                // Check by blocked URL
                if (node.innerHTML && CONFIG.block_urls.some(url => node.innerHTML.includes(url))) {
                    node.remove();
                    console.log(`%c[Bouncer] 🔗 Killed node with blocked URL`, 'color: red;');
                    resumeVideo();
                }
            }
        }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    const resumeVideo = () => {
        const video = document.querySelector('video');
        if (video && video.paused) video.play();
    };

    // --- 5. BEACON SYSTEM ---
    const sendToOffscreen = (urls) => {
        if (!urls || urls.length === 0) return;
        window.postMessage({ type: 'HUNTER_SEND_TO_BACKGROUND', urls: urls }, '*');
    };

    const extractTrackingUrls = (obj, urls = []) => {
        if (!obj || typeof obj !== 'object') return urls;
        for (let key in obj) {
            if (CONFIG.tracking_keys.includes(key)) {
                const val = obj[key];
                if (Array.isArray(val)) val.forEach(v => urls.push(v.baseUrl || v));
                else if (typeof val === 'string') urls.push(val);
            } else if (typeof obj[key] === 'object') {
                extractTrackingUrls(obj[key], urls);
            }
        }
        return urls;
    };

    // --- 6. CORE PROCESSORS (Refactored) ---
    const processObject = (obj, processor) => {
        if (!obj || typeof obj !== 'object') return;
        try {
            processor(obj);
            if (obj.playerResponse) processor(obj.playerResponse);
        } catch (e) {
            console.warn('[Hunter] Process error:', e);
        }
    };

    const nukeAds = (data) => {
        processObject(data, (obj) => {
            CONFIG.ad_keys.forEach(key => {
                if (obj[key]) {
                    const urls = extractTrackingUrls(obj[key]);
                    if (urls.length > 0) sendToOffscreen(urls);
                    if (Array.isArray(obj[key])) obj[key] = [];
                    else delete obj[key];
                }
            });
        });
    };

    const deMonetize = (data) => {
        processObject(data, (obj) => {
            if (obj.videoDetails) obj.videoDetails.isMonetized = false;
            if (obj.playerConfig?.daiConfig) obj.playerConfig.daiConfig = null;
            if (obj.adBlockingInfo) delete obj.adBlockingInfo;
        });
    };

    const cleanPlayability = (data) => {
        processObject(data, (obj) => {
            if (!obj.playabilityStatus) return;

            // Check for blocked URLs in playabilityStatus
            const str = JSON.stringify(obj.playabilityStatus);
            if (CONFIG.block_urls.some(url => str.includes(url))) {
                obj.playabilityStatus = { status: 'OK', playableInEmbed: true };
                console.log('[Hunter] 🔗 Neutralized playabilityStatus');
                return;
            }

            // Remove error screen
            if (obj.playabilityStatus.errorScreen) delete obj.playabilityStatus.errorScreen;

            // Force OK status
            if (obj.playabilityStatus.status !== 'OK' && obj.playabilityStatus.status !== 'LOGIN_REQUIRED') {
                obj.playabilityStatus.status = 'OK';
                obj.playabilityStatus.playableInEmbed = true;
            }
        });
    };

    const stripPopups = (data) => {
        const deepStrip = (obj) => {
            if (!obj || typeof obj !== 'object') return;
            for (let key in obj) {
                if (CONFIG.popup_keys.includes(key) && obj[key]) {
                    delete obj[key];
                    console.log(`%c[Hunter] 🚫 Blocked: ${key}`, 'color: red;');
                } else if (typeof obj[key] === 'object') {
                    const str = JSON.stringify(obj[key]);
                    if (CONFIG.block_urls.some(url => str.includes(url))) {
                        delete obj[key];
                        console.log(`%c[Hunter] 🔗 Blocked object with URL`, 'color: red;');
                    } else {
                        deepStrip(obj[key]);
                    }
                }
            }
        };

        processObject(data, (obj) => {
            if (obj.auxiliaryUi) deepStrip(obj.auxiliaryUi);
            if (obj.overlay) deepStrip(obj.overlay);
        });
    };

    const processYoutubeData = (data) => {
        if (!jsonCutEnabled || !data) return data;
        try {
            nukeAds(data);
            cleanPlayability(data);
            deMonetize(data);
            stripPopups(data);
        } catch (e) {
            console.warn('[Hunter] Processing error:', e);
        }
        return data;
    };

    // --- 7. DATA TRAPS ---
    const trapVariable = (varName) => {
        let internalValue = window[varName];
        try {
            Object.defineProperty(window, varName, {
                get: () => internalValue,
                set: (val) => { internalValue = val ? processYoutubeData(val) : val; },
                configurable: true
            });
        } catch (e) { }
    };
    try { trapVariable('ytInitialPlayerResponse'); trapVariable('ytInitialData'); } catch (e) { }

    // --- 8. HOOKS ---
    const originalParse = JSON.parse;
    JSON.parse = function (text, reviver) {
        try {
            const data = originalParse(text, reviver);
            if (data) processYoutubeData(data);
            return data;
        } catch (e) { return originalParse(text, reviver); }
    };

    const originalJson = Response.prototype.json;
    Response.prototype.json = async function () {
        try {
            const data = await originalJson.call(this);
            if (data) processYoutubeData(data);
            return data;
        } catch (e) { return originalJson.call(this); }
    };

    // Initial processing
    if (window.ytInitialPlayerResponse) processYoutubeData(window.ytInitialPlayerResponse);
    if (window.ytInitialData) processYoutubeData(window.ytInitialData);

    // Navigation hooks
    const notify = () => window.postMessage({ type: 'HUNTER_NAVIGATE_URGENT' }, '*');
    const origPush = history.pushState; history.pushState = function () { origPush.apply(this, arguments); notify(); };
    const origRep = history.replaceState; history.replaceState = function () { origRep.apply(this, arguments); notify(); };
    window.addEventListener('popstate', notify);

})();
