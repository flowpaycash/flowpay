import { Redis } from 'ioredis';
import { secureLog } from './config.mjs';

function createRedisClient() {
    // Determine the environment correctly
    const redisUrl = process.env.REDIS_URL || 'redis://redis.railway.internal:6379';

    try {
        const client = new Redis(redisUrl, {
            maxRetriesPerRequest: 3,
            enableReadyCheck: true,
            retryStrategy(times) {
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
