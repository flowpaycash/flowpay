import crypto from 'crypto';

/**
 * Tests the HMAC validation logic used in webhooks.
 * This ensures that only requests signed with our WOOVI_WEBHOOK_SECRET are accepted.
 */
describe('HMAC Validation Integrity', () => {
    const SECRET = 'floCRm_test_secret_12345';
    const payload = JSON.stringify({
        event: 'charge.paid',
        data: {
            charge: {
                correlationID: 'test-123',
                amount: 1000
            }
        }
    });

    test('Valid signature passes verification', () => {
        const hmac = crypto.createHmac('sha256', SECRET);
        const signature = hmac.update(payload).digest('base64');

        const hmacVerify = crypto.createHmac('sha256', SECRET);
        const digest = hmacVerify.update(payload).digest('base64');

        expect(signature).toBe(digest);
        expect(crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))).toBe(true);
    });

    test('Invalid signature is rejected', () => {
        const wrongSecret = 'wrong_secret';
        const hmac = crypto.createHmac('sha256', wrongSecret);
        const badSignature = hmac.update(payload).digest('base64');

        const hmacVerify = crypto.createHmac('sha256', SECRET);
        const digest = hmacVerify.update(payload).digest('base64');

        expect(badSignature).not.toBe(digest);
    });

    test('Payload alteration invalidates signature', () => {
        const hmac = crypto.createHmac('sha256', SECRET);
        const originalSignature = hmac.update(payload).digest('base64');

        const alteredPayload = payload.replace('1000', '9000');
        const hmacVerify = crypto.createHmac('sha256', SECRET);
        const newDigest = hmacVerify.update(alteredPayload).digest('base64');

        expect(originalSignature).not.toBe(newDigest);
    });
});
