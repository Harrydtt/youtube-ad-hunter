// inject.js - Project Phantom v15: Offscreen Reality
(function () {
    console.log('[Hunter] Stealth Engine v15: Offscreen Reality 👻');

    // --- MONKEY PATCH HISTORY ---
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

    // --- SETTINGS (Sẽ được sync từ content.js) ---
    let jsonCutEnabled = true;

    window.addEventListener('message', function (e) {
        if (e.data && e.data.type === 'HUNTER_SET_JSONCUT') {
            jsonCutEnabled = e.data.enabled;
            console.log(`%c[Stealth] ⚙️ JSON Cut: ${jsonCutEnabled ? 'BẬT' : 'TẮT'}`, 'color: lime');
        }
    });

    // --- CONFIG ---
    const TRACKING_KEYS = [
        'impressionEndpoints', 'adImpressionUrl', 'clickthroughEndpoint',
        'start', 'firstQuartile', 'midpoint', 'thirdQuartile', 'complete', 'ping'
    ];

    // --- GỬI TRACKING URLs RA CONTENT.JS (để đẩy lên Offscreen) ---
    const sendToOffscreen = (urls) => {
        if (!urls || urls.length === 0) return;
        window.postMessage({
            type: 'HUNTER_SEND_TO_BACKGROUND',
            urls: urls
        }, '*');
    };

    // --- THU THẬP TRACKING URLs ---
    const collectTrackingUrls = (adData) => {
        if (!adData) return [];

        const findUrls = (obj) => {
            let urls = [];
            if (!obj) return urls;
            if (typeof obj === 'object') {
                for (let key in obj) {
                    if (TRACKING_KEYS.includes(key)) {
                        const val = obj[key];
                        if (Array.isArray(val)) {
                            val.forEach(v => {
                                if (v.baseUrl) urls.push(v.baseUrl);
                                else if (typeof v === 'string') urls.push(v);
                            });
                        } else if (typeof val === 'string') {
                            urls.push(val);
                        }
                    } else {
                        urls = urls.concat(findUrls(obj[key]));
                    }
                }
            }
            return urls;
        };

        return findUrls(adData);
    };

    // --- XỬ LÝ AD PLACEMENTS (Cắt Preroll, giữ Midroll) ---
    const processAdPlacements = (placements) => {
        if (!Array.isArray(placements)) return placements;

        return placements.filter((p, index) => {
            const renderer = p.adPlacementRenderer;
            const config = renderer?.config?.adPlacementConfig;
            const kind = config?.kind || '';
            const timeOffset = config?.adTimeOffset?.offsetStartMilliseconds
                || renderer?.timeOffsetMilliseconds || 0;

            // Nhận diện Preroll
            const isPreroll = timeOffset === 0 || timeOffset === '0' ||
                kind.includes('PREROLL');

            // Thu thập tracking URLs trước khi xử lý
            const urls = collectTrackingUrls(p);
            if (urls.length > 0) {
                console.log(`%c[Hunter] 📡 Thu thập ${urls.length} tracking URLs`, 'color: cyan');
                sendToOffscreen(urls);
            }

            if (isPreroll) {
                console.log('%c[Lobotomy] 🔪 Cắt PREROLL', 'color: red; font-weight: bold');
                return false; // Xóa
            }

            console.log('%c[Lobotomy] ⏩ Giữ MIDROLL (Logic 2 sẽ xử lý)', 'color: orange');
            return true; // Giữ
        });
    };

    // --- XỬ LÝ DATA ---
    const processYoutubeData = (data) => {
        if (!jsonCutEnabled || !data) return data;

        try {
            if (data.adPlacements) {
                console.log('%c[Hunter] 🎯 Tìm thấy adPlacements!', 'color: lime');
                data.adPlacements = processAdPlacements(data.adPlacements);
            }

            if (data.playerAds) {
                const urls = collectTrackingUrls(data.playerAds);
                sendToOffscreen(urls);
                data.playerAds = []; // Xóa banner ads
            }
        } catch (e) {
            console.warn('[Hunter] Process error:', e);
        }

        return data;
    };

    // --- HOOK JSON.PARSE ---
    const originalParse = JSON.parse;
    JSON.parse = function (text, reviver) {
        try {
            return processYoutubeData(originalParse(text, reviver));
        } catch (e) {
            return originalParse(text, reviver);
        }
    };

    // --- HOOK FETCH ---
    const originalJson = Response.prototype.json;
    Response.prototype.json = async function () {
        try {
            return processYoutubeData(await originalJson.call(this));
        } catch (e) {
            return originalJson.call(this);
        }
    };

    // --- TRAP ytInitialPlayerResponse ---
    let _ytInitialPlayerResponse = window.ytInitialPlayerResponse;

    try {
        Object.defineProperty(window, 'ytInitialPlayerResponse', {
            get: function () { return _ytInitialPlayerResponse; },
            set: function (val) {
                console.log('%c[Trap] 🪝 ytInitialPlayerResponse set!', 'color: magenta');

                // DEBUG: Log các keys có trong data
                if (val) {
                    const keys = Object.keys(val);
                    console.log('[Debug] Keys in ytInitialPlayerResponse:', keys);

                    // Check cụ thể các ad-related keys
                    if (val.adPlacements) console.log('[Debug] adPlacements:', val.adPlacements.length, 'items');
                    if (val.playerAds) console.log('[Debug] playerAds:', val.playerAds);
                    if (val.adSlots) console.log('[Debug] adSlots:', val.adSlots);
                }

                _ytInitialPlayerResponse = processYoutubeData(val);
            },
            configurable: true
        });
    } catch (e) { }

    // Cleanup existing
    if (window.ytInitialPlayerResponse) {
        processYoutubeData(window.ytInitialPlayerResponse);
    }

    console.log('[Hunter] v15: Offscreen Reality Active ✅');
})();
