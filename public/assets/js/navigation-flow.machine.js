/**
 * Navigation Flow Machine
 * Gerencia o fluxo de navegação do checkout
 */

export function startCheckout(config = {}) {
    console.log('🚀 Starting checkout flow...', config);

    // Implementação básica do fluxo de checkout
    return {
        start: () => {
            console.log('Checkout started');
        },
        stop: () => {
            console.log('Checkout stopped');
        }
    };
}

export default {
    startCheckout
};
