// sniper.js - v44.0: Speedster + Remote Selectors
(function () {
    console.log('[Sniper] Speedster Ready ⚡');

    let active = true;
    let logic2 = true;
    // Default selectors
    let SKIP_SELECTORS = ['.ytp-ad-skip-button', '.ytp-ad-skip-button-modern', '.videoAdUiSkipButton', '.ytp-skip-ad-button'];

    // Load Settings & Selectors
    const syncState = () => {
        chrome.storage.local.get(['hunterActive', 'logic2Enabled', 'selectors'], (res) => {
            active = res.hunterActive !== false;
            logic2 = res.logic2Enabled !== false;

            // Nếu có selectors từ GitHub thì dùng
            if (res.selectors && res.selectors.skipSelectors) {
                SKIP_SELECTORS = res.selectors.skipSelectors;
            }
        });
    };
    chrome.storage.onChanged.addListener(syncState);
    syncState();

    const nativeClick = (el) => {
        const ops = { bubbles: true, cancelable: true, view: window };
        el.dispatchEvent(new MouseEvent('mouseover', ops));
        el.dispatchEvent(new MouseEvent('mousedown', { ...ops, buttons: 1 }));
        el.dispatchEvent(new MouseEvent('mouseup', { ...ops, buttons: 1 }));
        el.click();
    };

    setInterval(() => {
        if (!active || !logic2) return;

        const video = document.querySelector('video');
        const adShowing = document.querySelector('.ad-showing, .ad-interrupting');

        if (video && adShowing) {
            video.muted = true;
            video.style.opacity = '0';
            if (!isNaN(video.duration) && video.duration > 0) {
                // if (video.currentTime < video.duration - 0.1) video.currentTime = video.duration - 0.1;
            }
            video.playbackRate = 16.0;

            // Dùng SKIP_SELECTORS động
            SKIP_SELECTORS.forEach(sel => {
                const btn = document.querySelector(sel);
                if (btn) nativeClick(btn);
            });
        }

        if (video && !adShowing && video.style.opacity === '0') {
            video.style.opacity = '1';
            video.muted = false;
            video.playbackRate = 1.0;
        }

    }, 100);
})();