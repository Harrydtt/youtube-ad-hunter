// inject.js - v19: The Time Stopper (Trap Restored)
(function () {
    console.log('[Hunter] Stealth Engine v19: The Time Stopper ⏱️');

    // --- 1. CONFIG & STATE ---
    let CONFIG = {
        ad_keys: ['adPlacements', 'playerAds', 'adSlots', 'kidsAdPlacements', 'adBreakResponse'],
        tracking_keys: ['impressionEndpoints', 'adImpressionUrl', 'clickthroughEndpoint', 'start', 'firstQuartile', 'midpoint', 'thirdQuartile', 'complete', 'ping'],
        monetization_flags: ['isMonetized', 'isCrawlable', 'showAds', 'allowBelowThePlayerCompanion'],
        preroll_indicators: ['PREROLL', '0', 0]
    };
    let jsonCutEnabled = true;

    // Load Config động (Backup)
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

    // --- 3. DE-MONETIZATION LOGIC ---
    const stripMonetization = (data) => {
        if (data.videoDetails) {
            data.videoDetails.isMonetized = false;
            if (data.videoDetails.allowRatings === false) data.videoDetails.allowRatings = true;
        }
        if (data.playerConfig && data.playerConfig.daiConfig) {
            data.playerConfig.daiConfig = null;
        }
        if (data.adBreakHeartbeatParams) {
            delete data.adBreakHeartbeatParams;
        }
        if (data.playabilityStatus && data.playabilityStatus.status === 'OK_WITH_ADS') {
            data.playabilityStatus.status = 'OK';
        }
    };

    // --- 4. CORE PROCESSOR ---
    const processYoutubeData = (data) => {
        if (!jsonCutEnabled || !data) return data;

        try {
            // A. Fake View
            const adClone = {};
            if (data.adPlacements) adClone.adPlacements = data.adPlacements;
            if (data.playerResponse?.adPlacements) adClone.nestedAds = data.playerResponse.adPlacements;
            if (data.playerAds) adClone.playerAds = data.playerAds;

            if (Object.keys(adClone).length > 0) fakeAdViewing(adClone);

            // B. Xóa sạch Ads
            if (data.adPlacements) data.adPlacements = [];
            if (data.playerAds) data.playerAds = [];
            if (data.adSlots) data.adSlots = [];
            if (data.playerResponse) {
                if (data.playerResponse.adPlacements) data.playerResponse.adPlacements = [];
                if (data.playerResponse.playerAds) data.playerResponse.playerAds = [];
            }

            // C. De-Monetize
            stripMonetization(data);

        } catch (e) { console.warn('[Hunter] Error:', e); }
        return data;
    };

    // --- 5. THE TRAP (Object.defineProperty) - CRITICAL RESTORATION ---
    // Bắt dính biến ngay khi Player vừa mới định đọc nó
    let _ytInitialPlayerResponse = window.ytInitialPlayerResponse;
    Object.defineProperty(window, 'ytInitialPlayerResponse', {
        get: function () {
            return _ytInitialPlayerResponse;
        },
        set: function (val) {
            _ytInitialPlayerResponse = processYoutubeData(val);
            console.log('[Hunter] 🪝 Trapped ytInitialPlayerResponse');
        },
        configurable: true
    });

    // --- 6. STANDARD HOOKS ---
    const originalParse = JSON.parse;
    JSON.parse = function (text, reviver) {
        try {
            const data = originalParse(text, reviver);
            if (data && (data.adPlacements || data.videoDetails || data.playerResponse)) {
                return processYoutubeData(data);
            }
            return data;
        } catch (e) { return originalParse(text, reviver); }
    };

    const originalJson = Response.prototype.json;
    Response.prototype.json = async function () {
        try {
            const data = await originalJson.call(this);
            if (data && (data.adPlacements || data.videoDetails || data.playerResponse)) {
                return processYoutubeData(data);
            }
            return data;
        } catch (e) { return originalJson.call(this); }
    };

    // --- 7. CLEANUP INITIAL ---
    if (window.ytInitialPlayerResponse) {
        processYoutubeData(window.ytInitialPlayerResponse);
        console.log('[Hunter] Processed existing ytInitialPlayerResponse');
    }

    // History Patch
    const notify = () => window.postMessage({ type: 'HUNTER_NAVIGATE_URGENT' }, '*');
    const origPush = history.pushState; history.pushState = function () { origPush.apply(this, arguments); notify(); };
    const origRep = history.replaceState; history.replaceState = function () { origRep.apply(this, arguments); notify(); };
    window.addEventListener('popstate', notify);

})();
