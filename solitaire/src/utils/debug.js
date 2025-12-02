// Centralized debug logging utilities used by hooks and logic
// Components can set a logger via setDebugLogger; others call debugLog.

let debugLogCallback = null;
let __lastLogSig = null;
let __lastLogTime = 0;

const makeSig = (message, data) => {
    try {
        return `${message}|${data ? JSON.stringify(data) : ''}`;
    } catch {
        return message;
    }
};

export function setDebugLogger(callback) {
    debugLogCallback = callback;
}

export function debugLog(message, data) {
    const now = Date.now();
    const sig = makeSig(message, data);
    // Avoid dev-time duplicate logs from StrictMode by deduping in a short window
    if (__lastLogSig === sig && now - __lastLogTime < 200) return;
    __lastLogSig = sig;
    __lastLogTime = now;
    if (typeof debugLogCallback === 'function') debugLogCallback(message, data);
}

export default debugLog;
