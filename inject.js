// inject.js - Chạy trong main world để access YouTube API
(function () {
    console.log('[Hunter] Inject script starting...');

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
    // 🧪 DATA LOBOTOMY: CẮT QUẢNG CÁO TỪ GỐC JSON
    // =============================================
    let jsonCutEnabled = true; // Mặc định BẬT, sẽ được sync từ content.js

    // Lắng nghe toggle từ content.js
    window.addEventListener('message', function (e) {
        if (e.data && e.data.type === 'HUNTER_SET_JSONCUT') {
            jsonCutEnabled = e.data.enabled;
            console.log(`%c[Lobotomy] ⚙️ JSON Cut: ${jsonCutEnabled ? 'BẬT' : 'TẮT'}`, 'color: lime');
        }
    });

    // --- 1. HOOK JSON.PARSE (Cửa ngõ dữ liệu) ---
    const originalParse = JSON.parse;

    JSON.parse = function (text, reviver) {
        const data = originalParse(text, reviver);

        if (!jsonCutEnabled) return data;

        try {
            if (data && (data.adPlacements || data.playerAds || data.adSlots)) {
                console.log('%c[Lobotomy] 🔪 Phát hiện Ads trong JSON -> CẮT BỎ!', 'color: red; font-weight: bold');

                if (data.adPlacements) delete data.adPlacements;
                if (data.playerAds) delete data.playerAds;
                if (data.adSlots) delete data.adSlots;

                console.log('%c[Lobotomy] ✅ Dữ liệu đã sạch.', 'color: cyan');
            }
        } catch (e) { }

        return data;
    };

    // --- 2. HOOK RESPONSE.JSON (Cho Fetch API) ---
    const originalJson = Response.prototype.json;

    Response.prototype.json = async function () {
        const data = await originalJson.call(this);

        if (!jsonCutEnabled) return data;

        try {
            if (data && (data.adPlacements || data.playerAds)) {
                console.log('%c[Fetch Hook] 🔪 Phát hiện Ads trong Response -> CẮT BỎ!', 'color: orange; font-weight: bold');
                if (data.adPlacements) delete data.adPlacements;
                if (data.playerAds) delete data.playerAds;
            }
        } catch (e) { }

        return data;
    };

    // --- 3. DỌN DẸP DỮ LIỆU CŨ (GLOBAL VARIABLE) ---
    const cleanInitialData = () => {
        if (!jsonCutEnabled) return;
        if (window.ytInitialPlayerResponse && window.ytInitialPlayerResponse.adPlacements) {
            delete window.ytInitialPlayerResponse.adPlacements;
            console.log('%c[Lobotomy] 🧹 Đã xóa ads trong ytInitialPlayerResponse', 'color: lime');
        }
    };

    // Chạy ngay và sau 1s (đề phòng)
    cleanInitialData();
    setTimeout(cleanInitialData, 1000);

    console.log('%c[Hunter] 🧪 DATA LOBOTOMY: ACTIVATED', 'color: #00ff00; font-weight: bold; font-size: 14px');
    console.log('[Hunter] Inject ready ✅');
})();
