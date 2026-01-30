# Railway Deployment Postmortem

**Data:** 30/01/2026
**Status:** Falha Persistente (502 Bad Gateway)
**Decisão:** Descontinuar tentativa de deploy no Railway e migrar estratégia.

## O Problema

O deploy da aplicação FlowPay (Astro SSR + Node.js) no Railway resulta invariavelmente em um erro **502 Bad Gateway** ("Application failed to respond"). O container parece iniciar ("Starting Container"), mas nunca se torna saudável ou acessível externamente.

## O que foi testado (Sem Sucesso)

Realizamos uma bateria exaustiva de testes isolando variáveis, desde a aplicação completa até um servidor "Hello World":

1.  **Configuração Padrão Astro SSR:**
    *   Deploy via Nixpacks automático.
    *   Resultado: 502.

2.  **Configuração de Porta e Host:**
    *   Forçamos `HOST=0.0.0.0` e `PORT=8080` (e depois 3000) via variáveis de ambiente e código.
    *   Alteramos `astro.config.mjs` para ler essas variáveis explicitamente.
    *   Resultado: 502.

3.  **Dependências Nativas (SQLite):**
    *   Identificamos `better-sqlite3` como potecial causa de falha silenciosa de build/start.
    *   Configuramos `nixpacks.toml` para incluir deps de sistema (`python3`, `gcc`, `make`).
    *   Externalizamos `better-sqlite3` na config do Vite.
    *   Resultado: 502.

4.  **Gestão de Dependências:**
    *   Geramos `package-lock.json` para garantir builds determinísticos com `npm ci`.
    *   Resultado: 502.

5.  **Isolamento de Infraestrutura (Docker Manual):**
    *   Substituímos o builder Nixpacks por um `Dockerfile` manual baseado em `node:20-alpine` e `node:20-slim`.
    *   Isso nos deu controle total sobre o ambiente de execução.
    *   Resultado: 502.

6.  **Isolamento de Aplicação (Servidor Mínimo):**
    *   **Criamos um script `server-simple.js` sem NENHUMA dependência** (apenas biblioteca padrão `http`).
    *   Removemos **todas** as dependências do `package.json`.
    *   Desabilitamos o passo de build (`scripts.build: "echo skipped"`).
    *   Hard-coded da porta 3000.
    *   Resultado: 502. Este foi o teste definitivo que apontou para falha na infraestrutura ou configuração de rede do Railway, já que é impossível um servidor Node puro de 5 linhas falhar por "erro de código" dessa maneira.

## Suspeitas e Conclusão

Dado que até um servidor HTTP nativo mínimo falha em responder na porta exposta (seja 8080 ou 3000), as suspeitas recaem sobre:

1.  **Mapeamento de Porta Interna:** O proxy reverso do Railway não está conseguindo mapear a porta exposta pelo Docker para o tráfego externo, possivelmente esperando uma porta diferente da configurada (variável `$PORT`) mesmo quando tentamos forçá-la.
2.  **Estado "Zumbi":** O serviço no Railway pode estar em um estado inconsistente onde configurações antigas persistem apesar de novos deploys.
3.  **Bloqueio Silencioso:** Algum processo de healthcheck interno está matando o container antes que ele possa aceitar conexões, sem gerar logs úteis.

**Conclusão:** O esforço para debugar a "caixa preta" da infraestrutura do Railway superou o tempo razoável de desenvolvimento. A aplicação em si está saudável (roda localmente e o build passa). A estratégia correta agora é mudar para um provedor com suporte mais transparente a Docker/Node ou suporte nativo a Astro.

## Próximos Passos (Alternativas)

1.  **Vercel + Turso:** Mover frontend/SSR para Vercel e banco de dados para Turso (SQLite na cloud).
2.  **Render:** Infraestrutura similar ao Railway mas com comportamento Docker mais previsível.
3.  **Fly.io:** Controle total de VM para persistência de SQLite local.
