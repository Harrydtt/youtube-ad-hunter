// inject.js - v44.0: Surgeon + Remote Brain 🧠
(function () {
    console.log('[Inject] Surgeon Ready 🔪');

    // --- DEFAULT CONFIG (Fallback) ---
    let CONFIG = {
        adJsonKeys: ['adPlacements', 'adSlots', 'playerAds', 'adBreakHeartbeatParams', 'adBlockingInfo'],
        popupJsonKeys: ['enforcementMessageViewModel', 'reloadContinuationData'],
        trackingKeys: ['impressionEndpoints', 'adImpressionUrl', 'start', 'firstQuartile', 'midpoint', 'thirdQuartile', 'complete', 'ping']
    };

    // URL Config của ông
    const CONFIG_URL = 'https://raw.githubusercontent.com/Harrydtt/youtube-ad-hunter/main/config.json';
    const CACHE_TIME = 3600 * 1000; // 1 giờ check 1 lần

    // --- LOAD REMOTE CONFIG ---
    const loadConfig = async () => {
        try {
            const cached = localStorage.getItem('hunter_config');
            const lastUpdate = localStorage.getItem('hunter_config_time');

            // Dùng cache nếu chưa hết hạn
            if (cached && lastUpdate && Date.now() - parseInt(lastUpdate) < CACHE_TIME) {
                const data = JSON.parse(cached);
                if (data.ad_keys) CONFIG.adJsonKeys = data.ad_keys;
                if (data.popup_keys) CONFIG.popupJsonKeys = data.popup_keys;
                if (data.tracking_keys) CONFIG.trackingKeys = data.tracking_keys;
                // console.log('[Inject] Loaded Config from Cache');
                return;
            }

            // Fetch mới
            const res = await fetch(CONFIG_URL);
            if (res.ok) {
                const data = await res.json();
                if (data.ad_keys) CONFIG.adJsonKeys = data.ad_keys;
                if (data.popup_keys) CONFIG.popupJsonKeys = data.popup_keys;
                if (data.tracking_keys) CONFIG.trackingKeys = data.tracking_keys;

                localStorage.setItem('hunter_config', JSON.stringify(data));
                localStorage.setItem('hunter_config_time', Date.now().toString());
                console.log('[Inject] Updated Config from GitHub ☁️');
            }
        } catch (e) {
            console.warn('[Inject] Config Fetch Failed, using default');
        }
    };
    loadConfig(); // Chạy ngay khi start

    // --- LOGIC CŨ (Giữ nguyên) ---
    let isEnabled = true;
    const NO_FLY_ZONE = ['streamingData', 'playbackTracking', 'captions', 'videoDetails'];

    window.addEventListener('message', (e) => {
        if (e.data.type === 'HUNTER_TOGGLE_JSON') isEnabled = e.data.enabled;
    });

    const extractUrls = (obj, urls = []) => {
        if (!obj || typeof obj !== 'object') return urls;
        if (typeof obj === 'string') {
            if (obj.includes('/pagead/') || obj.includes('ptracking') || obj.includes('doubleclick')) {
                urls.push(obj);
            }
        } else {
            Object.values(obj).forEach(val => extractUrls(val, urls));
        }
        return urls;
    };

    const pruneData = (obj) => {
        if (!obj || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(pruneData).filter(item => item !== undefined);

        const result = {};
        for (const key in obj) {
            if (NO_FLY_ZONE.includes(key)) { result[key] = obj[key]; continue; }

            // Dùng CONFIG động đã load
            if (CONFIG.adJsonKeys.includes(key)) {
                const urls = extractUrls(obj[key]);
                if (urls.length > 0) window.postMessage({ type: 'HUNTER_BEACON', urls }, '*');
                return undefined;
            }
            if (CONFIG.popupJsonKeys.includes(key)) return undefined;

            const processed = pruneData(obj[key]);
            if (processed !== undefined) result[key] = processed;
        }
        return result;
    };

    const originalJson = Response.prototype.json;
    Response.prototype.json = async function () {
        const data = await originalJson.call(this);
        if (!isEnabled) return data;
        if (data.adPlacements || data.playerResponse?.adPlacements || data.adBlockingInfo) {
            return pruneData(data);
        }
        return data;
    };

    if (window.ytInitialPlayerResponse) {
        window.ytInitialPlayerResponse = pruneData(window.ytInitialPlayerResponse);
    }
})();