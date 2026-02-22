// @ts-check
/**
 * ════════════════════════════════════════════════════════════════
 * 🎭 FlowPay · E2E · PIX Payment Journey
 * ════════════════════════════════════════════════════════════════
 * Simulates the full user journey:
 *   1. Land on /checkout
 *   2. Select PIX as payment method
 *   3. Fill buyer details (name, CPF, amount)
 *   4. Submit → receive QR Code
 *   5. Observe polling-driven status transitions
 *   6. Confirm bridge completion (success state)
 *
 * External API calls (Woovi/OpenPix) are mocked so the suite
 * can run offline and deterministically in CI.
 * ════════════════════════════════════════════════════════════════
 */

const { test, expect } = require('@playwright/test');

// ── Helpers ────────────────────────────────────────────────────

/**
 * Mock PIX charge response returned by /api/create-charge
 */
const MOCK_CHARGE = {
    success: true,
    id_transacao: 'test-txn-001',
    pix_data: {
        qr_code: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        br_code: '00020126580014br.gov.bcb.pix013600000000-0000-0000-0000-000000000000520400005303986540510.005802BR5913FLOWPAY_TEST6009SAO_PAULO62070503***6304E2CA',
    },
};

/**
 * Mock status transitions for the polling endpoint /api/charge/:id
 */
const STATUS_SEQUENCE = [
    { status: 'ACTIVE', bridge_status: null },          // initial — QR displayed
    { status: 'PIX_PAID', bridge_status: 'PENDING' },   // payment recognised
    { status: 'COMPLETED', tx_hash: '0xdeadbeef' },     // bridge done
];

// ── Test Suite ────────────────────────────────────────────────

