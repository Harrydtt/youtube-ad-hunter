// cleaner.js - v45.0: Janitor + Remote Selectors
(function () {
    console.log('[Cleaner] Janitor Ready 🧹');

    let active = true;
    let cleanerOn = true;
    let POPUP_SELECTORS = ['ytd-enforcement-message-view-model', 'tp-yt-paper-dialog:has(ytd-enforcement-message-view-model)'];
    let HIDE_SELECTORS = ['#masthead-ad', '#player-ads', 'ytd-ad-slot-renderer']; // Default

    const CSS_ID = 'hunter-cleaner-css';
    const POPUP_KEYWORDS = ['Ad blockers', 'Terms of Service', 'trình chặn quảng cáo'];

    const updateState = () => {
        chrome.storage.local.get(['ads', 'cleanerEnabled', 'selectors'], (res) => {
            active = res.ads !== false;
            cleanerOn = res.cleanerEnabled !== false;

            // Update Selectors from Remote
            if (res.selectors) {
                if (res.selectors.surveySelectors) POPUP_SELECTORS = res.selectors.surveySelectors;
                if (res.selectors.adHideSelectors) HIDE_SELECTORS = res.selectors.adHideSelectors;
            }
            applyCss();
        });
    };
    chrome.storage.onChanged.addListener(updateState);
    updateState();

    const applyCss = () => {
        const existing = document.getElementById(CSS_ID);
        if (active && cleanerOn) {
            const cssText = HIDE_SELECTORS.join(', ') + ' { display: none !important; }';
            if (!existing) {
                const style = document.createElement('style');
                style.id = CSS_ID;
                style.textContent = cssText;
                (document.head || document.documentElement).appendChild(style);
            } else {
                existing.textContent = cssText; // Update content nếu selector đổi
            }
        } else {
            if (existing) existing.remove();
        }
    };

    setInterval(() => {
        if (!active || !cleanerOn) return;

        // Text Check
        document.querySelectorAll('tp-yt-paper-dialog').forEach(dialog => {
            if (dialog.style.display === 'none') return;
            if (POPUP_KEYWORDS.some(kw => dialog.innerText.includes(kw))) {
                dialog.remove();
                document.querySelector('tp-yt-iron-overlay-backdrop')?.remove();
                const video = document.querySelector('video');
                if (video && video.paused) video.play();
            }
        });

        // Selector Check (Dynamic)
        POPUP_SELECTORS.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => el.remove());
        });

    }, 500);
})();