// inject.js - v29: The Universal Translator (Locale-Agnostic Fix)
(function () {
    console.log('[Hunter] Stealth Engine v29: Universal Fix 🌐');

    // --- 1. CONFIG & STATE ---
    let CONFIG = {
        ad_keys: ['adPlacements', 'playerAds', 'adSlots', 'kidsAdPlacements', 'adBreakResponse'],
        tracking_keys: ['impressionEndpoints', 'adImpressionUrl', 'clickthroughEndpoint', 'start', 'firstQuartile', 'midpoint', 'thirdQuartile', 'complete', 'ping'],
        popup_keys: [
            'upsellDialogRenderer',
            'promoMessageRenderer',
            'tvAppUpsellDialogRenderer',
            'playerErrorMessageRenderer',
            'mealbarPromoRenderer',
            'actionCompanionAdRenderer',
            'statementBannerRenderer',
            'youTubePaymentPromoRenderer'
        ]
    };
    let jsonCutEnabled = true;

    // Load Config
    try {
        const configEl = document.getElementById('hunter-config-data');
        if (configEl) {
            const dynamicConfig = JSON.parse(configEl.textContent);
            CONFIG = { ...CONFIG, ...dynamicConfig };
            configEl.remove();
        }
    } catch (e) { }

    window.addEventListener('message', (e) => {
        if (e.data && e.data.type === 'HUNTER_SET_JSONCUT') {
            jsonCutEnabled = e.data.enabled;
            console.log(`%c[Hunter] ⚙️ Cut Mode: ${jsonCutEnabled}`, 'color: orange');
        }
    });

    // --- 2. CSS MUZZLE ---
    const style = document.createElement('style');
    style.id = 'hunter-muzzle-css';
    style.textContent = `
        ytd-enforcement-message-view-model,
        tp-yt-paper-dialog[role="dialog"] ytd-enforcement-message-view-model,
        #mealbar-promo-renderer,
        ytd-popup-container ytd-promo-message-renderer,
        ytd-popup-container ytd-unity-gamification-renderer,
        ytd-popup-container ytd-mealbar-promo-renderer,
        .ytp-ad-overlay-container,
        ytd-watch-flexy[player-unavailable] #player-unavailable
        {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
            height: 0 !important;
            width: 0 !important;
            z-index: -9999 !important;
        }
    `;
    (document.head || document.documentElement).appendChild(style);

    // --- 3. DOM BOUNCER ---
    const observer = new MutationObserver((mutations) => {
        if (!jsonCutEnabled) return;
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== 1) continue;
                const tag = node.tagName.toLowerCase();
                const id = node.id;

                // Mở rộng danh sách đen DOM
                if (tag === 'ytd-enforcement-message-view-model' ||
                    tag === 'ytd-mealbar-promo-renderer' ||
                    id === 'mealbar-promo-renderer' ||
                    id === 'player-unavailable' ||
                    (tag === 'tp-yt-paper-dialog' && node.querySelector('ytd-enforcement-message-view-model'))
                ) {
                    node.remove();
                    console.log(`%c[Bouncer] 🥊 Kicked out: ${tag}#${id}`, 'color: red; font-weight: bold;');
                    const video = document.querySelector('video');
                    if (video && video.paused) video.play();
                }
            }
        }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    // --- 4. BEACON SYSTEM ---
    const sendToOffscreen = (urls) => { /** Kept minimal for brevity, assume works */
        if (!urls || urls.length === 0) return;
        window.postMessage({ type: 'HUNTER_SEND_TO_BACKGROUND', urls: urls }, '*');
    };
    const fireBeacon = (url) => {
        if (!url || !url.startsWith('http')) return;
        const img = new Image();
        img.style.display = 'none';
        img.src = url.includes('?') ? `${url}&_t=${Date.now()}` : `${url}?_t=${Date.now()}`;
    };
    const fakeAdViewing = (adData) => {
        if (!adData) return;
        try {
            const findUrls = (obj) => {
                let urls = [];
                if (!obj) return urls;
                if (typeof obj === 'object') {
                    for (let key in obj) {
                        if (CONFIG.tracking_keys.includes(key)) {
                            const val = obj[key];
                            if (Array.isArray(val)) val.forEach(v => urls.push(v.baseUrl || v));
                            else if (typeof val === 'string') urls.push(val);
                        } else {
                            urls = urls.concat(findUrls(obj[key]));
                        }
                    }
                }
                return urls;
            };
            const urls = findUrls(adData);
            if (urls.length > 0) {
                sendToOffscreen(urls);
                urls.forEach((url, i) => setTimeout(() => fireBeacon(url), i * 150));
            }
        } catch (e) { }
    };

    // --- 5. CORE LOGIC ---
    const nukeAds = (data) => {
        if (data.adPlacements) { fakeAdViewing(data.adPlacements); data.adPlacements = []; }
        if (data.playerAds) { fakeAdViewing(data.playerAds); data.playerAds = []; }
        if (data.adSlots) { fakeAdViewing(data.adSlots); data.adSlots = []; }

        if (data.playerResponse) {
            if (data.playerResponse.adPlacements) { fakeAdViewing(data.playerResponse.adPlacements); data.playerResponse.adPlacements = []; }
            if (data.playerResponse.playerAds) { fakeAdViewing(data.playerResponse.playerAds); data.playerResponse.playerAds = []; }
            if (data.playerResponse.adSlots) { fakeAdViewing(data.playerResponse.adSlots); data.playerResponse.adSlots = []; }
        }
    };

    const cleanPlayability = (data) => {
        // Xử lý Playability Status & Error Screen (Quantum Fix)
        if (data.playabilityStatus) {
            // 1. Luôn xóa errorScreen bất kể nội dung là gì (Tiếng Anh hay Tiếng Việt)
            if (data.playabilityStatus.errorScreen) {
                delete data.playabilityStatus.errorScreen;
                console.log('[Hunter] 🚫 Removed errorScreen (Locale-Agnostic)');
            }
            // 2. Ép status OK
            if (data.playabilityStatus.status !== 'OK' && data.playabilityStatus.status !== 'LOGIN_REQUIRED') {
                data.playabilityStatus.status = 'OK';
                data.playabilityStatus.playableInEmbed = true;
            }
        }

        // Đệ quy cho playerResponse
        if (data.playerResponse?.playabilityStatus) {
            cleanPlayability(data.playerResponse);
        }
    };

    const deMonetize = (data) => {
        // 1. Tắt kiếm tiền
        if (data.videoDetails) data.videoDetails.isMonetized = false;
        if (data.playerResponse?.videoDetails) data.playerResponse.videoDetails.isMonetized = false;

        // 2. Xóa Heartbeat & DAI
        if (data.adBreakHeartbeatParams) delete data.adBreakHeartbeatParams;
        if (data.playerResponse?.adBreakHeartbeatParams) delete data.playerResponse.adBreakHeartbeatParams;
        if (data.playerConfig?.daiConfig) data.playerConfig.daiConfig = null;
        if (data.playerResponse?.playerConfig?.daiConfig) data.playerResponse.playerConfig.daiConfig = null;

        // 3. Xóa AdBlockingInfo (Quan trọng)
        if (data.adBlockingInfo) delete data.adBlockingInfo;
        if (data.playerResponse?.adBlockingInfo) delete data.playerResponse.adBlockingInfo;
    };

    const stripPopups = (data) => {
        const checkAndRemove = (obj) => {
            if (!obj) return;
            for (let key of CONFIG.popup_keys) {
                if (obj[key]) {
                    delete obj[key];
                    console.log(`%c[Hunter] 🚫 Blocked Popup: ${key}`, 'color: red;');
                }
            }
        };

        if (data.auxiliaryUi?.messageRenderers) checkAndRemove(data.auxiliaryUi.messageRenderers);
        if (data.playerResponse?.auxiliaryUi?.messageRenderers) checkAndRemove(data.playerResponse.auxiliaryUi.messageRenderers);
        if (data.overlay) checkAndRemove(data.overlay);
    };

    const processYoutubeData = (data) => {
        if (!jsonCutEnabled || !data) return data;
        try {
            nukeAds(data);
            cleanPlayability(data); // New Logic: Universal Fix
            deMonetize(data);
            stripPopups(data);
        } catch (e) { console.warn('[Hunter] Error:', e); }
        return data;
    };

    // --- 6. DATA TRAPS ---
    const trapVariable = (varName) => {
        let internalValue = window[varName];
        try {
            Object.defineProperty(window, varName, {
                get: function () { return internalValue; },
                set: function (val) {
                    if (val) val = processYoutubeData(val); // Xử lý xong mới set
                    internalValue = val;
                },
                configurable: true
            });
        } catch (e) { }
    };

    try { trapVariable('ytInitialPlayerResponse'); trapVariable('ytInitialData'); } catch (e) { }

    // --- 7. HOOKS ---
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

    if (window.ytInitialPlayerResponse) processYoutubeData(window.ytInitialPlayerResponse);
    if (window.ytInitialData) processYoutubeData(window.ytInitialData);

    const notify = () => window.postMessage({ type: 'HUNTER_NAVIGATE_URGENT' }, '*');
    const origPush = history.pushState; history.pushState = function () { origPush.apply(this, arguments); notify(); };
    const origRep = history.replaceState; history.replaceState = function () { origRep.apply(this, arguments); notify(); };
    window.addEventListener('popstate', notify);

})();
