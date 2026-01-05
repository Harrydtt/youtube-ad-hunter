// content.js - v30.1: Project Phantom (Fixing Header Button)
(function () {
    console.log('[Hunter] Initializing v30.1... 👻');

    // --- STATE ---
    let isHunterActive = true;
    let SKIP_SELECTORS = [
        '.video-ads.ytp-ad-module',
        '.ytp-ad-player-overlay',
        '.ytp-ad-image-overlay',
        '.ytp-ad-skip-button',
        '.ytp-ad-overlay-container',
        'ytd-promoted-sparkles-web-renderer',
        'ytd-display-ad-renderer',
        'ytd-compact-promoted-video-renderer',
        'ytd-miniplayer-toast',     // Added toast to skip
        'ytd-mealbar-promo-renderer' // Added mealbar to skip
    ];

    let AD_SHOWING_SELECTORS = [
        '.ad-showing',
        '.ad-interrupting'
    ];

    let STATIC_AD_SELECTORS = [
        '#masthead-ad',
        'ytd-rich-item-renderer.style-scope.ytd-rich-grid-row #content:has(ytd-display-ad-renderer)',
        'ytd-rich-item-renderer.style-scope.ytd-rich-grid-row #content:has(ytd-ad-slot-renderer)',
        '#player-ads'
    ];

    const SELECTORS_URL = 'https://raw.githubusercontent.com/Harrydtt/youtube-ad-hunter/main/selectors.json';
    const UPDATE_INTERVAL = 3600 * 1000; // 1 hour

    // --- UTIL ---
    const checkAndTriggerNavigate = () => {
        window.postMessage({ type: 'HUNTER_NAVIGATE_URGENT' }, '*');
    };

    // --- CORE LOGIC ---
    const clickSkipButton = () => {
        const skipBtn = document.querySelector('.ytp-ad-skip-button') ||
            document.querySelector('.ytp-ad-skip-button-modern') ||
            document.querySelector('.videoAdUiSkipButton');

        if (skipBtn) {
            skipBtn.click();
            console.log('[Hunter] ⏩ Skipped Ad (Click)');
            return true;
        }
        return false;
    };

    const fastForwardAd = () => {
        const video = document.querySelector('video');
        if (video) {
            let isAd = false;
            // Check based on class
            if (document.querySelector('.ad-showing') || document.querySelector('.ad-interrupting')) {
                isAd = true;
            }
            // Check based on duration (short videos < 60s often ads if unskippable logic fails)
            // But be careful not to skip shorts / regular short videos. 
            // Better rely on ad-container presence.
            const adModule = document.querySelector('.video-ads.ytp-ad-module');
            if (adModule && adModule.children.length > 0) {
                isAd = true;
            }

            if (isAd && !isNaN(video.duration) && video.duration > 0) {
                video.playbackRate = 16.0;
                video.currentTime = video.duration;
                console.log('[Hunter] ⏩ Fast Forwarded Ad');
                // Force play
                if (video.paused) video.play();
            }
        }
    };

    const removeStaticAds = () => {
        STATIC_AD_SELECTORS.forEach(sel => {
            const els = document.querySelectorAll(sel);
            els.forEach(el => {
                el.style.display = 'none';
                // console.log(`[Hunter] 🚮 Removed Static Ad: ${sel}`);
            });
        });
    };

    const runHunterLoop = () => {
        if (!isHunterActive) return;

        clickSkipButton();

        // Only fast forward if we are SURE it is an ad
        if (document.querySelector('.ad-showing') || document.querySelector('.ad-interrupting')) {
            fastForwardAd();
        }

        removeStaticAds();
    };

    // --- INJECT SCRIPT ---
    const injectScript = () => {
        // inject.js is now injected via Manifest (MAIN world)
        // We can just verify it is running or send config
        // But for local development/updates, we might still want to ensure configuration is passed.

        // Pass dynamic config to Main World
        const script = document.createElement('script');
        script.id = 'hunter-config-data';
        script.type = 'application/json';
        script.textContent = JSON.stringify({
            // Pass updated keys if needed
        });
        (document.head || document.documentElement).appendChild(script);

        // Load inject.js manually if strict mode off (optional, but manifest does it better)
        // const s = document.createElement('script');
        // s.src = chrome.runtime.getURL('inject.js');
        // s.onload = () => s.remove();
        // (document.head || document.documentElement).appendChild(s);
    };

    // --- BACKGROUND COMMS (OFFSCREEN) ---
    window.addEventListener('message', (event) => {
        if (event.data.type === 'HUNTER_SEND_TO_BACKGROUND') {
            try {
                chrome.runtime.sendMessage({
                    type: 'sendToOffscreen',
                    urls: event.data.urls
                });
            } catch (e) { }
        }
    });

    // --- SELECTOR UPDATE ---
    const updateSelectorsFromGithub = async () => {
        try {
            const lastUpdate = localStorage.getItem('hunter_selectors_time');
            if (lastUpdate && Date.now() - parseInt(lastUpdate) < UPDATE_INTERVAL) return;

            const response = await fetch(SELECTORS_URL + '?t=' + Date.now());
            if (response.ok) {
                const data = await response.json();
                if (data.skip) SKIP_SELECTORS = data.skip;
                if (data.adShowing) AD_SHOWING_SELECTORS = data.adShowing;
                if (data.static) STATIC_AD_SELECTORS = data.static;

                localStorage.setItem('hunter_selectors', JSON.stringify(data));
                localStorage.setItem('hunter_selectors_time', Date.now().toString());
                console.log('[Hunter] Selectors updated from GitHub');
            }
        } catch (e) { }
    };

    // --- HEADER BUTTON (IMPROVED) ---
    const createHeaderButton = () => {
        if (document.getElementById('hunter-toggle-btn')) return;

        const buttonsContainer = document.querySelector('ytd-masthead #end #buttons');
        if (!buttonsContainer) return;

        const btn = document.createElement('button');
        btn.id = 'hunter-toggle-btn';
        btn.style.cssText = `
            background: ${isHunterActive ? '#cc0000' : '#666'};
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 18px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            margin-right: 8px;
            transition: all 0.3s ease;
            z-index: 9999; /* Force On Top */
            position: relative; /* Ensure z-index works */
        `;
        btn.textContent = isHunterActive ? '🎯 Hunter: ON' : '🎯 Hunter: OFF';

        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent bubbling
            isHunterActive = !isHunterActive;
            btn.textContent = isHunterActive ? '🎯 Hunter: ON' : '🎯 Hunter: OFF';
            btn.style.background = isHunterActive ? '#cc0000' : '#666';
            console.log(`[Hunter] ${isHunterActive ? 'BẬT' : 'TẮT'}`);

            // Post message to inject.js to toggle JSON Cut
            window.postMessage({ type: 'HUNTER_SET_JSONCUT', enabled: isHunterActive }, '*');
        });

        buttonsContainer.insertBefore(btn, buttonsContainer.firstChild);
        console.log('[Hunter] Header button created ✅');
    };

    // --- INIT ---
    updateSelectorsFromGithub();
    injectScript();

    setTimeout(() => { checkAndTriggerNavigate(); }, 500);
    window.addEventListener('yt-navigate-start', checkAndTriggerNavigate);

    setInterval(runHunterLoop, 50);

    // Observer for Header Button (Persistent)
    const headerObserver = new MutationObserver(() => {
        createHeaderButton();
    });

    // Wait for body/masthead
    const waitMasthead = setInterval(() => {
        const masthead = document.querySelector('ytd-masthead');
        if (masthead) {
            headerObserver.observe(masthead, { childList: true, subtree: true });
            createHeaderButton(); // Try immediately
            clearInterval(waitMasthead);
        }
    }, 1000);

    const observer = new MutationObserver(() => { }); // Placeholder if needed

    const waitForPlayer = setInterval(() => {
        const player = document.querySelector('#movie_player');
        if (player) {
            observer.observe(player, { attributes: true, subtree: true, attributeFilter: ['class', 'src'] });
            clearInterval(waitForPlayer);
        }
    }, 500);

    console.log(`%c[Hunter] v30.1: Project Phantom Active 👻⚡`, "color: #00ff00; font-weight: bold; font-size: 14px;");
})();