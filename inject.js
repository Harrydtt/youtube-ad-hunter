// inject.js - Chạy trong main world để access YouTube API
(function () {
    window.addEventListener('message', function (e) {
        if (e.data.type === 'HUNTER_DECOY') {
            const player = document.getElementById('movie_player');
            if (player && player.loadVideoById) {
                console.log('%c[Decoy] 🚨 Nhảy sang Shorts...', 'color: red; font-weight: bold;');
                player.loadVideoById(e.data.decoyId);

                setTimeout(function () {
                    console.log('%c[Decoy] 🔄 Quay về: ' + e.data.targetId, 'color: cyan');
                    player.loadVideoById(e.data.targetId);
                    window.postMessage({ type: 'HUNTER_DECOY_DONE' }, '*');
                }, 150);
            }
        }
    });
    console.log('[Hunter] Inject ready ✅');
})();
