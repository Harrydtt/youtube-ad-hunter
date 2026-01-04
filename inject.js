// inject.js - Chạy trong main world để access YouTube API
(function () {
    console.log('[Hunter] Inject script starting...');

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
                    player.loadVideoById(e.data.targetId);
                    window.postMessage({ type: 'HUNTER_DECOY_DONE' }, '*');
                }, 150);
            } else {
                console.log('%c[Decoy] ❌ Player không có loadVideoById!', 'color: red');
            }
        }
    });

    console.log('[Hunter] Inject ready ✅');
})();
