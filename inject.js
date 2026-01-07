// inject.js - v35.0: Extract-Before-Cut Architecture
(function () {
    console.log('[Focus] Content Engine v35.0: Extract-Before-Cut �️');

    let CONFIG = {
        // Key chứa quảng cáo (sẽ bị cắt)
        adJsonKeys: ['adPlacements', 'adSlots', 'playerAds', 'adBreakHeartbeatParams'],
        // Key rác (popup)
        popupJsonKeys: ['promotedSparklesWebRenderer', 'adRenderer', 'bannerPromoRenderer', 'compactPromotedItemRenderer', 'playerErrorMessageRenderer', 'mealbarPromoRenderer'],
        // Key chứa link tracking (để tìm kiếm)
        trackingKeys: ['impressionEndpoints', 'adImpressionUrl', 'clickthroughEndpoint', 'start', 'firstQuartile', 'midpoint', 'thirdQuartile', 'complete', 'ping']
    };

    let filterEnabled = true;

    window.addEventListener('message', (e) => {
        if (e.data.type === 'FOCUS_SET_FILTER') filterEnabled = e.data.enabled;
    });

    // --- CORE 1: TRÍCH XUẤT URL (Móc túi trước khi cắt) ---
    const extractUrlsFromObject = (obj, urls = [], depth = 0) => {
        if (!obj || depth > 15) return urls;

        // 1. Check string trực tiếp
        if (typeof obj === 'string') {
            if (obj.includes('ptracking') || obj.includes('/pagead/') || obj.includes('/api/stats/') || obj.includes('doubleclick.net')) {
                urls.push(obj);
            }
        }
        // 2. Check object theo key tracking chuẩn
        else if (typeof obj === 'object') {
            for (const key of CONFIG.trackingKeys) {
                if (obj[key]) {
                    const val = obj[key];
                    if (typeof val === 'string') urls.push(val);
                    else if (Array.isArray(val)) {
                        val.forEach(v => {
                            if (typeof v === 'string') urls.push(v);
                            else if (v.baseUrl) urls.push(v.baseUrl); // YouTube hay giấu trong baseUrl
                        });
                    }
                }
            }
            // Đệ quy vét cạn
            Object.values(obj).forEach(val => extractUrlsFromObject(val, urls, depth + 1));
        }
        return urls;
    };

    // --- CORE 2: DE-MONETIZATION (Chữa lỗi Popup) ---
    const sanitizeData = (data) => {
        if (!data || typeof data !== 'object') return;

        // 1. Ép trạng thái OK (Fix màn hình lỗi)
        if (data.playabilityStatus) {
            if (data.playabilityStatus.status !== 'OK' && data.playabilityStatus.status !== 'LOGIN_REQUIRED') {
                data.playabilityStatus.status = 'OK';
                data.playabilityStatus.playableInEmbed = true;
                if (data.playabilityStatus.errorScreen) delete data.playabilityStatus.errorScreen;
                console.log('[Focus] 🚑 Forced playabilityStatus to OK');
            }
        }

        // 2. Tắt kiếm tiền (Cực quan trọng để không bị Popup)
        if (data.videoDetails) {
            if (data.videoDetails.isMonetized) {
                data.videoDetails.isMonetized = false;
                console.log('[Focus] 💰 Set isMonetized = false');
            }
        }
        if (data.playerResponse?.videoDetails) {
            data.playerResponse.videoDetails.isMonetized = false;
        }

        // 3. Cắt đứt liên lạc với Ad Server
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
                // Áp dụng Sanitization cho các node quan trọng
                if (key === 'playabilityStatus' || key === 'videoDetails' || key === 'playerResponse') {
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
            // DEBUG: Log TẤT CẢ data có dấu hiệu của player hoặc ads
            const isPlayerData = data.videoDetails || data.playabilityStatus;
            const isAdData = data.adPlacements || data.playerAds || data.adSlots;

            if (isPlayerData || isAdData) {
                console.log('[Focus DEBUG] 📋 YouTube Data:', {
                    TYPE: isPlayerData ? '🎬 PLAYER DATA' : '📺 SIDEBAR/OTHER',
                    hasVideoDetails: !!data.videoDetails,
                    isMonetized: data.videoDetails?.isMonetized,
                    videoId: data.videoDetails?.videoId,
                    hasPlayabilityStatus: !!data.playabilityStatus,
                    status: data.playabilityStatus?.status,
                    hasAdPlacements: !!data.adPlacements,
                    adCount: data.adPlacements?.length || 0,
                    hasPlayerAds: !!data.playerAds,
                    adKeys: Object.keys(data).filter(k => k.toLowerCase().includes('ad'))
                });

                // CRITICAL: Nếu có videoDetails, log chi tiết
                if (data.videoDetails) {
                    console.log('[Focus DEBUG] 🎬 videoDetails FOUND:', {
                        videoId: data.videoDetails.videoId,
                        title: data.videoDetails.title?.substring(0, 50),
                        isMonetized: data.videoDetails.isMonetized,
                        isLive: data.videoDetails.isLiveContent
                    });
                }
            }

            // Bước 1: De-Monetize (Quan trọng nhất)
            sanitizeData(data);

            let allUrls = [];

            // Bước 2: Vừa lọc vừa lấy link
            const filterAndExtract = (key, value) => {
                // Gặp quảng cáo -> Lấy URL -> Xóa
                if (CONFIG.adJsonKeys.includes(key)) {
                    const urls = extractUrlsFromObject(value);
                    if (urls.length > 0) {
                        allUrls.push(...urls);
                        console.log(`[Focus] 📡 Extracted ${urls.length} URLs from ${key}`);
                    }
                    return undefined; // XÓA
                }
                // Gặp popup rác -> XÓA
                if (CONFIG.popupJsonKeys.includes(key)) return undefined;

                return value;
            };

            const processedData = processObject(data, filterAndExtract);

            // Bước 3: Gửi "Template URL" sang Offscreen
            if (allUrls.length > 0) {
                console.log(`[Focus] 📤 Sending ${allUrls.length} template URLs to offscreen`);
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

    // --- PROPERTY TRAPS (Bắt data TRƯỚC khi YouTube đọc) ---
    let _ytInitialPlayerResponse = window.ytInitialPlayerResponse;
    let _ytInitialData = window.ytInitialData;

    // Trap ytInitialPlayerResponse
    Object.defineProperty(window, 'ytInitialPlayerResponse', {
        configurable: true,
        get: function () {
            return _ytInitialPlayerResponse;
        },
        set: function (value) {
            console.log('[Focus] 🪤 TRAPPED ytInitialPlayerResponse SET!');
            _ytInitialPlayerResponse = processYoutubeData(value);
        }
    });

    // Trap ytInitialData
    Object.defineProperty(window, 'ytInitialData', {
        configurable: true,
        get: function () {
            return _ytInitialData;
        },
        set: function (value) {
            console.log('[Focus] 🪤 TRAPPED ytInitialData SET!');
            _ytInitialData = processYoutubeData(value);
        }
    });

    // Also process if already exists (fallback)
    if (_ytInitialPlayerResponse) {
        console.log('[Focus] Cleaning existing ytInitialPlayerResponse');
        _ytInitialPlayerResponse = processYoutubeData(_ytInitialPlayerResponse);
    }
    if (_ytInitialData) {
        _ytInitialData = processYoutubeData(_ytInitialData);
    }

    console.log('[Focus] v35.6 Active: Property Traps ✅');
})();
