<!-- markdownlint-disable MD003 MD007 MD013 MD022 MD023 MD025 MD029 MD032 MD033 MD034 -->

# FLOWPay: Motor de Liquidação Soberana

```text
========================================
     FlowPay - SETTLEMENT ENGINE
========================================
Nó: mio-flowpay
Protocolo: NΞØ Smart Factory
Infra alvo: Railway + NΞØ Tunnel + Nexus Core
Papel deste README: Arquitetura e contexto
========================================
```

## Visão Arquitetural

O **FlowPay** é o motor de liquidação determinística do ecossistema NΞØ. Ele orquestra a conversão de capital Web2 (PIX/WooVi) em ativos Web3, utilizando uma arquitetura de **Relayer Proxy** isolada para garantir a soberania das chaves privadas.

## Fluxo Operacional (Conceitual)

```mermaid
graph TD
    classDef web2 fill:#0b1220,stroke:#38bdf8,stroke-width:2px,color:#e2e8f0;
    classDef engine fill:#111827,stroke:#22c55e,stroke-width:2px,color:#f9fafb;
    classDef gate fill:#1f2937,stroke:#f59e0b,stroke-width:2px,stroke-dasharray: 5 4,color:#fde68a;
    classDef tunnel fill:#052e2b,stroke:#14b8a6,stroke-width:2px,color:#ccfbf1;
    classDef nexus fill:#2a1238,stroke:#a78bfa,stroke-width:2px,color:#ede9fe;
    classDef chain fill:#172554,stroke:#60a5fa,stroke-width:2px,color:#dbeafe;
    classDef audit fill:#14532d,stroke:#4ade80,stroke-width:2px,color:#dcfce7;
    classDef error fill:#3f1d1d,stroke:#f87171,stroke-width:2px,color:#fee2e2;

    subgraph WEB2 ["CAMADA WEB2"]
        START((WOOVI API<br/>Pagamento PIX))
    end

    subgraph NEO ["INFRA NΞØ SOBERANA"]
        RELAYER["FLOWPAY ENGINE<br/>Relayer de Liquidação"]
        HMAC{"HMAC OK?"}
        TUNNEL["NΞØ TUNNEL<br/>Ponte Cripto"]
        SECRET{"Tunnel Secret OK?"}
        NEXUS["NΞØ NEXUS<br/>Gestor de Estado"]
        AUTH{"Auth de Execução?"}
    end

    subgraph ONCHAIN ["BLOCKCHAIN / RPC"]
        FACTORY["SMART FACTORY<br/>Mint / Execução"]
        RPC{"RPC ADAPTER<br/>Confirmado?"}
    end

    subgraph AUDIT ["FINALIDADE / AUDITORIA"]
        WATCHER["NEØBOT AUDIT<br/>Watcher"]
        POI["PROOF OF INTEGRITY"]
        LOG["LOG LOCAL"]
        END[[RECIBO FINAL<br/>LIQUIDADO]]
    end

    START -->|Webhook PIX| RELAYER
    RELAYER --> HMAC

    HMAC -- NÃO --> DROP1["Descartar + Log"]
    HMAC -- SIM --> TUNNEL

    TUNNEL --> SECRET
    SECRET -- NÃO --> DROP2["Bloqueio IP / Rate Limit"]
    SECRET -- SIM --> NEXUS

    NEXUS --> AUTH
    AUTH -- NÃO --> RETRY["Retry / Fila Local"]
    AUTH -- SIM --> FACTORY

    FACTORY --> RPC
    RPC -- PENDENTE --> RPC
    RPC -- OK --> WATCHER

    WATCHER --> POI
    POI --> LOG
    LOG --> END

    END -.->|Finalidade Confirmada| START

    class START web2;
    class RELAYER engine;
    class HMAC,SECRET,AUTH,RPC gate;
    class TUNNEL tunnel;
    class NEXUS nexus;
    class FACTORY chain;
    class WATCHER,POI,LOG,END audit;
    class DROP1,DROP2,RETRY error;
```

## Segurança e Conformidade

A segurança do FlowPay é baseada em **Blindagem Tripla**:

1. **Segregação:** O FlowPay não armazena `MINTING_KEYS`. Ele apenas solicita execuções à Factory via canal seguro.
2. **Auditabilidade:** Toda transação é acompanhada por uma **Proof of Integrity (PoI)** assinada pelo Neobot.
3. **Isolamento de Rede:** Comunicação via **NΞØ Tunnel** com handshake de `TUNNEL_SECRET`.

## Estado Atual do Projeto

- Runtime principal em **Astro server mode** com adapter `@astrojs/node`.
- Deploy e operação em **Railway**.
- Endpoints de aplicação padronizados em **`/api/*`**.
- Segurança consolidada com documento canônico em `docs/SECURITY_AUDIT.md`.
- Documento histórico de auditoria mantido em `docs/archive/SECURITY_AUDIT_2026-02-08.md`.

## Fronteiras de Documentação

- Este `README.md` descreve **arquitetura, contexto e direção**.
- Toda configuração técnica, execução local, comandos e deploy ficam em **`SETUP.md`**.

## Índice Canônico

- `SETUP.md` -> Setup técnico, execução e operação.
- `docs/README.md` -> Mapa da base de conhecimento.
- `docs/WOOVI_INTEGRATION_GUIDE.md` -> SSOT de integração PIX/WooVi.
- `docs/SECURITY_AUDIT.md` -> Estado de segurança vigente.

---

NΞØ MELLØ
Core Architect · NΞØ Protocol
