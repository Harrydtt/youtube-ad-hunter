// inject.js - v16: Restored from v13 + Offscreen Bridge
(function () {
    console.log('[Hunter] Stealth Engine v16: Restored Logic 🎯');

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

    // --- TOGGLE CONTROL ---
    let jsonCutEnabled = true;
    window.addEventListener('message', function (e) {
        if (e.data && e.data.type === 'HUNTER_SET_JSONCUT') {
            jsonCutEnabled = e.data.enabled;
            console.log(`%c[Stealth] ⚙️ JSON Cut: ${jsonCutEnabled ? 'BẬT' : 'TẮT'}`, 'color: lime');
        }
    });

    // =============================================
    // 📡 OFFSCREEN BRIDGE (Gửi tracking URLs ra ngoài)
    // =============================================
    const sendToOffscreen = (urls) => {
        if (!urls || urls.length === 0) return;
        window.postMessage({
            type: 'HUNTER_SEND_TO_BACKGROUND',
            urls: urls
        }, '*');
    };

    // =============================================
    // 🖼️ PIXEL BEACON + OFFSCREEN
    // =============================================
    const collectAndBeacon = (adData) => {
        if (!adData) return;
        try {
            const findUrls = (obj) => {
                let urls = [];
                if (!obj) return urls;
                if (typeof obj === 'object') {
                    for (let key in obj) {
                        if (['impressionEndpoints', 'adImpressionUrl'].includes(key)) {
                            const eps = obj[key];
                            if (Array.isArray(eps)) eps.forEach(e => urls.push(e.baseUrl || e));
                            else if (typeof eps === 'string') urls.push(eps);
                        } else {
                            urls = urls.concat(findUrls(obj[key]));
                        }
                    }
                }
                return urls;
            };
            const urls = findUrls(adData);

            if (urls.length > 0) {
                console.log(`%c[Beacon] 📡 Fake ${urls.length} impressions`, 'color: #00aaff');

                // Gửi ra Offscreen (nếu có)
                sendToOffscreen(urls);

                // Pixel beacon backup
                urls.forEach((url, i) => {
                    setTimeout(() => {
                        if (url && url.startsWith('http')) {
                            const img = new Image();
                            img.src = url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now();
                        }
                    }, i * 50);
                });
            }
        } catch (e) { }
    };

    // =============================================
    // 🔪 PROCESS AD DATA (Cắt Preroll, giữ Midroll)
    // =============================================
    const processAdPlacements = (placements) => {
        if (!Array.isArray(placements) || placements.length === 0) return placements;

        console.log(`%c[Debug] Processing ${placements.length} placements...`, 'color: yellow');

        return placements.filter((p, i) => {
            const renderer = p.adPlacementRenderer;
            const config = renderer?.config?.adPlacementConfig;
            const kind = config?.kind || '';
            const timeOffset = config?.adTimeOffset?.offsetStartMilliseconds || renderer?.timeOffsetMilliseconds || 0;

            console.log(`%c[Debug] Ad #${i}: kind="${kind}", offset=${timeOffset}`, 'color: cyan');

            // Nhận diện Preroll: offset = 0 hoặc kind chứa PREROLL
            const isPreroll = timeOffset === 0 || timeOffset === '0' ||
                kind.includes('PREROLL') ||
                (i === 0 && !kind); // Ad đầu tiên không có kind

            if (isPreroll) {
                console.log('%c[Lobotomy] 🔪 Cắt PREROLL', 'color: red; font-weight: bold');
                collectAndBeacon(p);
                return false;
            }

            console.log('%c[Lobotomy] ⏩ Giữ MIDROLL', 'color: orange');
            return true;
        });
    };

    // =============================================
    // 🎯 DIRECT VARIABLE INTERCEPTION
    // =============================================

    // Xử lý ytInitialPlayerResponse có sẵn
    const processInitial = () => {
        if (!jsonCutEnabled) return;

        if (window.ytInitialPlayerResponse) {
            console.log('%c[Hunter] 🎯 Tìm thấy ytInitialPlayerResponse!', 'color: lime; font-size: 14px');

            if (window.ytInitialPlayerResponse.adPlacements) {
                console.log('%c[Hunter] Có adPlacements!', 'color: lime', window.ytInitialPlayerResponse.adPlacements);
                const original = window.ytInitialPlayerResponse.adPlacements;
                window.ytInitialPlayerResponse.adPlacements = processAdPlacements(original);
            }

            if (window.ytInitialPlayerResponse.playerAds) {
                collectAndBeacon(window.ytInitialPlayerResponse.playerAds);
                window.ytInitialPlayerResponse.playerAds = [];
            }
        }
    };

    // Chạy ngay và nhiều lần để bắt kịp timing (QUAN TRỌNG!)
    processInitial();
    setTimeout(processInitial, 0);
    setTimeout(processInitial, 100);
    setTimeout(processInitial, 500);
    setTimeout(processInitial, 1000);

    // =============================================
    // 🪝 DEFINE PROPERTY TRAP (Bẫy khi YouTube set biến)
    // =============================================
    let _ytInitialPlayerResponse = window.ytInitialPlayerResponse;

    try {
        Object.defineProperty(window, 'ytInitialPlayerResponse', {
            get: function () {
                return _ytInitialPlayerResponse;
            },
            set: function (val) {
                console.log('%c[Trap] 🪝 ytInitialPlayerResponse được set!', 'color: magenta; font-size: 14px');

                if (jsonCutEnabled && val) {
                    if (val.adPlacements) {
                        console.log('%c[Trap] Có adPlacements, đang xử lý...', 'color: magenta');
                        val.adPlacements = processAdPlacements(val.adPlacements);
                    }
                    if (val.playerAds) {
                        collectAndBeacon(val.playerAds);
                        val.playerAds = [];
                    }
                }

                _ytInitialPlayerResponse = val;
            },
            configurable: true
        });
        console.log('[Hunter] Trap ytInitialPlayerResponse: OK ✅');
    } catch (e) {
        console.log('[Hunter] Trap failed:', e);
    }

    // =============================================
    // 🔪 HOOK JSON.PARSE (Backup cho API calls)
    // =============================================
    const originalParse = JSON.parse;

    JSON.parse = function (text, reviver) {
        try {
            const data = originalParse(text, reviver);

            if (!jsonCutEnabled || !data) return data;

            if (data.adPlacements) {
                console.log('%c[JSON] Tìm thấy adPlacements trong JSON.parse!', 'color: lime');
                data.adPlacements = processAdPlacements(data.adPlacements);
            }

            if (data.playerAds) {
                collectAndBeacon(data.playerAds);
                data.playerAds = [];
            }

            return data;
        } catch (e) {
            return originalParse(text, reviver);
        }
    };

    // =============================================
    // 🔪 HOOK FETCH (Backup cho API calls)
    // =============================================
    const originalJson = Response.prototype.json;

    Response.prototype.json = async function () {
        try {
            const data = await originalJson.call(this);

            if (!jsonCutEnabled || !data) return data;

            if (data.adPlacements) {
                console.log('%c[Fetch] Tìm thấy adPlacements trong Fetch!', 'color: lime');
                data.adPlacements = processAdPlacements(data.adPlacements);
            }

            if (data.playerAds) {
                collectAndBeacon(data.playerAds);
                data.playerAds = [];
            }

            return data;
        } catch (e) {
            return originalJson.call(this);
        }
    };

    console.log('[Hunter] v16: Restored + Offscreen Bridge ✅');
})();
