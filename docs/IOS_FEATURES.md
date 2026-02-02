# Funcionalidades iOS-like - FLOWPay

## ✅ Funcionalidades Implementadas

Todas as funcionalidades iOS-like foram mantidas na migração para Astro:

### 1. **Home Indicator iOS**

- Barra inferior estilo iOS
- Classe `.ios-home-indicator` aplicada
- Posicionamento fixo na parte inferior

### 2. **Safe Area Support**

- Suporte para notch e áreas seguras
- Classe `.safe-area-inset` aplicada no Hero
- Padding automático baseado em `env(safe-area-inset-*)`

### 3. **Pull to Refresh**

- Gestos iOS de pull-to-refresh
- Indicador visual durante o pull
- Recarrega página quando puxado > 100px

### 4. **Apple PWA Support**

- Meta tags Apple completas
- `apple-mobile-web-app-capable`
- `apple-mobile-web-app-status-bar-style`
- `apple-touch-fullscreen`

### 5. **Apple Splash Screens**

- Splash screens para múltiplos dispositivos
- Portrait e Landscape
- Diferentes resoluções e pixel ratios
- Total: 13 splash screens configuradas

### 6. **iOS-like Animations**

- Animações suaves
- Transições fluidas
- Efeitos de toque (tap highlight)

## 📱 Dispositivos Suportados

### Portrait

- iPhone X/XS (1125x2436)
- iPhone XR (828x1792)
- iPhone 8 Plus (1242x2208)
- iPhone 8 (750x1334)
- iPad Pro 12.9" (2048x2732)
- iPad Pro 11" (1668x2388)
- iPad (1536x2048)

### Landscape

- iPhone X/XS (2436x1125)
- iPhone XR (1792x828)
- iPhone 8 Plus (2208x1242)
- iPhone 8 (1334x750)
- iPad Pro 12.9" (2732x2048)
- iPad Pro 11" (2388x1668)
- iPad Pro 10.5" (2224x1668)
- iPad Air (2160x1620)

## 🎨 CSS iOS-like

Os estilos iOS estão em:

- `public/css/landing.css` - Estilos principais
- `public/css/navbar.css` - Navbar com glassmorphism

### Classes Principais

```css
.ios-home-indicator      /* Barra inferior iOS */
.safe-area-inset         /* Suporte para notch */
.pull-indicator          /* Indicador de pull-to-refresh */
```

## 🔧 Como Funciona

### Pull to Refresh

```javascript
// Detecta gesto de pull
document.addEventListener('touchstart', ...)
document.addEventListener('touchmove', ...)
document.addEventListener('touchend', ...)

// Mostra indicador visual
showPullIndicator()

// Recarrega se puxado > 100px
if (pullDistance > 100) {
  location.reload();
}
```

### Safe Area

```css
.safe-area-inset {
  padding-top: env(safe-area-inset-top, 44px);
  padding-bottom: env(safe-area-inset-bottom, 34px);
  padding-left: env(safe-area-inset-left, 0px);
  padding-right: env(safe-area-inset-right, 0px);
}
```

## 📝 Localização no Código

### Layout Base

- `src/layouts/Layout.astro` - Meta tags Apple e Home Indicator

### Página Principal

- `src/pages/index.astro` - Pull to Refresh e gestos iOS

### Componentes

- `src/components/Hero.astro` - Safe area inset aplicado

### CSS

- `public/css/landing.css` - Estilos iOS (linhas 30-80)
- `public/css/navbar.css` - Navbar iOS-like

## ✅ Checklist

- [x] Home Indicator iOS
- [x] Safe Area Support
- [x] Pull to Refresh
- [x] Apple PWA Meta Tags
- [x] Apple Splash Screens (13 total)
- [x] iOS-like Animations
- [x] Touch Gestures
- [x] Status Bar Style

## 🚀 Testando

### Em Dispositivo iOS

1. Adicionar à tela inicial (Add to Home Screen)
2. Abrir como PWA
3. Testar pull-to-refresh
4. Verificar safe areas (notch)
5. Verificar splash screens

### Em Desktop (Simulação)

1. Abrir DevTools (F12)
2. Toggle Device Toolbar (Ctrl+Shift+M)
3. Selecionar dispositivo iOS
4. Testar gestos de toque

## 📚 Referências

- [Apple PWA Guidelines](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)
- [Safe Area Insets](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)
- [Pull to Refresh](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events)

