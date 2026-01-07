// manager.js - v44.0: Brain & Bridge & Updater
(function () {
    console.log('[Manager] System Initializing... 🧠');

    const SELECTORS_URL = 'https://raw.githubusercontent.com/Harrydtt/youtube-ad-hunter/main/config.json';
    const CACHE_TIME = 3600 * 1000;

    // --- 1. REMOTE SELECTOR UPDATER ---
    const updateSelectors = () => {
        chrome.storage.local.get(['selectors_time'], async (res) => {
            const last = res.selectors_time || 0;
            if (Date.now() - last < CACHE_TIME) return; // Chưa cần update

            try {
                const response = await fetch(SELECTORS_URL);
                if (response.ok) {
                    const data = await response.json();
                    // Lưu vào Storage để Sniper và Cleaner dùng
                    chrome.storage.local.set({
                        selectors: data,
                        selectors_time: Date.now()
                    });
                    console.log('[Manager] Updated Selectors from GitHub ☁️');
                }
            } catch (e) {
                console.warn('[Manager] Selector Update Failed');
            }
        });
    };
    updateSelectors(); // Check update on load

    // --- 2. SETTINGS SYNC ---
    const syncToInject = () => {
        chrome.storage.local.get(['hunterActive', 'jsonCutEnabled'], (res) => {
            window.postMessage({
                type: 'HUNTER_TOGGLE_JSON',
                enabled: (res.hunterActive !== false) && (res.jsonCutEnabled !== false)
            }, '*');
        });
    };
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.hunterActive || changes.jsonCutEnabled) syncToInject();
        if (changes.hunterActive) updateHeaderButton();
    });

    // --- 3. BRIDGE ---
    window.addEventListener('message', (e) => {
        if (e.data.type === 'HUNTER_BEACON') {
            chrome.storage.local.get(['offscreenEnabled'], (res) => {
                if (res.offscreenEnabled !== false) {
                    chrome.runtime.sendMessage({ type: 'HUNTER_BEACON_REQUEST', urls: e.data.urls });
                }
            });
        }
    });

    // --- 4. HEADER BUTTON ---
    const createHeaderButton = () => {
        if (document.getElementById('hunter-btn')) return;
        const container = document.querySelector('ytd-masthead #end #buttons');
        if (container) {
            const btn = document.createElement('button');
            btn.id = 'hunter-btn';
            btn.style.cssText = `border:none;padding:8px 12px;border-radius:18px;font-weight:600;cursor:pointer;margin-right:8px;transition:0.2s;color:white;`;
            btn.onclick = () => {
                chrome.storage.local.get(['hunterActive'], (res) => {
                    chrome.storage.local.set({ hunterActive: !(res.hunterActive !== false) });
                });
            };
            container.insertBefore(btn, container.firstChild);
            updateHeaderButton();
        }
    };

    const updateHeaderButton = () => {
        const btn = document.getElementById('hunter-btn');
        if (!btn) return;
        chrome.storage.local.get(['hunterActive'], (res) => {
            const isOn = res.hunterActive !== false;
            btn.textContent = isOn ? '🎯 Hunter: ON' : '⚪ Hunter: OFF';
            btn.style.background = isOn ? '#2ecc71' : '#555';
        });
    };

    // Init UI
    syncToInject();
    const observer = new MutationObserver(createHeaderButton);
    const wait = setInterval(() => {
        const mh = document.querySelector('ytd-masthead');
        if (mh) { observer.observe(mh, { childList: true, subtree: true }); createHeaderButton(); clearInterval(wait); }
    }, 1000);
})();