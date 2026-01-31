# 🎨 Guia de Frontend e Design System

## 🏗️ Arquitetura

O FlowPay utiliza **Astro** como framework principal.

**Por que Astro?**
*   **Performance:** Zero JavaScript por padrão (Islands Architecture).
*   **SSR (Server Side Rendering):** Renderização no servidor para SEO e segurança.
*   **Flexibilidade:** Permite usar componentes React se necessário.

### Estrutura de Pastas
```
src/
├── components/   # Componentes UI reutilizáveis (Header, Footer, Cards)
├── layouts/      # Layouts base (BaseLayout.astro)
├── pages/        # Rotas da aplicação (index.astro, checkout.astro)
├── styles/       # CSS Global e Design Tokens
└── services/     # Lógica de negócio e chamadas de API
```

## 📱 Design System (Identity NEØ)

Nosso design segue uma estética moderna, "Glassmorphism" e Mobile-First.

### Princípios
1.  **Cores:** Paleta escura com acentos vibrantes (Neon).
2.  **Glassmorphism:** Uso extensivo de transparências e blur (`backdrop-filter`).
3.  **Tipografia:** Moderna sans-serif (Inter/SF Pro).
4.  **Feedback:** Micro-interações e estados de loading claros.

### CSS
Utilizamos CSS puro (Vanilla) ou Modules, evitando frameworks pesados como Tailwind a menos que estritamente necessário, para manter controle total sobre a performance e animações.

## 🛠️ Manutenção

*   **Novas Páginas:** Crie arquivos `.astro` em `src/pages/`.
*   **Estilos:** Prefira variáveis CSS (`:root`) definidas em `src/styles/global.css` para manter consistência.
