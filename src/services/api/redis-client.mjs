import { Redis } from 'ioredis';
import { secureLog } from './config.mjs';

function createRedisClient() {
    // Determine the environment correctly
    const isRailway = process.env.RAILWAY_STATIC_URL !== undefined || process.env.RAILWAY_ENVIRONMENT !== undefined;
    const redisUrl = process.env.REDIS_URL || (isRailway ? 'redis://redis.railway.internal:6379' : null);

    if (!redisUrl) {
        secureLog('warn', '[rate-limiter] REDIS_URL nao definido ou nao em ambiente Railway — usando fallback em memoria');
        return null;
    }

    try {
        const client = new Redis(redisUrl, {
            maxRetriesPerRequest: 3,
            enableReadyCheck: true,
            retryStrategy(times) {
                // If we are not in Railway and connecting to internal redis fails, stop retrying quickly
                if (!isRailway && redisUrl.includes('railway.internal')) return null;

                const delay = Math.min(times * 50, 2000);
                return delay;
            }
        });

        client.on('error', (err) => {
            secureLog('warn', 'Redis client connection error', { error: err.message });
        });

        client.on('connect', () => {
            secureLog('info', 'Redis client connecting...');
        });

        client.on('ready', () => {
            secureLog('info', 'Redis client ready and synchronized');
        });

        client.on('reconnecting', () => {
            secureLog('warn', 'Redis client reconnecting...');
        });

        return client;
    } catch (e) {
        secureLog('error', 'Redis initialization failed', { error: e.message });
        return null;
    }
}

export const redis = createRedisClient();

// Shared subscriber singleton for SSE/Pub-Sub consumers.
// ioredis requires a dedicated client in subscribe mode,
// but we only need ONE per process — not one per request.
let _subscriber = null;
const _channelListeners = new Map(); // channel -> Set<callback>

function getOrCreateSubscriber() {
    if (_subscriber) return _subscriber;

    const isRailway = process.env.RAILWAY_STATIC_URL !== undefined || process.env.RAILWAY_ENVIRONMENT !== undefined;
    const redisUrl = process.env.REDIS_URL || (isRailway ? 'redis://redis.railway.internal:6379' : null);
    if (!redisUrl) return null;

    try {
        _subscriber = new Redis(redisUrl, {
            maxRetriesPerRequest: 3,
            enableReadyCheck: true,
            retryStrategy(times) {
                if (!isRailway && redisUrl.includes('railway.internal')) return null;
                return Math.min(times * 50, 2000);
            }
        });

        _subscriber.on('error', (err) => {
            secureLog('warn', 'Redis subscriber error', { error: err.message });
        });

        _subscriber.on('message', (channel, message) => {
            const listeners = _channelListeners.get(channel);
            if (listeners) {
                for (const cb of listeners) {
                    try { cb(message); } catch (e) {
                        secureLog('error', 'Redis subscriber listener error', { channel, error: e.message });
                    }
                }
            }
        });

        return _subscriber;
    } catch (e) {
        secureLog('error', 'Redis subscriber initialization failed', { error: e.message });
        return null;
    }
}

/**
 * Subscribe a callback to a Redis channel using the shared subscriber.
 * Returns an unsubscribe function.
 */
export async function subscribeChannel(channel, callback) {
    const sub = getOrCreateSubscriber();
    if (!sub) return null;

    if (!_channelListeners.has(channel)) {
        _channelListeners.set(channel, new Set());
        await sub.subscribe(channel);
    }
    _channelListeners.get(channel).add(callback);

    return async () => {
        const listeners = _channelListeners.get(channel);
        if (listeners) {
            listeners.delete(callback);
            if (listeners.size === 0) {
                _channelListeners.delete(channel);
                await sub.unsubscribe(channel).catch(() => {});
            }
        }
    };
}
