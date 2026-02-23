# FLOWPAY - BRANDING.ME

Version: v1.0
Date: 2026-01-30
Tagline: PIX that actually unlocks things.
Principle: Secure by default. Rails-agnostic by design.

## 0) Essencia

FlowPay nao e app.
FlowPay e infra premium com estetica de energia:
- velocidade (instant rails)
- seguranca (cripto sem friccao)
- autoridade (permission issuer)
- futuro operavel (nao conceito)

Direcao visual:
- glow controlado
- glass UI
- contraste profundo

## 1) Logotipo

### 1.1 Wordmark
- "FLOW" em caixa alta
- "Pay" em italico com leve inclinacao
- icone central opcional: coin glyph abstrato

Regra critica:
- nao usar "₿" como simbolo principal oficial
- "₿" pode existir como sticker ou asset de hype

### 1.2 Area de respiro
- minimo: 1x altura do "O" ao redor do logo

### 1.3 Versoes
- Primary: FLOWPay (magenta glow)
- Mono: branco puro ou preto puro
- Badge: Unlock Inside

## 2) Paleta de cores

### 2.1 Core
- Flow Magenta: `#FF2BD6`
- Flow Violet: `#7A1CFF`
- Neon Pink: `#FF4DE3`
- Electric Blue: `#2DE2FF`

### 2.2 Dark System
- Abyss Black: `#050007`
- Deep Violet: `#120018`
- Night Purple: `#1A0A2B`

### 2.3 Light System
- Off White: `#F7F4FB`
- Lilac Fog: `#EEE6FF`
- Soft Violet: `#C9B6FF`

### 2.4 Semantica
- Success/Paid: `#00F5A0`
- Warning/Pending: `#FFCC00`
- Danger/Failed: `#FF3B3B`
- Info/Neutral: `#6EE7FF`

## 3) Gradientes oficiais

### 3.1 Primary Neon Blend
`linear-gradient(135deg, #FF2BD6 0%, #7A1CFF 55%, #2DE2FF 100%)`

### 3.2 Deep Glow
`radial-gradient(circle at 50% 40%, rgba(255,43,214,0.40), rgba(5,0,7,0.95) 65%)`

### 3.3 Night Glass
`linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))`

## 4) Tipografia

UI e Produto
- Inter (400, 600, 800)

Infra, Codigo, Termos tecnicos
- JetBrains Mono (400, 600)

Headline de marketing (opcional)
- Sora ou Space Grotesk

## 5) Estilo visual

Principios
- futurista sem poluicao visual
- glow com controle (20% a 35%)
- blur e vidro com intencao de infra premium
- iconografia minima e geometrica

Texturas permitidas
- grain leve (3% a 6%)
- scanline sutil (2% a 3%)
- bloom suave

Texturas proibidas
- ruido pesado
- glitch agressivo
- distorcao que prejudica legibilidade

## 6) Componentes UI

### 6.1 Botoes
Primary CTA
- BG: `#FF2BD6`
- Text: `#050007`
- Glow: `rgba(255,43,214,0.35)`
- Radius: `16px`

Secondary CTA
- BG: `rgba(255,255,255,0.06)`
- Border: `rgba(255,255,255,0.14)`
- Text: `#FFFFFF`

### 6.2 Cards/Glass
- BG: `rgba(18,0,24,0.58)`
- Border: `rgba(255,255,255,0.10)`
- Blur: `18px`

### 6.3 Payment status
- PAID: success green + check
- PENDING: amber pulse
- FAILED: red + error code detalhado

## 7) Iconografia

Preferencia
- stroke icons 1.5px a 2px
- geometria minima

Simbolos recomendados
- shield/key (secure by default)
- receipt (permission)
- lightning (instant rails)
- QR (Pix)
- chain link (ledger optional)

## 8) Foto e ilustracao

Diretriz
- abstracao grafica acima de fotografia

Quando usar
- renders de UI
- mockups de celular
- cards e receipts

## 9) Mensagens de marca

Core
- PIX that actually unlocks things.
- Payment -> Permission
- Unlock first. Settle later.
- Secure by default.

PT-BR
- Pix confirmado. Acesso liberado.
- O pagamento vira permissao.
- Receba Pix. Entregue acesso.

## 10) Estrutura de arquivos recomendada

```text
branding/
├─ branding.me.md
├─ logo/
│  ├─ flowpay-wordmark.svg
│  ├─ flowpay-mark.svg
│  ├─ flowpay-badge-unlock.svg
├─ colors/
│  ├─ flowpay.tokens.json
│  ├─ flowpay.tailwind.css
├─ ui/
│  ├─ button.png
│  ├─ card.png
│  ├─ receipt.png
```
