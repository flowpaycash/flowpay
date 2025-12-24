<!-- markdown rules -->

## Regras de Markdown - NEØ Dev

### Regra Principal: Linha em Branco Após Headers

**SEMPRE adicione uma linha em branco após qualquer título** (###, ##, #) antes de iniciar o conteúdo.

#### ✅ Correto

```markdown
### 1. **Título da Seção** ✅ STATUS

- **Campo**: Valor
- **Outro campo**: Outro valor
```

#### ❌ Incorreto

```markdown
### 1. **Título da Seção** ✅ STATUS

- **Campo**: Valor
- **Outro campo**: Outro valor
```

### Padrões de Formatação

#### Títulos

- Use `#` para título principal (H1)
- Use `##` para seções principais (H2)
- Use `###` para subseções (H3)
- Use `####` para sub-subseções (H4)

**Sempre adicione uma linha em branco após o título antes do conteúdo.**

#### Listas

- Use `-` para listas não ordenadas
- Use `1.`, `2.`, etc. para listas ordenadas
- Indente com 2 espaços para subitens

#### Código

- Use \`backticks\` para código inline
- Use blocos de código com \`\`\` para blocos
- Sempre especifique a linguagem quando possível

#### Ênfase

- Use `**negrito**` para destaque
- Use `*itálico*` para ênfase suave
- Use `~~riscado~~` para texto descontinuado

#### Emojis e Unicode

**NUNCA use emojis** (😀, ✅, ❌, etc.) em documentação ou código.

**Use caracteres Unicode** quando necessário para simbolismo visual:

- ⟁ ⟠ ⧉ ⧇ ⧖ ⧗ ⍟
- ◬ ◭ ◮ ◯ ⨀ ⨂ ⨷
- ◱ ◲ ◳ ◴ ◵ ◶ ◷ ⦿ ꙮ

### Configurações do Projeto

Este projeto usa:

- **EditorConfig** (`.editorconfig`) - Configurações do editor
- **Prettier** (`.prettierrc.json`) - Formatação automática
- **Markdownlint** (`.markdownlint.json`) - Validação de estilo

Ver `.markdown-style-guide.md` para guia completo.
