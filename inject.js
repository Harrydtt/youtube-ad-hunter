// inject.js - v33.2: YouTube Focus Mode - Content Optimizer
(function () {
    console.log('[Focus] Content Engine v33.2 🎯');

    // Configuration
    const CONFIG_URL = 'https://raw.githubusercontent.com/Harrydtt/youtube-ad-hunter/main/selectors.json';
    const UPDATE_INTERVAL = 3600 * 1000;

    let CONFIG = {
        adJsonKeys: ['adPlacements', 'adSlots', 'playerAds', 'adBreakHeartbeatParams'],
        popupJsonKeys: ['promotedSparklesWebRenderer', 'adRenderer', 'bannerPromoRenderer', 'compactPromotedItemRenderer'],
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
                if (data.popupJsonKeys) CONFIG.popupJsonKeys = data.popupJsonKeys;
                if (data.blockUrls) CONFIG.blockUrls = data.blockUrls;
                return;
            }

            const response = await fetch(CONFIG_URL + '?t=' + Date.now());
            if (response.ok) {
                const data = await response.json();
                if (data.adJsonKeys) CONFIG.adJsonKeys = data.adJsonKeys;
                if (data.popupJsonKeys) CONFIG.popupJsonKeys = data.popupJsonKeys;
                if (data.blockUrls) CONFIG.blockUrls = data.blockUrls;
                localStorage.setItem('focus_config', JSON.stringify(data));
                localStorage.setItem('focus_config_time', Date.now().toString());
                console.log('[Focus] Remote config loaded');
            }
        } catch (e) { }
    };

    loadRemoteConfig();

    // Listen for settings changes
    window.addEventListener('message', (e) => {
        if (e.data.type === 'FOCUS_SET_FILTER') {
            filterEnabled = e.data.enabled;
            console.log('[Focus] Filter mode:', filterEnabled ? 'ON' : 'OFF');
        }
        if (e.data.type === 'FOCUS_NAVIGATE_URGENT') {
            console.log('[Focus] Navigation detected');
        }
    });

    // Helper function for deep object processing
    const processObject = (obj, processor) => {
        if (!obj || typeof obj !== 'object') return obj;

        try {
            if (Array.isArray(obj)) {
                return obj.map(item => processObject(item, processor)).filter(Boolean);
            }

            const result = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    const processed = processor(key, obj[key]);
                    if (processed !== undefined) {
                        result[key] = processObject(processed, processor);
                    }
                }
            }
            return result;
        } catch (e) {
            return obj;
        }
    };

    // Content filter processor
    const filterContent = (key, value) => {
        if (CONFIG.adJsonKeys.includes(key)) return undefined;
        if (CONFIG.popupJsonKeys.includes(key)) return undefined;
        return value;
    };

    // Tracking URL patterns
    const trackingPatterns = [
        'googlevideo.com/ptracking',
        'youtube.com/pagead',
        'youtube.com/api/stats/ads',
        'youtube.com/api/stats/playback',
        'doubleclick.net',
        '/pagead/adview',
        '/ptracking?',
        '/api/stats/'
    ];

    // Extract tracking URLs from object
    const extractTrackingUrls = (obj, urls = [], depth = 0) => {
        if (!obj || depth > 10) return urls;
        if (typeof obj === 'string') {
            for (const pattern of trackingPatterns) {
                if (obj.includes(pattern)) {
                    urls.push(obj);
                    break;
                }
            }
        }
        if (typeof obj === 'object') {
            Object.values(obj).forEach(val => extractTrackingUrls(val, urls, depth + 1));
        }
        return urls;
    };

    // JSON.parse interceptor
    const originalParse = JSON.parse;
    JSON.parse = function (text, reviver) {
        let result = originalParse.call(this, text, reviver);

        if (!filterEnabled || !result || typeof result !== 'object') return result;

        try {
            let keysRemoved = [];
            const filterContentWithLog = (key, value) => {
                if (CONFIG.adJsonKeys.includes(key)) {
                    keysRemoved.push(key);
                    return undefined;
                }
                if (CONFIG.popupJsonKeys.includes(key)) {
                    keysRemoved.push(key);
                    return undefined;
                }
                return value;
            };

            result = processObject(result, filterContentWithLog);

            if (keysRemoved.length > 0) {
                console.log('[Focus DEBUG] 🔪 JSON.parse filtered keys:', keysRemoved);
            }
        } catch (e) {
            console.log('[Focus DEBUG] ❌ JSON.parse error:', e.message);
        }

        return result;
    };

    // Response.json interceptor
    const originalResponseJson = Response.prototype.json;
    Response.prototype.json = async function () {
        let result = await originalResponseJson.call(this);

        if (!filterEnabled || !result || typeof result !== 'object') return result;

        try {
            // Extract tracking URLs before filtering
            const urls = extractTrackingUrls(result);

            if (urls.length > 0) {
                console.log(`[Focus DEBUG] 📡 Found ${urls.length} tracking URLs, sending to background`);
                window.postMessage({ type: 'FOCUS_SEND_TO_BACKGROUND', urls }, '*');
            }

            // Filter content
            let keysRemoved = [];
            const filterContentWithLog = (key, value) => {
                if (CONFIG.adJsonKeys.includes(key)) {
                    keysRemoved.push(key);
                    return undefined;
                }
                if (CONFIG.popupJsonKeys.includes(key)) {
                    keysRemoved.push(key);
                    return undefined;
                }
                return value;
            };

            result = processObject(result, filterContentWithLog);

            if (keysRemoved.length > 0) {
                console.log('[Focus DEBUG] 🔪 Response.json filtered keys:', keysRemoved);
            }
        } catch (e) {
            console.log('[Focus DEBUG] ❌ Response.json error:', e.message);
        }

        return result;
    };

    // Object property interceptor
    const definePropertyInterceptor = () => {
        const originalDefineProperty = Object.defineProperty;
        Object.defineProperty = function (obj, prop, descriptor) {
            if (filterEnabled && CONFIG.adJsonKeys.includes(prop) && descriptor.value) {
                descriptor.value = undefined;
            }
            return originalDefineProperty.call(this, obj, prop, descriptor);
        };
    };

    definePropertyInterceptor();

    console.log('[Focus] Content Engine Active 🎯');
})();
