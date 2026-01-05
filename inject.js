// inject.js - v17: The Hybrid (v13 Core + Offscreen Bridge)
(function () {
    console.log('[Hunter] Stealth Engine v17: The Hybrid 🛡️');

    // --- 1. CONFIG & STATE ---
    // Cấu hình mặc định phòng khi chưa tải được từ GitHub
    let CONFIG = {
        ad_keys: ['adPlacements', 'playerAds', 'adSlots', 'kidsAdPlacements', 'adBreakResponse'],
        tracking_keys: ['impressionEndpoints', 'adImpressionUrl', 'clickthroughEndpoint', 'start', 'firstQuartile', 'midpoint', 'thirdQuartile', 'complete', 'ping'],
        preroll_indicators: ['PREROLL', '0', 0]
    };
    let jsonCutEnabled = true;

    // Load Config động từ thẻ script do content.js tạo ra (backup)
    try {
        const configEl = document.getElementById('hunter-config-data');
        if (configEl) {
            const dynamicConfig = JSON.parse(configEl.textContent);
            CONFIG = { ...CONFIG, ...dynamicConfig };
            configEl.remove();
        }
    } catch (e) { }

    // Lắng nghe lệnh Bật/Tắt từ content.js
    window.addEventListener('message', (e) => {
        if (e.data && e.data.type === 'HUNTER_SET_JSONCUT') {
            jsonCutEnabled = e.data.enabled;
            console.log(`%c[Stealth] ⚙️ JSON Cut: ${jsonCutEnabled ? 'BẬT' : 'TẮT'}`, 'color: lime');
        }
    });

    // --- 2. PIXEL BEACON & OFFSCREEN BRIDGE ---
    const sendToOffscreen = (urls) => {
        if (!urls || urls.length === 0) return;
        window.postMessage({
            type: 'HUNTER_SEND_TO_BACKGROUND',
            urls: urls
        }, '*');
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
            // Đệ quy tìm tất cả link tracking
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
                // 1. Gửi ra Offscreen (Project Phantom)
                sendToOffscreen(urls);

                // 2. Local Pixel Beacon (Backup)
                urls.forEach((url, i) => {
                    setTimeout(() => fireBeacon(url), i * 100 + Math.random() * 200);
                });

                console.log(`%c[Beacon] 📡 Fake ${urls.length} impressions`, 'color: cyan');
            }
        } catch (e) { }
    };

    // --- 3. CORE LOGIC: SELECTIVE PRUNING (Cắt tỉa thông minh) ---
    const processAdPlacements = (placements) => {
        if (!Array.isArray(placements) || placements.length === 0) return placements;

        // Lọc mảng: Giữ Midroll, Bỏ Preroll
        return placements.filter(p => {
            const renderer = p.adPlacementRenderer?.renderer?.adBreakRenderer || p.adPlacementRenderer;

            // Logic nhận diện Preroll dựa trên Config
            let isPreroll = false;

            // Check loại ad (PREROLL)
            if (renderer?.adBreakType && CONFIG.preroll_indicators.includes(renderer.adBreakType)) isPreroll = true;
            if (p.adPlacementRenderer?.config?.adPlacementConfig?.kind && CONFIG.preroll_indicators.includes(p.adPlacementRenderer.config.adPlacementConfig.kind)) isPreroll = true;

            // Check thời gian (0ms)
            const timeOffset = p.adPlacementRenderer?.timeOffsetMilliseconds;
            if (CONFIG.preroll_indicators.includes(timeOffset)) isPreroll = true;

            if (isPreroll) {
                console.log('%c[Lobotomy] 🔪 Cắt 1 Preroll', 'color: red; font-weight: bold;');
                fakeAdViewing(p); // Báo cáo trước khi giết
                return false; // Loại bỏ khỏi mảng
            }

            console.log('%c[Lobotomy] ⏩ Giữ lại Mid-roll', 'color: orange');
            return true; // Giữ lại
        });
    };

    // --- 4. DATA INTERCEPTOR (Kẻ đứng giữa) ---
    const processYoutubeData = (data) => {
        if (!jsonCutEnabled || !data) return data;

        try {
            // Xử lý adPlacements (Root)
            if (data.adPlacements) {
                console.log('%c[Hunter] 🎯 Tìm thấy adPlacements (Root)!', 'color: lime');
                data.adPlacements = processAdPlacements(data.adPlacements);
            }

            // Xử lý playerResponse.adPlacements (Nested - AJAX)
            if (data.playerResponse) {
                if (data.playerResponse.adPlacements) {
                    console.log('%c[Hunter] 🎯 Tìm thấy adPlacements (Nested)!', 'color: lime');
                    data.playerResponse.adPlacements = processAdPlacements(data.playerResponse.adPlacements);
                }
                if (data.playerResponse.playerAds) {
                    fakeAdViewing(data.playerResponse.playerAds);
                    data.playerResponse.playerAds = [];
                }
            }

            // Xử lý playerAds (Thường là banner/overlay) -> Xóa sạch an toàn hơn
            if (data.playerAds) {
                fakeAdViewing(data.playerAds);
                data.playerAds = []; // Gán mảng rỗng thay vì delete
            }

            // Xử lý adSlots (Cấu trúc mới)
            if (data.adSlots) {
                fakeAdViewing(data.adSlots);
                data.adSlots = [];
            }

        } catch (e) {
            console.warn('[Hunter] Error processing data:', e);
        }
        return data;
    };

    // --- 5. HOOK JSON.PARSE ---
    const originalParse = JSON.parse;
    JSON.parse = function (text, reviver) {
        try {
            const data = originalParse(text, reviver);
            // Chỉ can thiệp nếu data có chứa key quảng cáo
            if (data && CONFIG.ad_keys.some(k => (data[k] || (data.playerResponse && data.playerResponse[k])))) {
                return processYoutubeData(data);
            }
            return data;
        } catch (e) {
            return originalParse(text, reviver);
        }
    };

    // --- 6. HOOK FETCH API ---
    const originalJson = Response.prototype.json;
    Response.prototype.json = async function () {
        try {
            const data = await originalJson.call(this);
            if (data && CONFIG.ad_keys.some(k => (data[k] || (data.playerResponse && data.playerResponse[k])))) {
                return processYoutubeData(data);
            }
            return data;
        } catch (e) {
            return originalJson.call(this);
        }
    };

    // --- 7. CLEANUP INITIAL DATA (Dùng Trap của v13 cũ + Timing 4 attempts) ---
    const processInitial = () => {
        if (window.ytInitialPlayerResponse) {
            processYoutubeData(window.ytInitialPlayerResponse);
        }
    }

    // Timing check
    processInitial();
    setTimeout(processInitial, 0);
    setTimeout(processInitial, 100);
    setTimeout(processInitial, 500);

    // Trap (Backup)
    let _ytInitialPlayerResponse = window.ytInitialPlayerResponse;
    try {
        Object.defineProperty(window, 'ytInitialPlayerResponse', {
            get: function () { return _ytInitialPlayerResponse; },
            set: function (val) {
                console.log('%c[Trap] 🪝 ytInitialPlayerResponse được set!', 'color: magenta');
                _ytInitialPlayerResponse = processYoutubeData(val);
            },
            configurable: true
        });
    } catch (e) { }

    // Patch History API để báo content.js khi chuyển bài
    const notify = () => window.postMessage({ type: 'HUNTER_NAVIGATE_URGENT' }, '*');
    const origPush = history.pushState; history.pushState = function () { origPush.apply(this, arguments); notify(); };
    const origRep = history.replaceState; history.replaceState = function () { origRep.apply(this, arguments); notify(); };
    window.addEventListener('popstate', notify);

})();
