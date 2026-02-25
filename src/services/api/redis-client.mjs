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
            secureLog('info', 'Redis client connected to the network');
        });

        return client;
    } catch (e) {
        secureLog('error', 'Redis initialization failed', { error: e.message });
        return null;
    }
}

export const redis = createRedisClient();
