/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare global {
    interface Window {
        completeOrder: any;
        loadTransactions: any;
        setFilter: any;
        approve: any;
        reject: any;
        loadUsers: any;
        __smartAccount?: any;
        sendSATransaction?: any;
        connectWallet?: any;
        disconnectWallet?: any;
        checkoutService?: any;
    }
}

export { };
