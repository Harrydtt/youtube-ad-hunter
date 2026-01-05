// inject.js - Selective Pruning (Preroll Killer) + Pixel Beacon v12
(function () {
    console.log('[Hunter] Stealth Engine v12: Preroll Killer 🔪');

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
    // 🖼️ PIXEL BEACON (Fake View cho Preroll bị cắt)
    // =============================================
    const fireBeacon = (url) => {
        if (!url || !url.startsWith('http')) return;
        const img = new Image();
        img.style.display = 'none';
        img.src = url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now();
    };

    const fakePrerollView = (adData) => {
        if (!adData) return;
        try {
            // Chỉ tìm các link báo cáo hiển thị (Impression)
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
            urls.forEach((url, i) => {
                setTimeout(() => fireBeacon(url), i * 50); // Delay nhẹ
            });
            if (urls.length > 0) console.log(`%c[Beacon] 📡 Fake ${urls.length} preroll impressions`, 'color: #00aaff');
        } catch (e) { }
    };

    // =============================================
    // 🔪 SELECTIVE PRUNING (Bộ lọc thông minh)
    // =============================================

    const processAdPlacements = (placements) => {
        if (!Array.isArray(placements) || placements.length === 0) return placements;

        // Lọc mảng: Giữ lại Midroll, Cắt Preroll
        const keptPlacements = placements.filter(p => {
            // Đào sâu tìm thông tin renderer
            const renderer = p.adPlacementRenderer?.renderer?.adBreakRenderer || p.adPlacementRenderer;
            if (!renderer) return true; // Không rõ là gì thì giữ lại cho an toàn

            // Dấu hiệu nhận biết Preroll
            const isPreroll =
                (p.adPlacementRenderer?.config?.adPlacementConfig?.kind === 'PREROLL') ||
                (renderer.adBreakType === 'PREROLL') ||
                (p.adPlacementRenderer?.timeOffsetMilliseconds === '0') ||
                (p.adPlacementRenderer?.timeOffsetMilliseconds === 0);

            if (isPreroll) {
                console.log('%c[Lobotomy] 🔪 Cắt 1 PREROLL', 'color: red; font-weight: bold;');
                fakePrerollView(p); // Báo cáo đã xem trước khi giết
                return false; // XÓA
            }

            console.log('%c[Lobotomy] ⏩ Giữ lại MIDROLL (cho Logic 2 xử lý)', 'color: orange');
            return true; // GIỮ
        });

        return keptPlacements;
    };

    // =============================================
    // 🔪 HOOK TRUNG TÂM
    // =============================================
    const processData = (data) => {
        if (!jsonCutEnabled || !data) return data;

        try {
            // Xử lý adPlacements (Mảng chính)
            if (data.adPlacements) {
                const originalLength = data.adPlacements.length;
                data.adPlacements = processAdPlacements(data.adPlacements);

                // Nếu sau khi lọc mà mảng rỗng (tức là chỉ có Preroll),
                // thì đành chấp nhận rỗng. Hy vọng Fake View cứu vớt.
                if (originalLength > 0 && data.adPlacements.length === 0) {
                    console.log('%c[Warning] Mảng Ads rỗng sau khi lọc. Rủi ro cao.', 'color: gray');
                }
            }

            // Xử lý playerAds (Banner/Overlay) - Cái này xóa thoải mái ít bị check
            if (data.playerAds) {
                fakePrerollView(data.playerAds);
                data.playerAds = [];
            }

        } catch (e) {
            console.warn('[Lobotomy] Error:', e);
        }
        return data;
    };

    // Hook JSON.parse
    const originalParse = JSON.parse;
    JSON.parse = function (text, reviver) {
        try {
            return processData(originalParse(text, reviver));
        } catch (e) {
            return originalParse(text, reviver);
        }
    };

    // Hook Fetch
    const originalJson = Response.prototype.json;
    Response.prototype.json = async function () {
        try {
            return processData(await originalJson.call(this));
        } catch (e) {
            return originalJson.call(this);
        }
    };

    // Cleanup Initial
    if (window.ytInitialPlayerResponse) {
        processData(window.ytInitialPlayerResponse);
    }

    console.log('[Hunter] v12: Selective Pruning Active ✅');

})();
