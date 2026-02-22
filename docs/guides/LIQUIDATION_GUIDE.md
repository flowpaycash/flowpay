<!-- markdownlint-disable MD003 MD007 MD013 MD022 MD023 MD025 MD029 MD032 MD033 MD034 -->
```text
========================================
     GUIA DE LIQUIDAÇÃO ASSISTIDA
========================================
Estratégia: PIX -> USDT
Status: IMPLEMENTADO
========================================
```

▓▓▓ CONCEITO
────────────────────────────────────────
Liquidação assistida não é gambiarra.
É controle consciente do risco no
momento certo do projeto.

└─ Fluxo:
   1. PIX confirmado (webhook)
   2. Ordem criada (PENDING_REVIEW)
   3. Admin valida taxa/liquidez
   4. Admin clica em "Liquidar Agora"
   5. Execução on-chain automática

▓▓▓ OPERAÇÃO
────────────────────────────────────────
O sistema decide quando pode decidir
sozinho. Atualmente, a execução exige
assinatura da Hot Wallet do serviço.

└─ Endpoints:
   GET  /settlement-orders (Listar)
   POST /settlement-orders (Executar)

▓▓▓ POR QUE FUNCIONA
────────────────────────────────────────
[####] Não trava ................. OK
[####] Não mente ................. OK
[####] Não se expõe .............. OK

1. O PIX é confirmado imediatamente.
2. O produto é liberado (Unlock).
3. A liquidação blockchain acontece
   em background sob supervisão.

▓▓▓ NΞØ MELLØ
────────────────────────────────────────
Core Architect · NΞØ Protocol
neo@neoprotocol.space

"Code is law. Expand until
 chaos becomes protocol."

Security by design.
Exploits find no refuge here.
────────────────────────────────────────
