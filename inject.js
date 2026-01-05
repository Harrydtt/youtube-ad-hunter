// inject.js - Pixel Beaconing + Structure Preservation v11
(function () {
    console.log('[Hunter] Stealth Engine v11: Pixel Beacon �️');

    // --- MONKEY PATCH HISTORY API ---
    const originalPushState = history.pushState;
    history.pushState = function () {
        originalPushState.apply(this, arguments);
        window.postMessage({ type: 'HUNTER_NAVIGATE_URGENT' }, '*');
    };

    const originalReplaceState = history.replaceState;
    history.replaceState = function () {
        originalReplaceState.apply(this, arguments);
        window.postMessage({ type: 'HUNTER_NAVIGATE_URGENT' }, '*');
    };

    window.addEventListener('popstate', () => {
        window.postMessage({ type: 'HUNTER_NAVIGATE_URGENT' }, '*');
    });

    // --- TOGGLE CONTROL ---
    let jsonCutEnabled = true;
    window.addEventListener('message', function (e) {
        if (e.data && e.data.type === 'HUNTER_SET_JSONCUT') {
            jsonCutEnabled = e.data.enabled;
            console.log(`%c[Stealth] ⚙️ JSON Cut: ${jsonCutEnabled ? 'BẬT' : 'TẮT'}`, 'color: lime');
        }
    });

    // --- DYNAMIC CONFIG ---
    const CONFIG_URL = 'https://raw.githubusercontent.com/Harrydtt/youtube-ad-hunter/main/hunter_config.json';
    const CONFIG_CACHE_KEY = 'hunter_config_cache';
    const CONFIG_CACHE_TIME = 6 * 60 * 60 * 1000; // 6 giờ

    let AD_KEYS = ['adPlacements', 'playerAds', 'adSlots', 'kidsAdPlacements', 'adBreakResponse'];
    let TRACKING_KEYS = ['impressionEndpoints', 'adImpressionUrl', 'clickthroughEndpoint', 'start', 'firstQuartile', 'midpoint', 'thirdQuartile', 'complete', 'ping'];

    const loadConfig = async () => {
        try {
            const cached = localStorage.getItem(CONFIG_CACHE_KEY);
            const cacheTime = localStorage.getItem(CONFIG_CACHE_KEY + '_time');

            if (cached && cacheTime && (Date.now() - parseInt(cacheTime)) < CONFIG_CACHE_TIME) {
                const config = JSON.parse(cached);
                if (config.ad_keys) AD_KEYS = config.ad_keys;
                if (config.tracking_keys) TRACKING_KEYS = config.tracking_keys;
                return;
            }

            const response = await fetch(CONFIG_URL + '?t=' + Date.now());
            if (response.ok) {
                const config = await response.json();
                if (config.ad_keys) AD_KEYS = config.ad_keys;
                if (config.tracking_keys) TRACKING_KEYS = config.tracking_keys;

                localStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(config));
                localStorage.setItem(CONFIG_CACHE_KEY + '_time', Date.now().toString());
                console.log('[Config] 📋 Updated from GitHub');
            }
        } catch (e) {
            console.log('[Config] Using default keys');
        }
    };

    loadConfig();

    // =============================================
    // 🖼️ PIXEL BEACON (Thay thế Fetch - Gửi kèm Cookies)
    // =============================================
    const fireBeacon = (url) => {
        if (!url || !url.startsWith('http')) return;

        const img = new Image();
        img.style.display = 'none';
        img.style.width = '1px';
        img.style.height = '1px';

        // Thêm timestamp để tránh cache
        const separator = url.includes('?') ? '&' : '?';
        img.src = url + separator + '_t=' + Date.now();

        // console.log(`%c[Pixel] 🎯 Ping: ...${url.slice(-30)}`, 'color: gray; font-size: 10px');
    };

    const fakeAdViewing = (adData) => {
        if (!adData) return;

        try {
            const findImpressionUrls = (obj) => {
                let urls = [];
                if (!obj) return urls;
                if (typeof obj === 'object') {
                    for (let key in obj) {
                        if (TRACKING_KEYS.includes(key)) {
                            const endpoints = obj[key];
                            if (Array.isArray(endpoints)) {
                                endpoints.forEach(ep => {
                                    if (ep.baseUrl) urls.push(ep.baseUrl);
                                    else if (typeof ep === 'string') urls.push(ep);
                                });
                            } else if (typeof endpoints === 'string') {
                                urls.push(endpoints);
                            }
                        } else {
                            urls = urls.concat(findImpressionUrls(obj[key]));
                        }
                    }
                }
                return urls;
            };

            const trackingUrls = findImpressionUrls(adData);

            if (trackingUrls.length > 0) {
                console.log(`%c[Beacon] 📡 Fake ${trackingUrls.length} signals via PIXEL...`, 'color: #00aaff');

                trackingUrls.forEach((url, index) => {
                    // Jitter random delay để giống người thật
                    const delay = Math.floor(Math.random() * 500) + 100 + (index * 50);
                    setTimeout(() => {
                        fireBeacon(url);
                    }, delay);
                });
            }
        } catch (e) { }
    };

    // Helper: Check keys
    const hasAdKeys = (data) => {
        if (!data) return false;
        return AD_KEYS.some(key => data[key] !== undefined);
    };

    // =============================================
    // 🧬 NEUTERING (Triệt sản thay vì Cắt bỏ)
    // =============================================
    const neuterAdKeys = (data) => {
        AD_KEYS.forEach(key => {
            if (data[key]) {
                // Thay vì delete (gây undefined), ta gán về mảng rỗng
                // Player thấy "Có danh sách quảng cáo, nhưng trống" -> Không báo lỗi
                data[key] = [];
            }
        });
    };

    // =============================================
    // 🔪 HOOK TRUNG TÂM (JSON.PARSE)
    // =============================================
    const originalParse = JSON.parse;

    JSON.parse = function (text, reviver) {
        let data;
        try {
            data = originalParse(text, reviver);
        } catch (e) {
            return originalParse(text, reviver);
        }

        if (!jsonCutEnabled) return data;

        try {
            if (hasAdKeys(data)) {
                // 1. Copy & Fake View
                const adClone = {};
                AD_KEYS.forEach(key => {
                    if (data[key]) adClone[key] = data[key];
                });
                fakeAdViewing(adClone);

                // 2. Triệt sản (Empty Array)
                console.log('%c[Lobotomy] 🧬 Ads Neutered (Empty Array)', 'color: red;');
                neuterAdKeys(data);
            }
        } catch (e) { }

        return data;
    };

    // =============================================
    // 🔪 HOOK PHỤ (FETCH)
    // =============================================
    const originalJson = Response.prototype.json;

    Response.prototype.json = async function () {
        let data;
        try {
            data = await originalJson.call(this);
        } catch (e) {
            return originalJson.call(this);
        }

        if (!jsonCutEnabled) return data;

        try {
            if (hasAdKeys(data)) {
                const adClone = {};
                AD_KEYS.forEach(key => {
                    if (data[key]) adClone[key] = data[key];
                });
                fakeAdViewing(adClone);
                neuterAdKeys(data);
            }
        } catch (e) { }

        return data;
    };

    // =============================================
    // 🧹 CLEANUP INIT
    // =============================================
    const cleanInitialData = () => {
        if (!jsonCutEnabled) return;
        try {
            if (window.ytInitialPlayerResponse) {
                neuterAdKeys(window.ytInitialPlayerResponse);
            }
        } catch (e) { }
    };

    cleanInitialData();
    setTimeout(cleanInitialData, 500);

    console.log('[Hunter] v11: Pixel Beacon + Neutering ✅');
})();
