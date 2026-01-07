// inject.js - v44.0: Surgeon + Remote Brain + Anti-Enforcement 🧠
(function () {
    console.log('[Inject] Surgeon Ready 🔪');

    // --- DEFAULT CONFIG (Fallback) ---
    let CONFIG = {
        adJsonKeys: ['adPlacements', 'adSlots', 'playerAds', 'adBreakHeartbeatParams', 'adBlockingInfo'],
        popupJsonKeys: ['enforcementMessageViewModel', 'reloadContinuationData', 'promotedSparklesWebRenderer', 'adRenderer', 'bannerPromoRenderer', 'compactPromotedItemRenderer', 'playerErrorMessageRenderer', 'mealbarPromoRenderer'],
        trackingKeys: ['impressionEndpoints', 'adImpressionUrl', 'clickthroughEndpoint', 'start', 'firstQuartile', 'midpoint', 'thirdQuartile', 'complete', 'ping']
    };

    // URL Config
    const CONFIG_URL = 'https://raw.githubusercontent.com/Harrydtt/youtube-ad-hunter/main/config.json';
    const CACHE_TIME = 3600 * 1000;

    // --- LOAD REMOTE CONFIG ---
    const loadConfig = async () => {
        try {
            const cached = localStorage.getItem('hunter_config');
            const lastUpdate = localStorage.getItem('hunter_config_time');

            if (cached && lastUpdate && Date.now() - parseInt(lastUpdate) < CACHE_TIME) {
                const data = JSON.parse(cached);
                if (data.ad_keys) CONFIG.adJsonKeys = data.ad_keys;
                if (data.popup_keys) CONFIG.popupJsonKeys = data.popup_keys;
                if (data.tracking_keys) CONFIG.trackingKeys = data.tracking_keys;
                return;
            }

            const res = await fetch(CONFIG_URL);
            if (res.ok) {
                const data = await res.json();
                if (data.ad_keys) CONFIG.adJsonKeys = data.ad_keys;
                if (data.popup_keys) CONFIG.popupJsonKeys = data.popup_keys;
                if (data.tracking_keys) CONFIG.trackingKeys = data.tracking_keys;

                localStorage.setItem('hunter_config', JSON.stringify(data));
                localStorage.setItem('hunter_config_time', Date.now().toString());
                console.log('[Inject] Updated Config from GitHub ☁️');
            }
        } catch (e) {
            console.warn('[Inject] Config Fetch Failed, using default');
        }
    };
    loadConfig();

    // --- STATE ---
    let isEnabled = true;

    window.addEventListener('message', (e) => {
        if (e.data.type === 'HUNTER_TOGGLE_JSON') isEnabled = e.data.enabled;
    });

    // --- CORE 1: URL EXTRACTION (Móc túi trước khi cắt) ---
    const extractUrlsFromObject = (obj, urls = [], depth = 0) => {
        if (!obj || depth > 15) return urls;

        if (typeof obj === 'string') {
            if (obj.includes('ptracking') || obj.includes('/pagead/') || obj.includes('/api/stats/') || obj.includes('doubleclick.net')) {
                urls.push(obj);
            }
        } else if (typeof obj === 'object') {
            for (const key of CONFIG.trackingKeys) {
                if (obj[key]) {
                    const val = obj[key];
                    if (typeof val === 'string') urls.push(val);
                    else if (Array.isArray(val)) {
                        val.forEach(v => {
                            if (typeof v === 'string') urls.push(v);
                            else if (v && v.baseUrl) urls.push(v.baseUrl);
                        });
                    }
                }
            }
            Object.values(obj).forEach(val => extractUrlsFromObject(val, urls, depth + 1));
        }
        return urls;
    };

    // --- CORE 2: DE-MONETIZATION (Lừa Player) ---
    const sanitizeData = (data) => {
        if (!data || typeof data !== 'object') return;

        // 1. Force playabilityStatus = OK
        if (data.playabilityStatus) {
            if (data.playabilityStatus.status !== 'OK' && data.playabilityStatus.status !== 'LOGIN_REQUIRED') {
                data.playabilityStatus.status = 'OK';
                data.playabilityStatus.playableInEmbed = true;
                if (data.playabilityStatus.errorScreen) delete data.playabilityStatus.errorScreen;
                console.log('[Inject] 🚑 Forced playabilityStatus to OK');
            }
        }

        // 2. FORCE isMonetized = false
        if (data.videoDetails) {
            data.videoDetails.isMonetized = false;
        }
        if (data.playerResponse?.videoDetails) {
            data.playerResponse.videoDetails.isMonetized = false;
        }

        // 3. Cắt đứt liên lạc với Ad Server
        if (data.adBreakHeartbeatParams) delete data.adBreakHeartbeatParams;
        if (data.playerResponse?.adBreakHeartbeatParams) delete data.playerResponse.adBreakHeartbeatParams;

        // 4. Remove ad-related signals
        if (data.adSignalsInfo) delete data.adSignalsInfo;
        if (data.attestation) delete data.attestation;
        if (data.adPlacements) delete data.adPlacements;

        // 5. NUKE AdBlock Enforcement
        if (data.adBlockingInfo) delete data.adBlockingInfo;
        if (data.playerResponse?.adBlockingInfo) delete data.playerResponse.adBlockingInfo;

        // 6. NUKE auxiliaryUi chứa Popup Enforcement
        if (data.auxiliaryUi?.messageRenderers?.enforcementMessageViewModel) {
            console.log('[Inject] ☢️ Nuked auxiliaryUi (Popup Payload)');
            delete data.auxiliaryUi;
        }
        if (data.playerResponse?.auxiliaryUi?.messageRenderers?.enforcementMessageViewModel) {
            delete data.playerResponse.auxiliaryUi;
        }
    };

    // --- MAIN PROCESSOR ---
    const processObject = (obj, processor) => {
        if (!obj || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(item => processObject(item, processor)).filter(Boolean);

        const result = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                if (key === 'playabilityStatus' || key === 'videoDetails' || key === 'playerResponse') {
                    sanitizeData({ [key]: obj[key] });
                }

                const processed = processor(key, obj[key]);
                if (processed !== undefined) {
                    result[key] = processObject(processed, processor);
                }
            }
        }
        return result;
    };

    const processYoutubeData = (data) => {
        if (!isEnabled || !data) return data;

        try {
            // De-Monetize first
            sanitizeData(data);

            let allUrls = [];

            const filterAndExtract = (key, value) => {
                // Ad keys -> Extract URLs -> Remove
                if (CONFIG.adJsonKeys.includes(key)) {
                    const urls = extractUrlsFromObject(value);
                    if (urls.length > 0) {
                        allUrls.push(...urls);
                        console.log(`[Inject] 📡 Extracted ${urls.length} URLs from ${key}`);
                    }
                    return undefined;
                }
                // Popup keys -> Remove
                if (CONFIG.popupJsonKeys.includes(key)) return undefined;

                return value;
            };

            const processedData = processObject(data, filterAndExtract);

            // Send URLs to Offscreen
            if (allUrls.length > 0) {
                console.log(`[Inject] 📤 Sending ${allUrls.length} template URLs to offscreen`);
                window.postMessage({ type: 'HUNTER_BEACON', urls: allUrls }, '*');
            }

            return processedData;

        } catch (e) {
            console.error('[Inject] Error:', e);
            return data;
        }
    };

    // --- HOOKS ---
    // 1. Hook JSON.parse
    const originalParse = JSON.parse;
    JSON.parse = function (text, reviver) {
        const data = originalParse.call(this, text, reviver);
        return processYoutubeData(data);
    };

    // 2. Hook Response.json
    const originalJson = Response.prototype.json;
    Response.prototype.json = async function () {
        const data = await originalJson.call(this);
        return processYoutubeData(data);
    };

    // --- PROPERTY TRAPS (Bắt data TRƯỚC khi YouTube đọc) ---
    let _ytInitialPlayerResponse = window.ytInitialPlayerResponse;
    let _ytInitialData = window.ytInitialData;

    Object.defineProperty(window, 'ytInitialPlayerResponse', {
        configurable: true,
        get: function () { return _ytInitialPlayerResponse; },
        set: function (value) {
            console.log('[Inject] 🪤 TRAPPED ytInitialPlayerResponse SET!');
            _ytInitialPlayerResponse = processYoutubeData(value);
        }
    });

    Object.defineProperty(window, 'ytInitialData', {
        configurable: true,
        get: function () { return _ytInitialData; },
        set: function (value) {
            console.log('[Inject] 🪤 TRAPPED ytInitialData SET!');
            _ytInitialData = processYoutubeData(value);
        }
    });

    // Process if already exists
    if (_ytInitialPlayerResponse) {
        console.log('[Inject] Cleaning existing ytInitialPlayerResponse');
        _ytInitialPlayerResponse = processYoutubeData(_ytInitialPlayerResponse);
    }
    if (_ytInitialData) {
        _ytInitialData = processYoutubeData(_ytInitialData);
    }

    console.log('[Inject] v44.0 Active: Hooks + Property Traps ✅');
})();