test.describe('PIX Payment Journey', () => {
    let pollCallCount = 0;

    test.beforeEach(async ({ page }) => {
        pollCallCount = 0;

        // ── Mock: POST /api/create-charge ─────────────────────────
        await page.route('**/api/create-charge', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(MOCK_CHARGE),
            });
        });

        // ── Mock: GET /api/charge/:id (polling endpoint) ──────────
        await page.route('**/api/charge/**', async (route) => {
            const statusPayload = STATUS_SEQUENCE[Math.min(pollCallCount, STATUS_SEQUENCE.length - 1)];
            pollCallCount++;
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(statusPayload),
            });
        });

        // ── Mock: GET /ui.copy.pt.json ────────────────────────────
        await page.route('**/ui.copy.pt.json', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({}),
            });
        });
    });

    // ── Test 1: Landing Page ─────────────────────────────────────

    test('1 · mostra o checkout com seletor de modo', async ({ page }) => {
        await page.goto('/checkout');

        // Deve ter o cabeçalho do checkout
        await expect(page).toHaveTitle(/FlowPay/i);

        // ModeChooser deve estar visível
        const modeChooser = page.locator('[data-testid="mode-chooser"], .mode-chooser, #mode-chooser').first();
        // Fallback: verifica botões PIX e Cripto
        const pixBtn = page.locator('button, [role="button"]').filter({ hasText: /pix/i }).first();
        await expect(pixBtn).toBeVisible({ timeout: 10_000 });
    });

    // ── Test 2: Select PIX ────────────────────────────────────────

    test('2 · seleciona PIX e exibe formulário de detalhes', async ({ page }) => {
        await page.goto('/checkout');

        // Clica no botão PIX
        const pixBtn = page.locator('button, [role="button"]').filter({ hasText: /pix/i }).first();
        await pixBtn.click();

        // O step de detalhes deve aparecer (deixar de ter hidden)
        const detailsStep = page.locator('#step-details');
        await expect(detailsStep).toBeVisible({ timeout: 5_000 });

        // O PixForm deve conter campo de valor
        const amountField = page.locator('input[name="amount"], input[placeholder*="valor"], input[placeholder*="R$"], input[id*="amount"]').first();
        await expect(amountField).toBeVisible({ timeout: 5_000 });
    });

    // ── Test 3: Fill PIX Form & Submit ───────────────────────────

    test('3 · preenche formulário PIX e recebe QR Code', async ({ page }) => {
        await page.goto('/checkout');

        // Seleciona PIX
        const pixBtn = page.locator('button, [role="button"]').filter({ hasText: /pix/i }).first();
        await pixBtn.click();

        await page.locator('#step-details').waitFor({ state: 'visible' });

        // Preenche os campos do PixForm
        // Nome
        const nameInput = page.locator('input[name="name"], input[placeholder*="nome"], input[id*="name"]').first();
        if (await nameInput.isVisible()) {
            await nameInput.fill('João Teste');
        }

        // CPF
        const cpfInput = page.locator('input[name="cpf"], input[placeholder*="CPF"], input[id*="cpf"]').first();
        if (await cpfInput.isVisible()) {
            await cpfInput.fill('123.456.789-09');
        }

        // Valor / amount
        const amountInput = page.locator('input[name="amount"], input[type="number"], input[placeholder*="valor"], input[placeholder*="R$"]').first();
        if (await amountInput.isVisible()) {
            await amountInput.fill('10.00');
        }

        // Botão de submit/continuar
        const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /pagar|continuar|gerar|pix/i }).first();
        await submitBtn.click();

        // Aguarda o step de confirmação aparecer (QR Code)
        const confirmStep = page.locator('#step-confirm');
        await expect(confirmStep).toBeVisible({ timeout: 15_000 });

        // O QR Code deve aparecer
        const qrContainer = page.locator('#qr-container');
        await expect(qrContainer).toBeVisible({ timeout: 10_000 });
    });

    // ── Test 4: QR Code Display ─────────────────────────────────

    test('4 · QR Code é exibido com imagem e código PIX copia-cola', async ({ page }) => {
        await page.goto('/checkout');

        // Navega até o QR Code (simulando fluxo direto via route mock)
        const pixBtn = page.locator('button, [role="button"]').filter({ hasText: /pix/i }).first();
        await pixBtn.click();
        await page.locator('#step-details').waitFor({ state: 'visible' });

        const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /pagar|continuar|gerar|pix/i }).first();
        await submitBtn.click();

        // Aguarda QR Container aparecer
        await page.locator('#qr-container').waitFor({ state: 'visible', timeout: 15_000 });

        // QR Image deve ter src preenchido (não vazio)
        const qrImg = page.locator('#qr-image');
        await expect(qrImg).toBeVisible();
        const src = await qrImg.getAttribute('src');
        expect(src).toBeTruthy();
        expect((src || '').length).toBeGreaterThan(10);

        // Campo BR Code (copia-cola) deve estar preenchido
        const brCodeInput = page.locator('#br-code-copy');
        await expect(brCodeInput).toBeVisible();
        const brCode = await brCodeInput.inputValue();
        expect(brCode).toBeTruthy();
        expect(brCode.length).toBeGreaterThan(20);
    });

    // ── Test 5: Copy PIX Code ────────────────────────────────────

    test('5 · botão "Copiar Código Pix" está acessível', async ({ page, context }) => {
        // Conceder permissão de clipboard
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);

        await page.goto('/checkout');
        const pixBtn = page.locator('button, [role="button"]').filter({ hasText: /pix/i }).first();
        await pixBtn.click();
        await page.locator('#step-details').waitFor({ state: 'visible' });

        const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /pagar|continuar|gerar|pix/i }).first();
        await submitBtn.click();
        await page.locator('#qr-container').waitFor({ state: 'visible', timeout: 15_000 });

        // O botão de copiar deve existir e ser clicável
        const copyBtn = page.locator('.copy-btn, button').filter({ hasText: /copiar/i }).first();
        await expect(copyBtn).toBeVisible();
        await expect(copyBtn).toBeEnabled();
    });

    // ── Test 6: Status Stepper Transitions ───────────────────────

    test('6 · stepper avança: QR → Processando → Confirmado', async ({ page }) => {
        // Aumenta o timeout — polling artificial pode demorar até 6 s
        test.setTimeout(90_000);

        await page.goto('/checkout');
        const pixBtn = page.locator('button, [role="button"]').filter({ hasText: /pix/i }).first();
        await pixBtn.click();
        await page.locator('#step-details').waitFor({ state: 'visible' });

        const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /pagar|continuar|gerar|pix/i }).first();
        await submitBtn.click();

        // Step 1 — QR exibido
        await expect(page.locator('#qr-container')).toBeVisible({ timeout: 15_000 });

        // Step 2 — Pagamento reconhecido → "Processando"
        // pollCallCount = 1 → STATUS_SEQUENCE[1] → PIX_PAID
        // O polling roda a cada 3 s no app; aguardamos 10 s para garantir
        await expect(page.locator('#processing-state')).toBeVisible({ timeout: 20_000 });
        await expect(page.locator('#qr-container')).toBeHidden({ timeout: 5_000 });

        // Step 3 — COMPLETED → Success state
        // pollCallCount = 2 → STATUS_SEQUENCE[2] → COMPLETED
        await expect(page.locator('#success-state')).toBeVisible({ timeout: 20_000 });
        await expect(page.locator('#processing-state')).toBeHidden({ timeout: 5_000 });
    });

    // ── Test 7: Success State ─────────────────────────────────────

    test('7 · estado de sucesso exibe botão "Novo Pagamento"', async ({ page }) => {
        test.setTimeout(90_000);

        await page.goto('/checkout');
        const pixBtn = page.locator('button, [role="button"]').filter({ hasText: /pix/i }).first();
        await pixBtn.click();
        await page.locator('#step-details').waitFor({ state: 'visible' });

        const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /pagar|continuar|gerar|pix/i }).first();
        await submitBtn.click();

        // Aguarda sucesso completo
        await expect(page.locator('#success-state')).toBeVisible({ timeout: 30_000 });

        // Botão de reset
        const resetBtn = page.locator('[data-action="reset"], button').filter({ hasText: /novo pagamento/i }).first();
        await expect(resetBtn).toBeVisible();
        await expect(resetBtn).toBeEnabled();
    });

    // ── Test 8: "Novo Pagamento" resets to mode chooser ──────────

    test('8 · "Novo Pagamento" reinicia o fluxo para seleção de modo', async ({ page }) => {
        test.setTimeout(90_000);

        await page.goto('/checkout');
        const pixBtn = page.locator('button, [role="button"]').filter({ hasText: /pix/i }).first();
        await pixBtn.click();
        await page.locator('#step-details').waitFor({ state: 'visible' });

        const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /pagar|continuar|gerar|pix/i }).first();
        await submitBtn.click();

        await expect(page.locator('#success-state')).toBeVisible({ timeout: 30_000 });

        // Clica em "Novo Pagamento"
        const resetBtn = page.locator('[data-action="reset"], button').filter({ hasText: /novo pagamento/i }).first();
        await resetBtn.click();

        // O confirm step deve sumir e o choose deve aparecer novamente
        await expect(page.locator('#step-confirm')).toBeHidden({ timeout: 5_000 });

        // Botão PIX deve estar visível de novo
        const pixBtnAgain = page.locator('button, [role="button"]').filter({ hasText: /pix/i }).first();
        await expect(pixBtnAgain).toBeVisible({ timeout: 5_000 });
    });
});
