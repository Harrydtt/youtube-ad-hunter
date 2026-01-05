// inject.js - Lobotomy + Shadow Beacon
(function () {
    console.log('[Hunter] Lobotomy & Beacon Engine: READY 🔪📡');

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
            console.log(`%c[Lobotomy] ⚙️ JSON Cut: ${jsonCutEnabled ? 'BẬT' : 'TẮT'}`, 'color: lime');
        }
    });

    // =============================================
    // 🔥 HÀM BẮN TÍN HIỆU ẢO (SHADOW BEACON)
    // =============================================
    const fakeAdViewing = (adData) => {
        if (!adData) return;

        try {
            // Tìm tất cả các link theo dõi hiển thị (Impression)
            // Cấu trúc YouTube thường là: adPlacements -> renderer -> impressionEndpoints
            const findImpressionUrls = (obj) => {
                let urls = [];
                if (!obj) return urls;

                // Nếu là mảng hoặc object, duyệt đệ quy
                if (typeof obj === 'object') {
                    for (let key in obj) {
                        if (key === 'impressionEndpoints' || key === 'adImpressionUrl') {
                            // Đây là chốt chặn ghi nhận "Ads đã hiện"
                            const endpoints = obj[key];
                            if (Array.isArray(endpoints)) {
                                endpoints.forEach(ep => {
                                    if (ep.baseUrl) urls.push(ep.baseUrl);
                                    else if (typeof ep === 'string') urls.push(ep);
                                });
                            }
                        } else {
                            // Duyệt sâu hơn
                            urls = urls.concat(findImpressionUrls(obj[key]));
                        }
                    }
                }
                return urls;
            };

            const trackingUrls = findImpressionUrls(adData);

            if (trackingUrls.length > 0) {
                console.log(`%c[Beacon] 📡 Fake ${trackingUrls.length} lượt xem Ads...`, 'color: #00aaff');
                trackingUrls.forEach(url => {
                    // Bắn request ngầm, không cần chờ phản hồi (mode: no-cors để tránh lỗi cross-origin)
                    if (url && url.startsWith('http')) {
                        fetch(url, { mode: 'no-cors' }).catch(() => { });
                    }
                });
            }
        } catch (e) {
            // Lỗi khi fake thì kệ nó, quan trọng là chặn được ads
        }
    };

    // =============================================
    // 🔪 1. HOOK JSON.PARSE (Cửa ngõ chính)
    // =============================================
    const originalParse = JSON.parse;

    JSON.parse = function (text, reviver) {
        const data = originalParse(text, reviver);

        if (!jsonCutEnabled) return data;

        try {
            if (data && (data.adPlacements || data.playerAds)) {

                // BƯỚC 1: Ăn cắp dữ liệu tracking trước khi xóa
                // Clone dữ liệu ra để xử lý riêng, tránh ảnh hưởng luồng chính
                const adClone = {
                    adPlacements: data.adPlacements,
                    playerAds: data.playerAds
                };

                // Gọi hàm bắn tín hiệu ảo (Chạy bất đồng bộ, không block luồng chính)
                setTimeout(() => fakeAdViewing(adClone), 100);

                // BƯỚC 2: Phẫu thuật cắt bỏ (Lobotomy)
                console.log('%c[Lobotomy] 🔪 Ads cắt bỏ & Đã báo cáo xem', 'color: red; font-weight: bold');
                if (data.adPlacements) delete data.adPlacements;
                if (data.playerAds) delete data.playerAds;
                if (data.adSlots) delete data.adSlots;
            }
        } catch (e) { }

        return data;
    };

    // =============================================
    // 🔪 2. HOOK RESPONSE.JSON (Cửa ngõ phụ - Fetch API)
    // =============================================
    const originalJson = Response.prototype.json;

    Response.prototype.json = async function () {
        const data = await originalJson.call(this);

        if (!jsonCutEnabled) return data;

        try {
            if (data && (data.adPlacements || data.playerAds)) {

                // BƯỚC 1: Fake view
                const adClone = {
                    adPlacements: data.adPlacements,
                    playerAds: data.playerAds
                };
                setTimeout(() => fakeAdViewing(adClone), 100);

                // BƯỚC 2: Cắt bỏ
                console.log('%c[Fetch Hook] 🔪 Ads cắt bỏ & Đã báo cáo xem', 'color: orange; font-weight: bold');
                if (data.adPlacements) delete data.adPlacements;
                if (data.playerAds) delete data.playerAds;
            }
        } catch (e) { }

        return data;
    };

    // =============================================
    // 🧹 3. DỌN DẸP INITIAL DATA
    // =============================================
    const cleanInitialData = () => {
        if (!jsonCutEnabled) return;
        if (window.ytInitialPlayerResponse && window.ytInitialPlayerResponse.adPlacements) {
            delete window.ytInitialPlayerResponse.adPlacements;
            console.log('%c[Lobotomy] 🧹 Đã xóa ads trong ytInitialPlayerResponse', 'color: lime');
        }
    };

    cleanInitialData();
    setTimeout(cleanInitialData, 1000);

    console.log('[Hunter] Inject ready ✅');
})();
