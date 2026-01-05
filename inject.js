// inject.js - v18: The De-Monetizer (Fix Client-Side Popup)
(function () {
    console.log('[Hunter] Stealth Engine v18: De-Monetizer �');

    // --- 1. CONFIG & STATE ---
    let CONFIG = {
        ad_keys: ['adPlacements', 'playerAds', 'adSlots', 'kidsAdPlacements', 'adBreakResponse'],
        tracking_keys: ['impressionEndpoints', 'adImpressionUrl', 'clickthroughEndpoint', 'start', 'firstQuartile', 'midpoint', 'thirdQuartile', 'complete', 'ping'],
        // Các flag đánh dấu video có kiếm tiền -> Cần xóa
        monetization_flags: ['isMonetized', 'isCrawlable', 'showAds', 'allowBelowThePlayerCompanion'],
        preroll_indicators: ['PREROLL', '0', 0]
    };
    let jsonCutEnabled = true;

    // Load Config động (Backup)
    try {
        const configEl = document.getElementById('hunter-config-data');
        if (configEl) {
            const dynamicConfig = JSON.parse(configEl.textContent);
            CONFIG = { ...CONFIG, ...dynamicConfig };
            configEl.remove();
        }
    } catch (e) { }

    window.addEventListener('message', (e) => {
        if (e.data && e.data.type === 'HUNTER_SET_JSONCUT') {
            jsonCutEnabled = e.data.enabled;
        }
    });

    // --- 2. BEACON SYSTEM (Giữ nguyên logic Offscreen xịn của ông) ---
    const sendToOffscreen = (urls) => {
        if (!urls || urls.length === 0) return;
        window.postMessage({ type: 'HUNTER_SEND_TO_BACKGROUND', urls: urls }, '*');
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
                // Ưu tiên Offscreen
                sendToOffscreen(urls);
                // Backup Pixel tại chỗ (cho chắc cốp)
                urls.forEach((url, i) => setTimeout(() => fireBeacon(url), i * 150));
                console.log(`%c[Beacon] � Fake ${urls.length} impressions`, 'color: #00ff00');
            }
        } catch (e) { }
    };

    // --- 3. DE-MONETIZATION LOGIC (FIX POPUP) ---
    // Xóa dấu vết kiếm tiền trong Metadata
    const stripMonetization = (data) => {
        // 1. Tắt cờ kiếm tiền trong videoDetails
        if (data.videoDetails) {
            data.videoDetails.isMonetized = false; // QUAN TRỌNG NHẤT
            if (data.videoDetails.allowRatings === false) data.videoDetails.allowRatings = true; // Fix phụ
        }

        // 2. Xóa cấu hình DAI (Dynamic Ad Insertion)
        if (data.playerConfig && data.playerConfig.daiConfig) {
            data.playerConfig.daiConfig = null;
        }

        // 3. Xóa nhịp tim kiểm tra Ads (Ad Heartbeat)
        if (data.adBreakHeartbeatParams) {
            delete data.adBreakHeartbeatParams;
        }

        // 4. Chuyển trạng thái Playability (nếu bị dính cờ OK_WITH_ADS)
        if (data.playabilityStatus && data.playabilityStatus.status === 'OK_WITH_ADS') {
            data.playabilityStatus.status = 'OK';
        }
    };

    // --- 4. CORE PROCESSOR ---
    const processYoutubeData = (data) => {
        if (!jsonCutEnabled || !data) return data;

        try {
            // A. Fake View trước khi làm bất cứ gì
            // (Phải lấy link tracking TRƯỚC khi xóa)
            const adClone = {};
            if (data.adPlacements) adClone.adPlacements = data.adPlacements;
            if (data.playerResponse?.adPlacements) adClone.nestedAds = data.playerResponse.adPlacements;
            if (data.playerAds) adClone.playerAds = data.playerAds;

            // Chỉ fake view nếu tìm thấy ads
            if (Object.keys(adClone).length > 0) {
                fakeAdViewing(adClone);
            }

            // B. Xóa sạch Ads (Không lọc nữa, xóa hết để đồng bộ với De-Monetization)
            if (data.adPlacements) data.adPlacements = [];
            if (data.playerAds) data.playerAds = [];
            if (data.adSlots) data.adSlots = [];
            if (data.playerResponse) {
                if (data.playerResponse.adPlacements) data.playerResponse.adPlacements = [];
                if (data.playerResponse.playerAds) data.playerResponse.playerAds = [];
            }

            // C. Áp dụng De-Monetization (Để Player không thắc mắc tại sao Ads rỗng)
            stripMonetization(data);

            console.log('%c[Hunter] ✨ Video De-Monetized Successfully', 'color: magenta; font-weight: bold;');

        } catch (e) {
            console.warn('[Hunter] Error:', e);
        }
        return data;
    };

    // --- 5. HOOKS (JSON & FETCH) ---
    const originalParse = JSON.parse;
    JSON.parse = function (text, reviver) {
        try {
            const data = originalParse(text, reviver);
            // Hook mọi gói tin có tiềm năng chứa ads hoặc metadata video
            if (data && (data.adPlacements || data.videoDetails || data.playerResponse)) {
                return processYoutubeData(data);
            }
            return data;
        } catch (e) { return originalParse(text, reviver); }
    };

    const originalJson = Response.prototype.json;
    Response.prototype.json = async function () {
        try {
            const data = await originalJson.call(this);
            if (data && (data.adPlacements || data.videoDetails || data.playerResponse)) {
                return processYoutubeData(data);
            }
            return data;
        } catch (e) { return originalJson.call(this); }
    };

    // --- 6. CLEANUP INITIAL ---
    const processInitial = () => {
        if (window.ytInitialPlayerResponse) {
            processYoutubeData(window.ytInitialPlayerResponse);
        }
    };
    processInitial();
    // Chạy lại vài lần để đảm bảo race condition
    setTimeout(processInitial, 100);

    // History Patch
    const notify = () => window.postMessage({ type: 'HUNTER_NAVIGATE_URGENT' }, '*');
    const origPush = history.pushState; history.pushState = function () { origPush.apply(this, arguments); notify(); };
    const origRep = history.replaceState; history.replaceState = function () { origRep.apply(this, arguments); notify(); };
    window.addEventListener('popstate', notify);

})();
