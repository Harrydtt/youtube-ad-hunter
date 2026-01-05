// inject.js - v28: The Consistency Fix (Resurrected De-Monetization)
(function () {
    console.log('[Hunter] Stealth Engine v28.1: Consistency Fix (Hotfix) 🧩');

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
            'youTubePaymentPromoRenderer' // Thêm cái này cho chắc
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
            console.log(`%c[Nuclear] ⚙️ Cut Mode: ${jsonCutEnabled}`, 'color: orange');
        }
    });

    // --- 2. CSS MUZZLE (The Bouncer) ---
    const style = document.createElement('style');
    style.id = 'hunter-muzzle-css';
    style.textContent = `
        ytd-enforcement-message-view-model,
        tp-yt-paper-dialog[role="dialog"] ytd-enforcement-message-view-model,
        #mealbar-promo-renderer,
        ytd-popup-container ytd-promo-message-renderer,
        ytd-popup-container ytd-unity-gamification-renderer,
        ytd-popup-container ytd-mealbar-promo-renderer,
        .ytp-ad-overlay-container
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

    // --- 3. DOM BOUNCER (MutationObserver) ---
    const observer = new MutationObserver((mutations) => {
        if (!jsonCutEnabled) return;
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType !== 1) continue;
                const tag = node.tagName.toLowerCase();
                const id = node.id;
                if (tag === 'ytd-enforcement-message-view-model' ||
                    tag === 'ytd-mealbar-promo-renderer' ||
                    id === 'mealbar-promo-renderer' ||
                    (tag === 'tp-yt-paper-dialog' && node.querySelector('ytd-enforcement-message-view-model'))
                ) {
                    node.remove();
                    console.log(`%c[Bouncer] 🥊 Kicked out: ${tag}#${id}`, 'color: red; font-weight: bold;');
                    const video = document.querySelector('video');
                    if (video && video.paused) { showVideo(); video.play(); }
                }
            }
        }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    // --- 4. BEACON SYSTEM ---
    const sendToOffscreen = (urls) => {
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

    // --- 5. CORE LOGIC: NUKE & STRIP & DEMONETIZE ---
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

    // RESURRECTED LOGIC: De-Monetization
    const deMonetize = (data) => {
        // 1. Tắt cờ kiếm tiền
        if (data.videoDetails) data.videoDetails.isMonetized = false;
        if (data.playerResponse?.videoDetails) data.playerResponse.videoDetails.isMonetized = false;

        // 2. Xóa nhịp tim Ads (Nguyên nhân chính gây lỗi playback error)
        if (data.adBreakHeartbeatParams) delete data.adBreakHeartbeatParams;
        if (data.playerResponse?.adBreakHeartbeatParams) delete data.playerResponse.adBreakHeartbeatParams;

        // 3. Xóa cấu hình DAI (Ads động)
        if (data.playerConfig?.daiConfig) data.playerConfig.daiConfig = null;
        if (data.playerResponse?.playerConfig?.daiConfig) data.playerResponse.playerConfig.daiConfig = null;

        // 4. Xóa thông tin phát hiện Adblock (Nguyên nhân link support)
        if (data.adBlockingInfo) delete data.adBlockingInfo;
        if (data.playerResponse?.adBlockingInfo) delete data.playerResponse.adBlockingInfo;

        if (data.playabilityStatus?.errorScreen?.playerErrorMessageRenderer?.reason?.simpleText?.includes('Ad blockers')) {
            delete data.playabilityStatus.errorScreen;
            data.playabilityStatus.status = 'OK';
        }
    };

    const stripPopups = (data) => {
        const checkAndRemove = (obj) => {
            if (!obj) return;
            for (let key of CONFIG.popup_keys) {
                if (obj[key]) {
                    delete obj[key];
                    console.log(`%c[Hunter] 🚫 Blocked: ${key}`, 'color: red;');
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
            nukeAds(data);       // B1: Xóa Ads
            deMonetize(data);    // B2: Xóa kiếm tiền (Fix Popup Soft Failure)
            stripPopups(data);   // B3: Xóa Banner rác
        } catch (e) { console.warn('[Hunter] Error:', e); }
        return data;
    };

    // --- 6. DATA TRAPS ---
    const ensurePlayability = (data) => {
        if (data.playabilityStatus) {
            if (data.playabilityStatus.status === 'LOGIN_REQUIRED') return;
            if (data.playabilityStatus.status !== 'OK') {
                data.playabilityStatus.status = 'OK';
                data.playabilityStatus.playableInEmbed = true;
                if (data.playabilityStatus.errorScreen) delete data.playabilityStatus.errorScreen;
            }
        }
    };

    const trapVariable = (varName) => {
        let internalValue = window[varName];
        try {
            Object.defineProperty(window, varName, {
                get: function () { return internalValue; },
                set: function (val) {
                    if (val) {
                        val = processYoutubeData(val);
                        if (val.playabilityStatus) ensurePlayability(val);
                    }
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
            if (data) { processYoutubeData(data); if (data.playabilityStatus) ensurePlayability(data); }
            return data;
        } catch (e) { return originalParse(text, reviver); }
    };

    const originalJson = Response.prototype.json;
    Response.prototype.json = async function () {
        try {
            const data = await originalJson.call(this);
            if (data) { processYoutubeData(data); if (data.playabilityStatus) ensurePlayability(data); }
            return data;
        } catch (e) { return originalJson.call(this); }
    };

    if (window.ytInitialPlayerResponse) {
        processYoutubeData(window.ytInitialPlayerResponse);
        ensurePlayability(window.ytInitialPlayerResponse);
    }
    if (window.ytInitialData) processYoutubeData(window.ytInitialData);

    const notify = () => window.postMessage({ type: 'HUNTER_NAVIGATE_URGENT' }, '*');
    const origPush = history.pushState; history.pushState = function () { origPush.apply(this, arguments); notify(); };
    const origRep = history.replaceState; history.replaceState = function () { origRep.apply(this, arguments); notify(); };
    window.addEventListener('popstate', notify);

})();
