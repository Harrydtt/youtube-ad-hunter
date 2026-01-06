// inject.js - v33.0: YouTube Focus Mode - Content Optimizer
(function () {
    console.log('[Focus] Content Engine v33.0 🎯');

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

    // JSON.parse interceptor
    const originalParse = JSON.parse;
    JSON.parse = function (text, reviver) {
        let result = originalParse.call(this, text, reviver);

        if (!filterEnabled || !result || typeof result !== 'object') return result;

        try {
            result = processObject(result, filterContent);
        } catch (e) { }

        return result;
    };

    // Response.json interceptor
    const originalResponseJson = Response.prototype.json;
    Response.prototype.json = async function () {
        let result = await originalResponseJson.call(this);

        if (!filterEnabled || !result || typeof result !== 'object') return result;

        try {
            // Extract tracking URLs before filtering
            const urls = [];
            const extractUrls = (obj) => {
                if (!obj) return;
                if (typeof obj === 'string' && obj.includes('googlevideo.com/ptracking')) {
                    urls.push(obj);
                }
                if (typeof obj === 'object') {
                    Object.values(obj).forEach(extractUrls);
                }
            };

            if (result.playerResponse) extractUrls(result.playerResponse);
            if (urls.length > 0) {
                window.postMessage({ type: 'FOCUS_SEND_TO_BACKGROUND', urls }, '*');
            }

            result = processObject(result, filterContent);
        } catch (e) { }

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
