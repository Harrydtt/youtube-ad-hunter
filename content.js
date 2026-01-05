// content.js - Project Phantom v15: Bridge + Logic 2
(function () {
    'use strict';

    // --- CONSTANTS ---
    const SELECTORS_URL = 'https://raw.githubusercontent.com/Harrydtt/youtube-ad-hunter/main/selectors.json';
    const UPDATE_INTERVAL = 24 * 60 * 60 * 1000;

    // --- SETTINGS (Điều khiển từ Popup) ---
    let jsonCutEnabled = true;
    let offscreenEnabled = true;
    let logic2Enabled = true;
    let staticAdsEnabled = false; // Mặc định TẮT
    let isHunterActive = true;

    // --- STATE FLAGS ---
    let currentVideoElement = null;
    let logic2Logged = false;

    // Load settings từ storage
    chrome.storage.local.get([
        'jsonCutEnabled',
        'offscreenEnabled',
        'logic2Enabled',
        'staticAdsEnabled'
    ], (result) => {
        jsonCutEnabled = result.jsonCutEnabled !== false;
        offscreenEnabled = result.offscreenEnabled !== false;
        logic2Enabled = result.logic2Enabled !== false;
        staticAdsEnabled = result.staticAdsEnabled === true; // Default OFF

        console.log(`[Hunter] Settings: JSON=${jsonCutEnabled}, Offscreen=${offscreenEnabled}, Logic2=${logic2Enabled}, Static=${staticAdsEnabled}`);

        // Sync settings to inject.js
        syncSettingsToInject();

        // Apply static ads CSS based on setting
        if (staticAdsEnabled) {
            updateAdHideCSS();
        }
    });

    // Lắng nghe thay đổi settings REALTIME từ popup
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local') {
            if (changes.jsonCutEnabled !== undefined) {
                jsonCutEnabled = changes.jsonCutEnabled.newValue;
                console.log(`[Hunter] ⚙️ JSON Cut: ${jsonCutEnabled ? 'BẬT' : 'TẮT'}`);
                syncSettingsToInject();
            }
            if (changes.offscreenEnabled !== undefined) {
                offscreenEnabled = changes.offscreenEnabled.newValue;
                console.log(`[Hunter] ⚙️ Offscreen: ${offscreenEnabled ? 'BẬT' : 'TẮT'}`);
            }
            if (changes.logic2Enabled !== undefined) {
                logic2Enabled = changes.logic2Enabled.newValue;
                console.log(`[Hunter] ⚙️ Logic 2: ${logic2Enabled ? 'BẬT' : 'TẮT'}`);
            }
            if (changes.staticAdsEnabled !== undefined) {
                staticAdsEnabled = changes.staticAdsEnabled.newValue;
                console.log(`[Hunter] ⚙️ Static Ads: ${staticAdsEnabled ? 'BẬT' : 'TẮT'}`);
                if (staticAdsEnabled) {
                    updateAdHideCSS();
                } else {
                    removeAdHideCSS();
                }
            }
        }
    });

    // Gửi settings sang inject.js
    const syncSettingsToInject = () => {
        window.postMessage({ type: 'HUNTER_SET_JSONCUT', enabled: jsonCutEnabled }, '*');
    };

    // --- SELECTORS ---
    let SKIP_SELECTORS = [
        '.ytp-ad-skip-button', '.ytp-ad-skip-button-modern', '.ytp-ad-skip-button-slot',
        '.ytp-skip-ad-button', '.videoAdUiSkipButton', 'button.ytp-ad-skip-button',
        '[class*="skip-button"]', '[class*="ytp-ad-skip"]'
    ];

    let AD_SHOWING_SELECTORS = [
        '.ad-showing', '.ytp-ad-player-overlay', '.ytp-ad-player-overlay-instream-info',
        '.video-ads.ytp-ad-module', '.ytp-ad-text', '.ytp-ad-preview-container'
    ];

    let STATIC_AD_SELECTORS = [];

    // --- INJECT SCRIPT ---
    const injectScript = () => {
        if (document.getElementById('hunter-inject')) return;
        const script = document.createElement('script');
        script.id = 'hunter-inject';
        script.src = chrome.runtime.getURL('inject.js');
        (document.head || document.documentElement).appendChild(script);
        script.onload = () => syncSettingsToInject();
    };

    // --- MESSAGE BRIDGE: Inject → Background ---
    window.addEventListener('message', (e) => {
        // Chuyển tiếp beacon URLs sang Background (để đẩy lên Offscreen)
        if (e.data && e.data.type === 'HUNTER_SEND_TO_BACKGROUND') {
            if (offscreenEnabled) {
                chrome.runtime.sendMessage({
                    type: 'HUNTER_BEACON_REQUEST',
                    urls: e.data.urls
                });
            }
        }

        // Navigate event từ inject.js
        if (e.data && e.data.type === 'HUNTER_NAVIGATE_URGENT') {
            checkAndTriggerNavigate();
        }
    });

    // --- AD DETECTION (Chỉ check .ad-showing - reliable nhất) ---
    const checkIfAdIsShowing = () => {
        const player = document.querySelector('#movie_player');
        if (player && player.classList.contains('ad-showing')) {
            return true;
        }
        return false;
    };

    // --- AD CONTROL FUNCTIONS ---
    const clickSkipButtons = () => {
        for (const sel of SKIP_SELECTORS) {
            const btn = document.querySelector(sel);
            if (btn) {
                try { btn.click(); return true; } catch (e) { }
            }
        }
        return false;
    };

    const hideStaticAds = () => {
        if (!staticAdsEnabled) return; // Chỉ chạy khi được bật
        STATIC_AD_SELECTORS.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => {
                if (el && el.style.display !== 'none') el.style.display = 'none';
            });
        });
    };

    const skipSurveys = () => {
        const surveySelectors = ['.ytp-ad-survey', '.ytp-survey', '[id*="survey"]'];
        surveySelectors.forEach(sel => {
            const el = document.querySelector(sel);
            if (el) {
                const skip = el.querySelector('button, [role="button"]');
                if (skip) try { skip.click(); } catch (e) { }
            }
        });
    };

    // --- UNIFIED HANDLER ---
    const handleAdDetection = (source, video) => {
        if (!isHunterActive) return;

        const isAd = checkIfAdIsShowing();

        if (isAd && video) {
            if (logic2Enabled) {
                if (!logic2Logged) {
                    console.log(`%c[Hunter] ⚡ Logic 2 tiếp quản (từ ${source})`, 'color: orange;');
                    logic2Logged = true;
                }
                killActiveAd(video);
            } else {
                if (!video.muted) video.muted = true;
            }
        } else {
            if (video) {
                if (video.muted) video.muted = false;
                if (video.playbackRate > 1) video.playbackRate = 1;
            }
            const controls = document.querySelector('.ytp-chrome-bottom');
            if (controls && controls.style.opacity === '0') controls.style.opacity = 1;
        }

        if (staticAdsEnabled) hideStaticAds();
        skipSurveys();
    };

    const killActiveAd = (video) => {
        clickSkipButtons();
        if (!video.muted) video.muted = true;
        if (video.playbackRate < 16) video.playbackRate = 16;
        if (video.readyState >= 1 && Number.isFinite(video.duration) && video.duration > 0 && video.currentTime < video.duration - 0.5) {
            video.currentTime = video.duration;
        }
    };

    // --- EVENT LISTENERS ---
    const onMetadataLoaded = (e) => handleAdDetection('MetadataEvent', e.target);

    const setupVideoListeners = (video) => {
        if (video.dataset.hunterBound) return;
        video.dataset.hunterBound = 'true';

        video.addEventListener('loadedmetadata', onMetadataLoaded);
        video.addEventListener('play', (e) => handleAdDetection('PlayEvent', e.target));
        video.addEventListener('timeupdate', (e) => handleAdDetection('TimeUpdate', e.target));
    };

    // --- MUTATION OBSERVER ---
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const target = mutation.target;
                if (target.classList && target.classList.contains('ad-showing')) {
                    const video = document.querySelector('video');
                    if (video) handleAdDetection('MutationObserver', video);
                }
            }
        }
    });

    // --- MAIN LOOP ---
    const runHunterLoop = () => {
        const videos = document.querySelectorAll('video');
        videos.forEach(video => {
            setupVideoListeners(video);
            currentVideoElement = video;
            handleAdDetection('IntervalLoop', video);
        });
    };

    // --- NAVIGATE HANDLER ---
    let lastVideoId = null;

    const onNavigateStart = () => {
        console.log('%c[Hunter] 🚀 Chuyển bài', 'color: yellow');
        logic2Logged = false;
    };

    const checkAndTriggerNavigate = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const currentVideoId = urlParams.get('v');
        if (currentVideoId && currentVideoId !== lastVideoId) {
            lastVideoId = currentVideoId;
            onNavigateStart();
        }
    };

    // --- CSS INJECTION ---
    const updateAdHideCSS = () => {
        if (!staticAdsEnabled) return;

        let style = document.getElementById('hunter-style');
        if (!style) {
            style = document.createElement('style');
            style.id = 'hunter-style';
            document.head.appendChild(style);
        }

        const selectors = STATIC_AD_SELECTORS.length > 0
            ? STATIC_AD_SELECTORS
            : [
                'ytd-ad-slot-renderer',
                'ytd-banner-promo-renderer',
                'ytd-statement-banner-renderer',
                'ytd-in-feed-ad-layout-renderer',
                '.ytd-rich-item-renderer:has(ytd-ad-slot-renderer)',
                '.yt-mealbar-promo-renderer',
                '#masthead-ad',
                '#player-ads'
            ];

        style.textContent = selectors.map(s => `${s} { display: none !important; }`).join('\n');
    };

    const removeAdHideCSS = () => {
        const style = document.getElementById('hunter-style');
        if (style) style.remove();
    };

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

    // --- HEADER BUTTON ---
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
        `;
        btn.textContent = isHunterActive ? '🎯 Hunter: ON' : '🎯 Hunter: OFF';

        btn.addEventListener('click', () => {
            isHunterActive = !isHunterActive;
            btn.textContent = isHunterActive ? '🎯 Hunter: ON' : '🎯 Hunter: OFF';
            btn.style.background = isHunterActive ? '#cc0000' : '#666';
            console.log(`[Hunter] ${isHunterActive ? 'BẬT' : 'TẮT'}`);
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

    // Try creating header button multiple times
    setTimeout(createHeaderButton, 1000);
    setTimeout(createHeaderButton, 3000);
    setTimeout(createHeaderButton, 5000);

    const waitForPlayer = setInterval(() => {
        const player = document.querySelector('#movie_player');
        if (player) {
            observer.observe(player, { attributes: true, subtree: true, attributeFilter: ['class', 'src'] });
            clearInterval(waitForPlayer);
        }
    }, 500);

    console.log(`%c[Hunter] v26: Project Phantom Active 👻⚡`, "color: #00ff00; font-weight: bold; font-size: 14px;");
})();