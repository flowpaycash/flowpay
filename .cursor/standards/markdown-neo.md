# NEO Markdown Standard — Guide for AI

Reference document for **any AI agent** that edits or creates
Markdown in the NEO context. Following this standard ensures
retro (80s/90s) visual consistency and alignment with the
protocol identity.

---

## General rule: 40-character width (mobile-first)

- **All lines** of content, borders, and titles must respect
  **40 characters** max width for mobile compatibility.
- Break long paragraphs into lines of up to 40 characters.
- **Boxes can be open** on the right side (no closing `│`).
- 48 characters is acceptable when 40 is too restrictive.
- **GitHub:** Wrap border/ASCII blocks in ` ```text ``` `
  so font is monospace and alignment is preserved.

---

## 1. Alerts and status (reports)

Use for document headers, checklists, and items with
status (OK / WARN).

**Report header:**

```text
========================================
         CENTERED TITLE
========================================
```

- Line of `=` with **40 characters** (exactly 40).
- Centered title on the next line.
- Another line of `=` closing.

**Status items:**

- **Complete:** `[####] Description ............ OK`
- **Partial:** `[#---] Description ........... WARN`

Use dots (`.`) to align the status column on the right.
Keep the line at 40 characters max.

**Example:**

```text
========================================
    NEO PROTOCOL - PHASE 1
========================================
[####] Version 1.0.0 .............. OK
[#---] Design Phase ............. WARN
========================================
```

---

## 2. Structured data (lists and sections)

Use boxes with simple borders. **Right side can be open.**

**Template (closed box):**

```text
┌────────────────────────────────────────
│ ▓▓▓ SECTION NAME
├────────────────────────────────────────
│ └─ Main item
│    └─ Sub-item
│    └─ Another sub-item
```

**Template (open box - recommended for mobile):**

```text
▓▓▓ SECTION NAME
────────────────────────────────────────
└─ Main item
   └─ Sub-item
   └─ Another sub-item
```

- **Borders:** `┌` `─` `├` (left side only if open).
- **Width:** 40 characters per line (48 max if needed).
- **Section:** `▓▓▓` followed by space and section name.
- **Items:** `└─` for item; 3 spaces + `└─` for sub-item.

---

## 3. Architecture and layer diagrams

Use heavy borders and "dithering" to highlight
architecture blocks. Can be open on right side.

**Template (closed):**

```text
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ LAYER NAME                           ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ ░ Content with dithering         ░ ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Template (open - mobile-friendly):**

```text
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃ LAYER NAME
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃ ░ Content with dithering
┃ ░ More content here
```

- **Borders:** `┏` `┃` `┣` and `━` (left side).
- **Dithering:** `░` on left for background effect.
- **Width:** 40 characters (48 max if needed).
- Use for layers (NEO Layer, Moltbot Core, etc.).

---

## 4. Section separators (subtopics)

For subsections within the document:

```text
────────────────────────────────────────
1. Block name (optional)
────────────────────────────────────────
```

- Line of `-` with 40 characters (48 max).
- Optional title on middle line.
- Another line of `-` closing.

---

## 5. Lists outside boxes

- Use **`-`** (dash) as list marker, not `•` or `+`.
- Add blank line before/after list for readability.
- Keep lines under 40 characters when possible.

---

## 6. URLs and references

- Write URLs inside **angle brackets**: `<https://...>`.
- Prevents linter from treating as "bare URLs" (MD034).
- Break long URLs with line continuation if needed.

---

## 7. Standard document signature

Every NEO document must end with this signature.
Use **exactly** as below, at end of body text.

```text
▓▓▓ NΞØ MELLØ
────────────────────────────────────────
Core Architect · NΞØ Protocol
neo@neoprotocol.space

"Code is law. Expand until
 chaos becomes protocol."

Security by design.
Exploits find no refuge here.
────────────────────────────────────────
```

- **Where:** at end of document, after license/refs.
- **Do not change** the text or quote marks.
- Width: 40 characters (open box style).

---

## 8. Markdownlint in NEO documents

Documents using this standard throughout must include
at **top of file**:

```html
<!-- markdownlint-disable MD003 MD007 MD013 MD022 MD023 MD025 MD029 MD032 MD033 MD034 -->
```

So linter does not conflict with:

- Setext-style headings (`====` / `----`).
- Multiple blocks that look like "H1".
- Line length (MD013 - we use 40/48 chars).
- Lists and indentation inside ASCII boxes.
- Type names and URLs in `<>`.

---

## 9. Quick reference for AI

- **Report title:** `====` + title + `====` — 40 chars
- **Item OK:** `[####] text ...... OK` — 40 chars
- **Item WARN:** `[#---] text ..... WARN` — 40 chars
- **Open box:** `▓▓▓` + `────` + `└─` — no right `│`
- **Closed box:** `┌─├` + content + right `│` if needed
- **Architecture:** `┏┃┣` + `━` + `░` — 40 chars
- **Subtitle:** `────` + title + `────` — 40 chars
- **Lists:** marker `-` (not `•` or `+`)
- **URLs:** `<https://...>` (inside angle brackets)
- **Signature:** `▓▓▓ NΞØ MELLØ` at end (see §7)

**Mobile-first priorities:**

1. **40 characters max** (48 if absolutely needed)
2. **Open boxes** (no right border) preferred
3. **Break long text** naturally
4. **Keep ASCII art** for identity
5. **MS-DOS mood** maintained

When creating or editing NEO Markdown: keep **40 chars**,
use open boxes, include **standard signature** at end,
and add markdownlint disable comment at top.

---

## 10. Examples comparison

**Desktop (64 chars - old standard):**
```text
┌──────────────────────────────────────────────────────────────┐
│ ▓▓▓ VERY LONG SECTION NAME WITH LOTS OF DETAILS              │
└──────────────────────────────────────────────────────────────┘
```

**Mobile (40 chars - new standard):**
```text
▓▓▓ SECTION NAME
────────────────────────────────────────
└─ Details broken into
   multiple lines
```

**The mobile version:**
- ✅ Fits iPhone SE (320px)
- ✅ No horizontal scroll
- ✅ Maintains ASCII identity
- ✅ Still looks retro/MS-DOS

---

▓▓▓ NΞØ MELLØ
────────────────────────────────────────
Core Architect · NΞØ Protocol
neo@neoprotocol.space

"Code is law. Expand until
 chaos becomes protocol."

Security by design.
Exploits find no refuge here.
────────────────────────────────────────

### FONTS ASCII

PROTOCOL:

░█▀█░█▀▀░█▀█░░░█▀█░█▀▄░█▀█░▀█▀░█▀█░█▀▀░█▀█░█░░
░█░█░█▀▀░█░█░░░█▀▀░█▀▄░█░█░░█░░█░█░█░░░█░█░█░░
░▀░▀░▀▀▀░▀▀▀░░░▀░░░▀░▀░▀▀▀░░▀░░▀▀▀░▀▀▀░▀▀▀░▀▀▀

ICONE:
     █ 
  ▄███  
 █  █ █ 
 █ █  █ 
  ███▀  
 █