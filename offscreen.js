// offscreen.js - v44.1: Minimal (No longer needed for beacon pings)
// The new clientScreen technique doesn't require sending fake pings
// This file is kept for potential future use

console.log('[Offscreen] v44.1 Standby Mode');

// Listen for messages (kept for compatibility)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'PROCESS_BEACONS') {
        // With clientScreen bypass, we don't need to send fake pings
        // YouTube thinks we're in ad unit mode, so no ads to track
        console.log('[Offscreen] 📭 Beacon request received (no action needed with clientScreen bypass)');
        sendResponse({ received: true, bypassed: true });
    }
    return true;
});

console.log('[Offscreen] v44.1 Ready ✅');