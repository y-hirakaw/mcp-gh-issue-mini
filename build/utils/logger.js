export var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["ERROR"] = 0] = "ERROR";
    LogLevel[LogLevel["WARN"] = 1] = "WARN";
    LogLevel[LogLevel["INFO"] = 2] = "INFO";
    LogLevel[LogLevel["DEBUG"] = 3] = "DEBUG";
})(LogLevel || (LogLevel = {}));
class Logger {
    level;
    constructor(level = LogLevel.ERROR) {
        this.level = level;
    }
    setLevel(level) {
        this.level = level;
    }
    shouldLog(level) {
        return level <= this.level;
    }
    error(message, ...args) {
        if (this.shouldLog(LogLevel.ERROR)) {
            console.error(`[ERROR] ${message}`, ...args);
        }
    }
    warn(message, ...args) {
        if (this.shouldLog(LogLevel.WARN)) {
            console.error(`[WARN] ${message}`, ...args);
        }
    }
    info(message, ...args) {
        if (this.shouldLog(LogLevel.INFO)) {
            console.error(`[INFO] ${message}`, ...args);
        }
    }
    debug(message, ...args) {
        if (this.shouldLog(LogLevel.DEBUG)) {
            console.error(`[DEBUG] ${message}`, ...args);
        }
    }
}
const logger = new Logger();
export { logger };
export function enableDebugLogging() {
    logger.setLevel(LogLevel.DEBUG);
}
