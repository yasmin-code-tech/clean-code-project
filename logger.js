// logger.js
let debugEnabled = false;

function enableDebug() {
    debugEnabled = true;
}

function disableDebug() {
    debugEnabled = false;
}

function debug(...args) {
    if (debugEnabled) {
        console.log('[DEBUG]', ...args);
    }
}

function info(...args) {
    console.log('[INFO]', ...args);
}

function error(...args) {
    console.error('[ERROR]', ...args);
}

module.exports = {
    enableDebug,
    disableDebug,
    debug,
    info,
    error,
};
