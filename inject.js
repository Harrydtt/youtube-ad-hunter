// inject.js - v22: The Diplomat (Smart Pruning + Anti-Popup)
(function () {
    console.log('[Hunter] Stealth Engine v22: The Diplomat 🎩');

    // --- 1. CONFIG & STATE ---
    let CONFIG = {
        ad_keys: ['adPlacements', 'playerAds', 'adSlots', 'kidsAdPlacements', 'adBreakResponse'],
        tracking_keys: ['impressionEndpoints', 'adImpressionUrl', 'clickthroughEndpoint', 'start', 'firstQuartile', 'midpoint', 'thirdQuartile', 'complete', 'ping'],
        popup_keys: ['upsellDialogRenderer', 'promoMessageRenderer', 'tvAppUpsellDialogRenderer'],
        preroll_indicators: ['PREROLL', '0', 0]
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

    // --- 2. BEACON SYSTEM (DIPLOMATIC CHANNEL) ---
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
                console.log(`%c[Diplomat] 🤝 Negotiated ${urls.length} fake views`, 'color: #00ffff');
            }
        } catch (e) { }
    };

    // --- 3. CORE LOGIC: GENTLE PRUNING ---
    const processAdPlacements = (placements) => {
        if (!Array.isArray(placements) || placements.length === 0) return placements;

        // Vòng lặp Ngoại giao: Chỉ cắt Preroll (gây phiền nhất), giữ Midroll (để Logic 2 xử lý)
        // Việc giữ lại Midroll giúp cấu trúc JSON trông "thật" hơn -> Tránh Detect
        return placements.filter(p => {
            const renderer = p.adPlacementRenderer?.renderer?.adBreakRenderer || p.adPlacementRenderer;
            let isPreroll = false;

            if (renderer?.adBreakType && CONFIG.preroll_indicators.includes(renderer.adBreakType)) isPreroll = true;
            if (p.adPlacementRenderer?.config?.adPlacementConfig?.kind && CONFIG.preroll_indicators.includes(p.adPlacementRenderer.config.adPlacementConfig.kind)) isPreroll = true;

            // Check thời gian
            const timeOffset = p.adPlacementRenderer?.timeOffsetMilliseconds;
            if (CONFIG.preroll_indicators.includes(timeOffset)) isPreroll = true;

            if (isPreroll) {
                console.log('%c[Hunter] � Preroll removed silently', 'color: gray');
                fakeAdViewing(p); // Nộp thuế trước khi cắt
                return false;
            }

            // Midroll giữ lại -> Không xóa -> Integrity Check OK
            return true;
        });
    };

    const stripPopups = (data) => {
        if (data.auxiliaryUi?.messageRenderers) {
            for (let key of CONFIG.popup_keys) {
                if (data.auxiliaryUi.messageRenderers[key]) {
                    delete data.auxiliaryUi.messageRenderers[key];
                }
            }
        }
        if (data.overlay?.upsellDialogRenderer) delete data.overlay.upsellDialogRenderer;
    };

    const processYoutubeData = (data) => {
        if (!jsonCutEnabled || !data) return data;

        try {
            // 1. Ngoại giao (Fake View) cho toàn bộ
            // (Code cũ copy adClone ở đây, nhưng giờ ta làm trong processAdPlacements cho chính xác từng item)

            // 2. Xử lý Mảng AdPlacements (Chiến thuật v17)
            if (data.adPlacements) {
                data.adPlacements = processAdPlacements(data.adPlacements);
            }
            if (data.playerResponse?.adPlacements) {
                data.playerResponse.adPlacements = processAdPlacements(data.playerResponse.adPlacements);
            }

            // 3. Xử lý AdSlots / PlayerAds (Những cái râu ria xóa hết cũng được)
            if (data.playerAds) { fakeAdViewing(data.playerAds); data.playerAds = []; }
            if (data.adSlots) { fakeAdViewing(data.adSlots); data.adSlots = []; }

            // 4. Diệt Popup (Lưới an toàn)
            stripPopups(data);
            if (data.playerResponse) stripPopups(data.playerResponse);

        } catch (e) { console.warn('[Hunter] Error:', e); }
        return data;
    };

    // --- 4. DATA TRAPS ---
    const trapVariable = (varName) => {
        let internalValue = window[varName];
        Object.defineProperty(window, varName, {
            get: function () { return internalValue; },
            set: function (val) {
                internalValue = processYoutubeData(val);
            },
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
            if (data && (data.adPlacements || data.playerResponse || data.auxiliaryUi)) {
                return processYoutubeData(data);
            }
            return data;
        } catch (e) { return originalParse(text, reviver); }
    };

    const originalJson = Response.prototype.json;
    Response.prototype.json = async function () {
        try {
            const data = await originalJson.call(this);
            if (data && (data.adPlacements || data.playerResponse || data.auxiliaryUi)) {
                return processYoutubeData(data);
            }
            return data;
        } catch (e) { return originalJson.call(this); }
    };

    // --- 6. CLEANUP ---
    if (window.ytInitialPlayerResponse) processYoutubeData(window.ytInitialPlayerResponse);
    if (window.ytInitialData) processYoutubeData(window.ytInitialData);

    const notify = () => window.postMessage({ type: 'HUNTER_NAVIGATE_URGENT' }, '*');
    const origPush = history.pushState; history.pushState = function () { origPush.apply(this, arguments); notify(); };
    const origRep = history.replaceState; history.replaceState = function () { origRep.apply(this, arguments); notify(); };
    window.addEventListener('popstate', notify);

})();
