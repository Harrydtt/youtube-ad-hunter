// inject.js - v34.0: Focus Mode + De-Monetization Core (Hybrid Fix)
(function () {
    console.log('[Focus] Content Engine v34.0: Hybrid Core 🛡️');

    // Configuration
    const CONFIG_URL = 'https://raw.githubusercontent.com/Harrydtt/youtube-ad-hunter/main/selectors.json';
    const UPDATE_INTERVAL = 3600 * 1000;

    let CONFIG = {
        adJsonKeys: ['adPlacements', 'adSlots', 'playerAds', 'adBreakHeartbeatParams'],
        popupJsonKeys: ['promotedSparklesWebRenderer', 'adRenderer', 'bannerPromoRenderer', 'compactPromotedItemRenderer', 'playerErrorMessageRenderer'],
        blockUrls: ['ad.doubleclick.net', 'ads.youtube.com', 'googleads.g.doubleclick.net']
    };

    let filterEnabled = true;

    // Load remote configuration
    const loadRemoteConfig = async () => {
        try {
            const cached = localStorage.getItem('focus_config');
            const lastUpdate = localStorage.getItem('focus_config_time');
            if (cached && lastUpdate && Date.now() - parseInt(lastUpdate) < UPDATE_INTERVAL) {
                const data = JSON.parse(cached);
                if (data.adJsonKeys) CONFIG.adJsonKeys = data.adJsonKeys;
                return;
            }
            const response = await fetch(CONFIG_URL + '?t=' + Date.now());
            if (response.ok) {
                const data = await response.json();
                if (data.adJsonKeys) CONFIG.adJsonKeys = data.adJsonKeys;
                localStorage.setItem('focus_config', JSON.stringify(data));
                localStorage.setItem('focus_config_time', Date.now().toString());
            }
        } catch (e) { }
    };
    loadRemoteConfig();

    window.addEventListener('message', (e) => {
        if (e.data.type === 'FOCUS_SET_FILTER') filterEnabled = e.data.enabled;
    });

    // --- HELPER: Extract Tracking URLs ---
    const extractUrlsFromObject = (obj, urls = [], depth = 0) => {
        if (!obj || depth > 10) return urls;
        if (typeof obj === 'string') {
            if (obj.includes('ptracking') || obj.includes('/pagead/') || obj.includes('/api/stats/')) urls.push(obj);
        } else if (typeof obj === 'object') {
            Object.values(obj).forEach(val => extractUrlsFromObject(val, urls, depth + 1));
        }
        return urls;
    };

    // --- CORE LOGIC: DE-MONETIZATION & SANITIZATION ---
    const sanitizeData = (data) => {
        if (!data || typeof data !== 'object') return data;

        // 1. Force OK Status (Fix popup blocking playback)
        if (data.playabilityStatus) {
            if (data.playabilityStatus.status !== 'OK' && data.playabilityStatus.status !== 'LOGIN_REQUIRED') {
                data.playabilityStatus.status = 'OK';
                data.playabilityStatus.playableInEmbed = true;
                if (data.playabilityStatus.errorScreen) delete data.playabilityStatus.errorScreen;
                console.log('[Focus] 🚑 Forced playabilityStatus to OK');
            }
        }

        // 2. De-Monetize (Remove monetization flag to be consistent with no ads)
        if (data.videoDetails) {
            if (data.videoDetails.isMonetized) {
                data.videoDetails.isMonetized = false;
                console.log('[Focus] 💰 Set isMonetized = false');
            }
        }
        if (data.playerResponse?.videoDetails) {
            data.playerResponse.videoDetails.isMonetized = false;
        }

        // 3. Remove Ad Flags (Cause of playback errors)
        if (data.adBreakHeartbeatParams) delete data.adBreakHeartbeatParams;
        if (data.playerResponse?.adBreakHeartbeatParams) delete data.playerResponse.adBreakHeartbeatParams;

        return data;
    };

    // --- RECURSIVE FILTER ---
    const processObject = (obj, processor) => {
        if (!obj || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(item => processObject(item, processor)).filter(Boolean);

        const result = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const processed = processor(key, obj[key]);
                if (processed !== undefined) {
                    result[key] = processObject(processed, processor);
                }
            }
        }
        return result;
    };

    // --- MAIN DATA PROCESSOR ---
    const processYoutubeData = (data) => {
        if (!filterEnabled || !data) return data;

        try {
            // Step 1: Sanitize metadata (Fix popup issue - De-Monetize)
            sanitizeData(data);

            // Step 2: Filter Ads & Collect URLs
            let allUrls = [];
            const filterAndExtract = (key, value) => {
                if (CONFIG.adJsonKeys.includes(key)) {
                    const urls = extractUrlsFromObject(value);
                    if (urls.length > 0) {
                        allUrls.push(...urls);
                        console.log(`[Focus] 📡 Extracted ${urls.length} URLs from ${key}`);
                    }
                    return undefined; // DELETE KEY
                }
                if (CONFIG.popupJsonKeys.includes(key)) return undefined; // DELETE KEY
                return value;
            };

            const processedData = processObject(data, filterAndExtract);

            // Step 3: Send collected URLs to background for processing
            if (allUrls.length > 0) {
                window.postMessage({ type: 'FOCUS_SEND_TO_BACKGROUND', urls: allUrls }, '*');
            }

            return processedData;

        } catch (e) {
            console.error('[Focus] Error processing data:', e);
            return data;
        }
    };

    // --- JSON.parse HOOK ---
    const originalParse = JSON.parse;
    JSON.parse = function (text, reviver) {
        const data = originalParse.call(this, text, reviver);
        return processYoutubeData(data);
    };

    // --- Response.json HOOK ---
    const originalJson = Response.prototype.json;
    Response.prototype.json = async function () {
        const data = await originalJson.call(this);
        return processYoutubeData(data);
    };

    // --- Initial Data Cleanup (for already loaded data) ---
    if (window.ytInitialPlayerResponse) {
        console.log('[Focus] Cleaning initial player response');
        window.ytInitialPlayerResponse = processYoutubeData(window.ytInitialPlayerResponse);
    }
    if (window.ytInitialData) {
        window.ytInitialData = processYoutubeData(window.ytInitialData);
    }

    // --- OUTGOING REQUEST INTERCEPTOR (Capture REAL URLs) ---
    const isRealTrackingUrl = (url) => {
        if (!url || typeof url !== 'string') return false;
        return ['ptracking', '/api/stats/ads', '/pagead/adview', 'doubleclick.net'].some(p => url.includes(p));
    };

    const logRealTrackingUrl = (method, url) => {
        window.postMessage({ type: 'FOCUS_REAL_TRACKING_URL', method, url }, '*');
    };

    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url, ...args) {
        if (isRealTrackingUrl(url)) logRealTrackingUrl('XHR', url);
        return originalXHROpen.apply(this, [method, url, ...args]);
    };

    const originalFetch = window.fetch;
    window.fetch = function (input, init) {
        const url = typeof input === 'string' ? input : input?.url;
        if (isRealTrackingUrl(url)) logRealTrackingUrl('fetch', url);
        return originalFetch.apply(this, arguments);
    };

    console.log('[Focus] v34.0 Active ✅');
})();
