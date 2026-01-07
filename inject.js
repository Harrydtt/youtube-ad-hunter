// inject.js - v36.0: The Anti-Enforcement Update ☢️
(function () {
    console.log('[Focus] Content Engine v36.0: The Nuke ☢️');

    let CONFIG = {
        // Key chứa quảng cáo (sẽ bị cắt)
        adJsonKeys: ['adPlacements', 'adSlots', 'playerAds', 'adBreakHeartbeatParams', 'adBlockingInfo'],
        // Key rác (popup) & Enforcement
        popupJsonKeys: [
            'promotedSparklesWebRenderer', 'adRenderer', 'bannerPromoRenderer',
            'compactPromotedItemRenderer', 'playerErrorMessageRenderer',
            'mealbarPromoRenderer', 'enforcementMessageViewModel'
        ],
        // Key chứa link tracking (để tìm kiếm)
        trackingKeys: ['impressionEndpoints', 'adImpressionUrl', 'clickthroughEndpoint', 'start', 'firstQuartile', 'midpoint', 'thirdQuartile', 'complete', 'ping']
    };

    let filterEnabled = true;

    window.addEventListener('message', (e) => {
        if (e.data.type === 'FOCUS_SET_FILTER') filterEnabled = e.data.enabled;
    });

    // --- CORE 1: TRÍCH XUẤT URL ---
    const extractUrlsFromObject = (obj, urls = [], depth = 0) => {
        if (!obj || depth > 15) return urls;
        if (typeof obj === 'string') {
            if (obj.includes('ptracking') || obj.includes('/pagead/') || obj.includes('/api/stats/') || obj.includes('doubleclick.net')) {
                urls.push(obj);
            }
        } else if (typeof obj === 'object') {
            for (const key of CONFIG.trackingKeys) {
                if (obj[key]) {
                    const val = obj[key];
                    if (typeof val === 'string') urls.push(val);
                    else if (Array.isArray(val)) {
                        val.forEach(v => {
                            if (typeof v === 'string') urls.push(v);
                            else if (v.baseUrl) urls.push(v.baseUrl);
                        });
                    }
                }
            }
            Object.values(obj).forEach(val => extractUrlsFromObject(val, urls, depth + 1));
        }
        return urls;
    };

    // --- CORE 2: DE-MONETIZATION & ANTI-ENFORCEMENT (FIX POPUP) ---
    const sanitizeData = (data) => {
        if (!data || typeof data !== 'object') return;

        // 1. Force OK Status
        if (data.playabilityStatus) {
            // Nếu bị kẹt ở ERROR, ép về OK
            if (data.playabilityStatus.status === 'ERROR' || data.playabilityStatus.status === 'LOGIN_REQUIRED') {
                data.playabilityStatus.status = 'OK';
                data.playabilityStatus.playableInEmbed = true;
                data.playabilityStatus.miniplayer = { miniplayerRenderer: { playbackMode: "PLAYBACK_MODE_ALLOW" } }; // Fix lỗi miniplayer
                if (data.playabilityStatus.errorScreen) delete data.playabilityStatus.errorScreen;
                console.log('[Focus] 🚑 Fixed playabilityStatus (Recovered from ERROR)');
            }
        }

        // 2. Kill AdBlock Enforcement Flags (QUAN TRỌNG NHẤT)
        // Đây là nguyên nhân khiến bản cũ bị lỗi
        if (data.adBlockingInfo) {
            console.log('[Focus] ☢️ Nuked adBlockingInfo');
            delete data.adBlockingInfo;
        }
        if (data.playerResponse?.adBlockingInfo) {
            delete data.playerResponse.adBlockingInfo;
        }

        // 3. Kill Auxiliary UI (Nơi chứa Popup)
        if (data.auxiliaryUi?.messageRenderers?.enforcementMessageViewModel) {
            console.log('[Focus] ☢️ Nuked auxiliaryUi (Popup Payload)');
            delete data.auxiliaryUi;
        }
        if (data.playerResponse?.auxiliaryUi?.messageRenderers?.enforcementMessageViewModel) {
            delete data.playerResponse.auxiliaryUi;
        }

        // 4. De-Monetize
        if (data.videoDetails) data.videoDetails.isMonetized = false;
        if (data.playerResponse?.videoDetails) data.playerResponse.videoDetails.isMonetized = false;

        // 5. Cleanup Heartbeats
        if (data.adBreakHeartbeatParams) delete data.adBreakHeartbeatParams;
        if (data.playerResponse?.adBreakHeartbeatParams) delete data.playerResponse.adBreakHeartbeatParams;
    };

    // --- MAIN PROCESSOR ---
    const processObject = (obj, processor) => {
        if (!obj || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(item => processObject(item, processor)).filter(Boolean);

        const result = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                // Sanitization
                if (key === 'playabilityStatus' || key === 'videoDetails' || key === 'playerResponse' || key === 'auxiliaryUi') {
                    sanitizeData({ [key]: obj[key] });
                }

                const processed = processor(key, obj[key]);
                if (processed !== undefined) {
                    result[key] = processObject(processed, processor);
                }
            }
        }
        return result;
    };

    const processYoutubeData = (data) => {
        if (!filterEnabled || !data) return data;

        try {
            // Bước 1: De-Monetize & Nuke Enforcement
            sanitizeData(data);

            let allUrls = [];

            // Bước 2: Filter & Extract
            const filterAndExtract = (key, value) => {
                if (CONFIG.adJsonKeys.includes(key)) {
                    const urls = extractUrlsFromObject(value);
                    if (urls.length > 0) allUrls.push(...urls);
                    return undefined;
                }
                if (CONFIG.popupJsonKeys.includes(key)) return undefined;
                return value;
            };

            const processedData = processObject(data, filterAndExtract);

            // Bước 3: Send Beacons
            if (allUrls.length > 0) {
                window.postMessage({ type: 'FOCUS_SEND_TO_BACKGROUND', urls: allUrls }, '*');
            }

            return processedData;

        } catch (e) {
            console.error('[Focus] Error:', e);
            return data;
        }
    };

    // --- HOOKS ---
    const originalParse = JSON.parse;
    JSON.parse = function (text, reviver) {
        const data = originalParse.call(this, text, reviver);
        return processYoutubeData(data);
    };

    const originalJson = Response.prototype.json;
    Response.prototype.json = async function () {
        const data = await originalJson.call(this);
        return processYoutubeData(data);
    };

    // --- TRAPS ---
    let _ytInitialPlayerResponse = window.ytInitialPlayerResponse;
    let _ytInitialData = window.ytInitialData;

    Object.defineProperty(window, 'ytInitialPlayerResponse', {
        configurable: true,
        get: () => _ytInitialPlayerResponse,
        set: (val) => { _ytInitialPlayerResponse = processYoutubeData(val); }
    });

    Object.defineProperty(window, 'ytInitialData', {
        configurable: true,
        get: () => _ytInitialData,
        set: (val) => { _ytInitialData = processYoutubeData(val); }
    });

    if (_ytInitialPlayerResponse) _ytInitialPlayerResponse = processYoutubeData(_ytInitialPlayerResponse);
    if (_ytInitialData) _ytInitialData = processYoutubeData(_ytInitialData);

    console.log('[Focus] v36.0 Active: Anti-Enforcement ☢️');
})();
