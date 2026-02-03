/**
 * Utility for retrying async operations
 * @param {Function} fn - The function to retry
 * @param {Object} options - Retry options
 * @param {number} options.retries - Number of retries (default: 3)
 * @param {number} options.delay - Initial delay in ms (default: 1000)
 * @param {Function} options.onRetry - Callback on each retry attempt
 */
export async function withRetry(fn, { retries = 3, delay = 1000, onRetry = null } = {}) {
    let lastError;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (onRetry) onRetry(error, attempt);

            if (attempt === retries) break;

            // Exponential backoff: 1s, 2s, 4s...
            const waitTime = delay * Math.pow(2, attempt - 1);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }

    throw lastError;
}
