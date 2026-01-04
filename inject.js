// inject.js - Chạy trong main world để access YouTube API
(function () {
    console.log('[Hunter] Inject script starting...');

    // --- MONKEY PATCH HISTORY API (Để detect chuyển bài ngay lập tức) ---
    // YouTube là SPA, nó dùng pushState để đổi URL mà không reload.
    // Hook vào đây để bắt sự kiện NHANH HƠN cả yt-navigate-start.
    const originalPushState = history.pushState;
    history.pushState = function () {
        originalPushState.apply(this, arguments);
        // Gửi message báo content.js biết là có chuyển trang
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


    window.addEventListener('message', function (e) {
        console.log('[Hunter] Inject received message:', e.data);

        if (e.data && e.data.type === 'HUNTER_DECOY') {
            const player = document.getElementById('movie_player');
            console.log('[Hunter] Player found:', !!player);
            console.log('[Hunter] loadVideoById exists:', !!(player && player.loadVideoById));

            if (player && player.loadVideoById) {
                console.log('%c[Decoy] 🚨 Nhảy sang Shorts: ' + e.data.decoyId, 'color: red; font-weight: bold;');
                player.loadVideoById(e.data.decoyId);

                setTimeout(function () {
                    console.log('%c[Decoy] 🔄 Quay về: ' + e.data.targetId, 'color: cyan');
                    player.loadVideoById({ 'videoId': e.data.targetId, 'startSeconds': 0 });
                    window.postMessage({ type: 'HUNTER_DECOY_DONE' }, '*');
                }, 600);
            } else {
                console.log('%c[Decoy] ❌ Player không có loadVideoById!', 'color: red');
            }
        }
    });

    console.log('[Hunter] Inject ready ✅');
})();
