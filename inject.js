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

    // --- XỬ LÝ MESSAGE TỪ CONTENT SCRIPT ---
    window.addEventListener('message', function (e) {
        if (e.data && e.data.type === 'HUNTER_DECOY') {
            const player = document.getElementById('movie_player');

            if (player && player.loadVideoById) {
                console.log('%c[Decoy] 🚨 KÍCH HOẠT: ' + e.data.decoyId, 'color: red; font-weight: bold;');

                // BƯỚC 1: STOP VIDEO (QUAN TRỌNG)
                // Ép hủy toàn bộ session quảng cáo và buffer hiện tại
                if (typeof player.stopVideo === 'function') {
                    player.stopVideo();
                }

                // BƯỚC 2: Load Video Mồi
                // Dùng object syntax để tường minh hơn
                player.loadVideoById({
                    videoId: e.data.decoyId,
                    startSeconds: 0
                });

                // BƯỚC 3: Quay về Video Chính sau thời gian ngắn
                // Tăng nhẹ delay lên 200ms để đảm bảo trạng thái STOP được server ghi nhận
                setTimeout(function () {
                    console.log('%c[Decoy] 🔄 Quay về: ' + e.data.targetId, 'color: cyan');

                    // BƯỚC 4: LOAD CÓ THAM SỐ (FIX LỖI CÒN ADS)
                    // startSeconds: 0.1 -> Bỏ qua mốc trigger ads tại 0.00s
                    player.loadVideoById({
                        videoId: e.data.targetId,
                        startSeconds: 0.1,
                        suggestedQuality: 'hd1080'
                    });

                    window.postMessage({ type: 'HUNTER_DECOY_DONE' }, '*');
                }, 1000); // Tăng lên 1s để đảm bảo ads clear hoàn toàn

            } else {
                console.log('%c[Decoy] ❌ Player API không sẵn sàng!', 'color: red');
            }
        }
    });

    console.log('[Hunter] Inject ready ✅');
})();
