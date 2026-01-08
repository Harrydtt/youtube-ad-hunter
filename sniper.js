// sniper.js - v45.3: Speedster (INDEPENDENT - only checks sniperEnabled)
(function () {
    console.log('[Sniper] Speedster Ready ⚡');

    let sniperOn = true;
    let SKIP_SELECTORS = ['.ytp-ad-skip-button', '.ytp-ad-skip-button-modern', '.videoAdUiSkipButton', '.ytp-skip-ad-button'];

    // Load Settings & Selectors - ONLY check sniperEnabled, NOT ads
    const syncState = () => {
        chrome.storage.local.get(['sniperEnabled', 'selectors'], (res) => {
            sniperOn = res.sniperEnabled !== false;
            console.log('[Sniper] State updated: sniperOn =', sniperOn);

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
        if (!sniperOn) return;

        const video = document.querySelector('video');
        const adShowing = document.querySelector('.ad-showing, .ad-interrupting');

        if (video && adShowing) {
            video.muted = true;
            video.style.opacity = '0';
            if (!isNaN(video.duration) && video.duration > 0) {
                if (video.currentTime < video.duration - 0.1) video.currentTime = video.duration - 0.1;
            }
            video.playbackRate = 16.0;

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