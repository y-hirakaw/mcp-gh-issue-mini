import { describe, it } from 'node:test';
import assert from 'node:assert';
import { LogLevel, logger, enableDebugLogging } from '../utils/logger.js';
describe('Logger', () => {
    it('should have correct log levels', () => {
        assert.strictEqual(LogLevel.ERROR, 0);
        assert.strictEqual(LogLevel.WARN, 1);
        assert.strictEqual(LogLevel.INFO, 2);
        assert.strictEqual(LogLevel.DEBUG, 3);
    });
    it('should have all required logging methods', () => {
        assert.strictEqual(typeof logger.error, 'function');
        assert.strictEqual(typeof logger.warn, 'function');
        assert.strictEqual(typeof logger.info, 'function');
        assert.strictEqual(typeof logger.debug, 'function');
        assert.strictEqual(typeof logger.setLevel, 'function');
    });
    it('should not throw when logging', () => {
        assert.doesNotThrow(() => {
            logger.error('Test error message');
            logger.warn('Test warning message');
            logger.info('Test info message');
            logger.debug('Test debug message');
        });
    });
    it('should enable debug logging', () => {
        assert.doesNotThrow(() => {
            enableDebugLogging();
        });
    });
    it('should handle log level changes', () => {
        assert.doesNotThrow(() => {
            logger.setLevel(LogLevel.ERROR);
            logger.setLevel(LogLevel.WARN);
            logger.setLevel(LogLevel.INFO);
            logger.setLevel(LogLevel.DEBUG);
        });
    });
});
