# FLOWPAY ⟁ SETUP GUIDE
 
```text
. . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
.                                                         .
.   F L O W P A Y   S Y S T E M   O P E R A T I O N S     .
. . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
.                                                         .
.   Sovereign Node : mio-flowpay                          .
.   Role           : Settlement Core                      .
.   Engine         : SSR / Astro                          .
.   Protocol       : NΞØ Sovereign v1.0.1                 .
.                                                         .
. . . . . . . . . . . . . . . . . . . . . . . . . . . . . .
```
 
Technical Configuration and Operational Manual.
 
────────────────────────────────────────
 
## REQUISITOS DO SISTEMA
 
- Node.js ........................................... v22.x
- Database .......................... SQLite / Neon / PostG
- Infra ....................................... Railway CLI
- Network ....................................... NΞØ Tunnel
 
────────────────────────────────────────
 
## SECURITY GATES (CONDITIONAL EXECUTION)
 
O motor do FlowPay impõe portões de validação absolutos.
 
1. HMAC GATE ............ Valida assinaturas (WooVi/Nexus)
2. TUNNEL GATE .......... Handshake L4/7 (TUNNEL_SECRET)
3. FINALITY GATE ........ On-chain Verification (PoI)
 
────────────────────────────────────────
 
## VARIÁVEIS DE AMBIENTE (.env)
 
```text
...........................................................
. ITEM ................. FUNCTION ............. SEVERITY  .
...........................................................
.                                                         .
. TUNNEL_SECRET ........ NΞØ Tunnel Auth ...... [ CRIT ]  .
. WOOVI_API_KEY ........ Pix API Comm ......... [ CRIT ]  .
. WOOVI_WEBHOOK_SEC .... HMAC Key ............. [ CRIT ]  .
. NEXUS_WEBHOOK_URL .... Nexus Endpoint ....... [ SYST ]  .
. QUICKNODE_RPC_URL .... On-chain Mon ......... [ SYST ]  .
.                                                         .
...........................................................
```
 
────────────────────────────────────────
 
## FLUXO OPERACIONAL
 
```text
- BOOTSTRAP .................................. npm install
- PROVISIONING ........................... npm run neo:cfg
- DEVELOPMENT ..................... railway run npm run dev
- PRODUCTION ................................ npm run build
```
 
────────────────────────────────────────
 
## VERIFICAÇÃO & AUDITORIA
 
O FlowPay opera em **Closed Loop**. Use as ferramentas integradas:
 
```text
...........................................................
. COMMAND ............................. ACTION ............
...........................................................
.                                                         .
. npm run test ................. Finance Integrity Suite  .
. make check .................. Health (API/Tunnel/RPC)   .
. make logs ................... Audit Streaming (DB)      .
.                                                         .
...........................................................
```
 
─+++++────────────────────────────────
 
▓▓▓ NΞØ MELLØ
 
────────────────────────────────────────
Core Architect · NΞØ Protocol
 
"Infrastructure finalized. Flow established."
────────────────────────────────────────
```