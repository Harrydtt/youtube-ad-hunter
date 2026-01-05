// inject.js - v24: The Detective (Deep Inspection)
(function () {
    console.log('[Hunter] Stealth Engine v24: The Detective 🕵️‍♂️');

    // --- 1. CONFIG & STATE ---
    let CONFIG = {
        ad_keys: ['adPlacements', 'playerAds', 'adSlots', 'kidsAdPlacements', 'adBreakResponse'],
        tracking_keys: ['impressionEndpoints', 'adImpressionUrl', 'clickthroughEndpoint', 'start', 'firstQuartile', 'midpoint', 'thirdQuartile', 'complete', 'ping'],
        popup_keys: ['upsellDialogRenderer', 'promoMessageRenderer', 'tvAppUpsellDialogRenderer']
    };
    let jsonCutEnabled = true;

    // Load Config (Backup)
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
        }
    });

    // --- 2. BEACON SYSTEM ---
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

    // --- 3. CORE LOGIC: THE DETECTIVE ---
    const processAdPlacements = (placements) => {
        if (!Array.isArray(placements) || placements.length === 0) return placements;

        return placements.filter((p, index) => {
            const renderer = p.adPlacementRenderer?.renderer?.adBreakRenderer || p.adPlacementRenderer;
            let isPreroll = false;

            // Debug Info
            const debugType = renderer?.adBreakType || p.adPlacementRenderer?.config?.adPlacementConfig?.kind;
            const debugTime = p.adPlacementRenderer?.timeOffsetMilliseconds;

            // 1. Check Keywords (PREROLL / 0)
            const adType = String(debugType).toUpperCase();
            if (adType.includes('PREROLL') || adType === '0') isPreroll = true;

            // 2. Check Time (if exists)
            if (debugTime !== undefined && debugTime !== null) {
                const t = parseInt(debugTime);
                if (!isNaN(t) && t < 5000) isPreroll = true;
            } else {
                // 3. Heuristic: Index 0 thường là Preroll nếu time = undefined
                // Trừ phi nó là loại "AD_PLACEMENT_KIND_END" (quảng cáo cuối)
                if (index === 0 && !adType.includes('END')) {
                    console.log('[Hunter] 🕵️‍♂️ Suspicious Index 0 with no time -> Assuming Preroll');
                    isPreroll = true;
                }
            }

            console.log(`[Check #${index}] Type: ${debugType}, Time: ${debugTime} -> Kill? ${isPreroll}`);

            if (isPreroll) {
                fakeAdViewing(p);
                return false; // Kill
            }

            return true; // Keep (Midroll)
        });
    };

    const stripPopups = (data) => {
        if (data.auxiliaryUi?.messageRenderers) {
            for (let key of CONFIG.popup_keys) {
                if (data.auxiliaryUi.messageRenderers[key]) delete data.auxiliaryUi.messageRenderers[key];
            }
        }
        if (data.overlay?.upsellDialogRenderer) delete data.overlay.upsellDialogRenderer;
    };

    const processYoutubeData = (data) => {
        if (!jsonCutEnabled || !data) return data;
        try {
            if (data.adPlacements) data.adPlacements = processAdPlacements(data.adPlacements);
            if (data.playerResponse?.adPlacements) data.playerResponse.adPlacements = processAdPlacements(data.playerResponse.adPlacements);

            if (data.playerAds) { fakeAdViewing(data.playerAds); data.playerAds = []; }
            if (data.playerResponse?.playerAds) { fakeAdViewing(data.playerResponse.playerAds); data.playerResponse.playerAds = []; }
            if (data.adSlots) { fakeAdViewing(data.adSlots); data.adSlots = []; }

            stripPopups(data);
            if (data.playerResponse) stripPopups(data.playerResponse);
        } catch (e) { console.warn('[Hunter] Error:', e); }
        return data;
    };

    // --- 4. TRAPS ---
    const trapVariable = (varName) => {
        let internalValue = window[varName];
        Object.defineProperty(window, varName, {
            get: function () { return internalValue; },
            set: function (val) { internalValue = processYoutubeData(val); },
            configurable: true
        });
    };
    try {
        trapVariable('ytInitialPlayerResponse');
        trapVariable('ytInitialData');
    } catch (e) { }

    // --- 5. HOOKS ---
    const originalParse = JSON.parse;
    JSON.parse = function (text, reviver) {
        try {
            const data = originalParse(text, reviver);
            if (data && (data.adPlacements || data.playerResponse || data.auxiliaryUi)) return processYoutubeData(data);
            return data;
        } catch (e) { return originalParse(text, reviver); }
    };

    const originalJson = Response.prototype.json;
    Response.prototype.json = async function () {
        try {
            const data = await originalJson.call(this);
            if (data && (data.adPlacements || data.playerResponse || data.auxiliaryUi)) return processYoutubeData(data);
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
