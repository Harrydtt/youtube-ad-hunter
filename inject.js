// inject.js - Lobotomy + Smart Shadow Beacon + Dynamic Config
(function () {
    console.log('[Hunter] Stealth Engine: READY 🥷📡');

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

    // =============================================
    // TOGGLE CONTROL (Điều khiển từ content.js)
    // =============================================
    let jsonCutEnabled = true;

    window.addEventListener('message', function (e) {
        if (e.data && e.data.type === 'HUNTER_SET_JSONCUT') {
            jsonCutEnabled = e.data.enabled;
            console.log(`%c[Stealth] ⚙️ JSON Cut: ${jsonCutEnabled ? 'BẬT' : 'TẮT'}`, 'color: lime');
        }
    });

    // =============================================
    // 📋 DYNAMIC CONFIG (Cập nhật từ xa)
    // =============================================
    const CONFIG_URL = 'https://raw.githubusercontent.com/Harrydtt/youtube-ad-hunter/main/hunter_config.json';
    const CONFIG_CACHE_KEY = 'hunter_config_cache';
    const CONFIG_CACHE_TIME = 6 * 60 * 60 * 1000; // 6 giờ

    // Default keys (backup nếu fetch fail)
    let AD_KEYS = ['adPlacements', 'playerAds', 'adSlots', 'kidsAdPlacements', 'adBreakResponse'];
    let TRACKING_KEYS = ['impressionEndpoints', 'adImpressionUrl', 'clickthroughEndpoint'];

    // Load config từ cache hoặc fetch mới
    const loadConfig = async () => {
        try {
            // Check cache
            const cached = localStorage.getItem(CONFIG_CACHE_KEY);
            const cacheTime = localStorage.getItem(CONFIG_CACHE_KEY + '_time');

            if (cached && cacheTime && (Date.now() - parseInt(cacheTime)) < CONFIG_CACHE_TIME) {
                const config = JSON.parse(cached);
                if (config.ad_keys) AD_KEYS = config.ad_keys;
                if (config.tracking_keys) TRACKING_KEYS = config.tracking_keys;
                console.log('[Config] 📋 Loaded from cache');
                return;
            }

            // Fetch mới
            const response = await fetch(CONFIG_URL + '?t=' + Date.now());
            if (response.ok) {
                const config = await response.json();
                if (config.ad_keys) AD_KEYS = config.ad_keys;
                if (config.tracking_keys) TRACKING_KEYS = config.tracking_keys;

                // Save cache
                localStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(config));
                localStorage.setItem(CONFIG_CACHE_KEY + '_time', Date.now().toString());
                console.log('[Config] 📋 Updated from GitHub');
            }
        } catch (e) {
            console.log('[Config] Using default keys (fetch failed)');
        }
    };

    // Load config async (không block script)
    loadConfig();

    // =============================================
    // 🥷 HÀM FAKE VIEW THÔNG MINH (SMART BEACON)
    // =============================================
    const fakeAdViewing = (adData) => {
        if (!adData) return;

        try {
            // Đào sâu tìm link Impression (Báo cáo đã hiển thị)
            const findImpressionUrls = (obj) => {
                let urls = [];
                if (!obj) return urls;
                if (typeof obj === 'object') {
                    for (let key in obj) {
                        // Dùng TRACKING_KEYS động thay vì hardcode
                        if (TRACKING_KEYS.includes(key)) {
                            const endpoints = obj[key];
                            if (Array.isArray(endpoints)) {
                                endpoints.forEach(ep => {
                                    if (ep.baseUrl) urls.push(ep.baseUrl);
                                    else if (typeof ep === 'string') urls.push(ep);
                                });
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
                console.log(`%c[Beacon] 📡 Fake ${trackingUrls.length} lượt xem (jitter)...`, 'color: #00aaff');

                trackingUrls.forEach((url, index) => {
                    if (url && url.startsWith('http')) {
                        const delay = Math.floor(Math.random() * 800) + 100 + (index * 50);
                        setTimeout(() => {
                            fetch(url, {
                                mode: 'no-cors',
                                cache: 'no-cache',
                                credentials: 'omit'
                            }).catch(() => { });
                        }, delay);
                    }
                });
            }
        } catch (e) {
            // Lỗi fake không ảnh hưởng video chính
        }
    };

    // Helper: Check xem data có chứa ads key nào không
    const hasAdKeys = (data) => {
        if (!data) return false;
        return AD_KEYS.some(key => data[key] !== undefined);
    };

    // Helper: Xóa tất cả ad keys
    const removeAdKeys = (data) => {
        AD_KEYS.forEach(key => {
            if (data[key]) delete data[key];
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
            // Parse fail -> Return as-is, video vẫn chạy bình thường
            return originalParse(text, reviver);
        }

        if (!jsonCutEnabled) return data;

        try {
            if (hasAdKeys(data)) {
                // 1. COPY DỮ LIỆU ĐỂ BÁO CÁO
                const adClone = {};
                AD_KEYS.forEach(key => {
                    if (data[key]) adClone[key] = data[key];
                });

                // Gọi Fake View (Async - Không chặn luồng chính)
                fakeAdViewing(adClone);

                // 2. CẮT BỎ (LOBOTOMY)
                console.log('%c[Lobotomy] 🔪 Ads cắt bỏ (stealth)', 'color: red; font-weight: bold');
                removeAdKeys(data);
            }
        } catch (e) {
            // Lỗi cắt ads -> Trả về data gốc, Logic 2 sẽ xử lý
            console.log('[Lobotomy] ⚠️ Cut failed, fallback to Logic 2');
        }

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
            // Fetch fail -> Return as-is
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
                removeAdKeys(data);
            }
        } catch (e) {
            // Lỗi -> Logic 2 fallback
        }

        return data;
    };

    // =============================================
    // 🧹 CLEANUP INIT
    // =============================================
    const cleanInitialData = () => {
        if (!jsonCutEnabled) return;
        try {
            if (window.ytInitialPlayerResponse) {
                removeAdKeys(window.ytInitialPlayerResponse);
            }
        } catch (e) { }
    };

    cleanInitialData();
    setTimeout(cleanInitialData, 500);

    console.log('[Hunter] v9.3: Dynamic Config + Stealth Beacon ✅');
})();
