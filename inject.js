// inject.js - Lobotomy + Smart Shadow Beacon
(function () {
    console.log('[Hunter] Stealth Engine: READY 🥷');

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
                        // Tìm các key liên quan đến tracking hiển thị
                        if (key === 'impressionEndpoints' || key === 'adImpressionUrl') {
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
                console.log(`%c[Beacon] 📡 Fake ${trackingUrls.length} lượt xem (có jitter)...`, 'color: #00aaff');

                trackingUrls.forEach((url, index) => {
                    if (url && url.startsWith('http')) {
                        // THÊM DELAY NGẪU NHIÊN (JITTER)
                        // Giả lập độ trễ mạng và thời gian load ads
                        // Random từ 100ms đến 800ms cho mỗi request
                        const delay = Math.floor(Math.random() * 800) + 100 + (index * 50);

                        setTimeout(() => {
                            fetch(url, {
                                mode: 'no-cors', // Quan trọng: Bỏ qua CORS để không bị lỗi đỏ
                                cache: 'no-cache',
                                credentials: 'omit' // Không gửi cookie thừa thãi
                            }).catch(() => { });
                        }, delay);
                    }
                });
            }
        } catch (e) { }
    };

    // =============================================
    // 🔪 HOOK TRUNG TÂM (JSON.PARSE)
    // =============================================
    const originalParse = JSON.parse;

    JSON.parse = function (text, reviver) {
        const data = originalParse(text, reviver);

        if (!jsonCutEnabled) return data;

        try {
            if (data && (data.adPlacements || data.playerAds)) {

                // 1. COPY DỮ LIỆU ĐỂ BÁO CÁO
                const adClone = {
                    adPlacements: data.adPlacements,
                    playerAds: data.playerAds
                };

                // Gọi Fake View (Async - Không chặn luồng chính)
                fakeAdViewing(adClone);

                // 2. CẮT BỎ (LOBOTOMY)
                console.log('%c[Lobotomy] 🔪 Ads cắt bỏ & Báo cáo xem (stealth)', 'color: red; font-weight: bold');
                if (data.adPlacements) delete data.adPlacements;
                if (data.playerAds) delete data.playerAds;
                if (data.adSlots) delete data.adSlots;
            }
        } catch (e) { }

        return data;
    };

    // =============================================
    // 🔪 HOOK PHỤ (FETCH)
    // =============================================
    const originalJson = Response.prototype.json;

    Response.prototype.json = async function () {
        const data = await originalJson.call(this);

        if (!jsonCutEnabled) return data;

        try {
            if (data && (data.adPlacements || data.playerAds)) {
                const adClone = {
                    adPlacements: data.adPlacements,
                    playerAds: data.playerAds
                };
                fakeAdViewing(adClone);

                if (data.adPlacements) delete data.adPlacements;
                if (data.playerAds) delete data.playerAds;
            }
        } catch (e) { }

        return data;
    };

    // =============================================
    // 🧹 CLEANUP INIT
    // =============================================
    const cleanInitialData = () => {
        if (!jsonCutEnabled) return;
        if (window.ytInitialPlayerResponse) {
            if (window.ytInitialPlayerResponse.adPlacements) delete window.ytInitialPlayerResponse.adPlacements;
            if (window.ytInitialPlayerResponse.playerAds) delete window.ytInitialPlayerResponse.playerAds;
        }
    };

    cleanInitialData();
    setTimeout(cleanInitialData, 500);

    console.log('[Hunter] Inject ready ✅');
})();
