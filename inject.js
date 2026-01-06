// inject.js - v33.7: YouTube Focus Mode - Content Optimizer + URL Tracking
(function () {
    console.log('[Focus] Content Engine v33.7 🎯');

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

    // Tracking URL patterns for extracting from JSON
    const jsonTrackingPatterns = [
        'googlevideo.com/ptracking',
        'youtube.com/pagead',
        'youtube.com/api/stats',
        'doubleclick.net',
        '/pagead/',
        '/ptracking'
    ];

    // Extract tracking URLs from an object (recursive)
    const extractUrlsFromObject = (obj, urls = [], depth = 0) => {
        if (!obj || depth > 15) return urls;
        if (typeof obj === 'string') {
            for (const pattern of jsonTrackingPatterns) {
                if (obj.includes(pattern)) {
                    urls.push(obj);
                    break;
                }
            }
        }
        if (typeof obj === 'object') {
            Object.values(obj).forEach(val => extractUrlsFromObject(val, urls, depth + 1));
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
            let allUrls = [];

            const filterAndExtract = (key, value) => {
                if (CONFIG.adJsonKeys.includes(key)) {
                    const urls = extractUrlsFromObject(value);
                    if (urls.length > 0) {
                        allUrls.push(...urls);
                        console.log(`[Focus DEBUG] 📡 Extracted ${urls.length} URLs from ${key}`);
                    }
                    keysRemoved.push(key);
                    return undefined;
                }
                if (CONFIG.popupJsonKeys.includes(key)) {
                    keysRemoved.push(key);
                    return undefined;
                }
                return value;
            };

            result = processObject(result, filterAndExtract);

            if (keysRemoved.length > 0) {
                console.log('[Focus DEBUG] 🔪 JSON.parse filtered keys:', keysRemoved);
            }

            if (allUrls.length > 0) {
                console.log(`[Focus DEBUG] 📤 Sending ${allUrls.length} tracking URLs to offscreen`);
                window.postMessage({ type: 'FOCUS_SEND_TO_BACKGROUND', urls: allUrls }, '*');
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
            let keysRemoved = [];
            let allUrls = [];

            const filterAndExtract = (key, value) => {
                if (CONFIG.adJsonKeys.includes(key)) {
                    const urls = extractUrlsFromObject(value);
                    if (urls.length > 0) {
                        allUrls.push(...urls);
                        console.log(`[Focus DEBUG] 📡 Extracted ${urls.length} URLs from ${key} (Response)`);
                    }
                    keysRemoved.push(key);
                    return undefined;
                }
                if (CONFIG.popupJsonKeys.includes(key)) {
                    keysRemoved.push(key);
                    return undefined;
                }
                return value;
            };

            result = processObject(result, filterAndExtract);

            if (keysRemoved.length > 0) {
                console.log('[Focus DEBUG] 🔪 Response.json filtered keys:', keysRemoved);
            }

            if (allUrls.length > 0) {
                console.log(`[Focus DEBUG] 📤 Sending ${allUrls.length} tracking URLs to offscreen (Response)`);
                window.postMessage({ type: 'FOCUS_SEND_TO_BACKGROUND', urls: allUrls }, '*');
            }
        } catch (e) {
            console.log('[Focus DEBUG] ❌ Response.json error:', e.message);
        }

        return result;
    };

    // Object property interceptor
    const originalDefineProperty = Object.defineProperty;
    Object.defineProperty = function (obj, prop, descriptor) {
        if (filterEnabled && CONFIG.adJsonKeys.includes(prop) && descriptor.value) {
            descriptor.value = undefined;
        }
        return originalDefineProperty.call(this, obj, prop, descriptor);
    };

    // ===== OUTGOING REQUEST INTERCEPTORS =====
    // Capture REAL tracking URLs that YouTube generates during ad playback

    const outgoingTrackingPatterns = [
        'googlevideo.com/ptracking',
        '/api/stats/ads',
        '/api/stats/qoe',
        '/pagead/adview',
        '/pagead/interaction',
        'doubleclick.net/pagead'
    ];

    const isRealTrackingUrl = (url) => {
        if (!url || typeof url !== 'string') return false;
        return outgoingTrackingPatterns.some(pattern => url.includes(pattern));
    };

    const logRealTrackingUrl = (method, url) => {
        console.log(`[Focus TRACK] 🎯 REAL tracking URL via ${method}:`, url.substring(0, 150) + '...');
        // Send to background for later use
        window.postMessage({ type: 'FOCUS_REAL_TRACKING_URL', method, url }, '*');
    };

    // 1. Intercept XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url, ...args) {
        if (isRealTrackingUrl(url)) {
            logRealTrackingUrl('XMLHttpRequest', url);
        }
        return originalXHROpen.apply(this, [method, url, ...args]);
    };

    // 2. Intercept fetch
    const originalFetch = window.fetch;
    window.fetch = function (input, init) {
        const url = typeof input === 'string' ? input : input?.url;
        if (isRealTrackingUrl(url)) {
            logRealTrackingUrl('fetch', url);
        }
        return originalFetch.apply(this, arguments);
    };

    // 3. Intercept Image.src (most common for tracking pixels)
    const originalImageDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    if (originalImageDescriptor) {
        Object.defineProperty(HTMLImageElement.prototype, 'src', {
            set: function (value) {
                if (isRealTrackingUrl(value)) {
                    logRealTrackingUrl('Image.src', value);
                }
                return originalImageDescriptor.set.call(this, value);
            },
            get: function () {
                return originalImageDescriptor.get.call(this);
            }
        });
    }

    // 4. Intercept navigator.sendBeacon
    if (navigator.sendBeacon) {
        const originalSendBeacon = navigator.sendBeacon.bind(navigator);
        navigator.sendBeacon = function (url, data) {
            if (isRealTrackingUrl(url)) {
                logRealTrackingUrl('sendBeacon', url);
            }
            return originalSendBeacon(url, data);
        };
    }

    console.log('[Focus] Content Engine Active 🎯');
    console.log('[Focus] Tracking URL interceptors installed ✅');
})();
