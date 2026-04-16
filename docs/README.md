# 📚 Vinh Khanh Food Tour — Technical Documentation

> Multi-page **static HTML** documentation site for the Vinh Khanh Food Tour project.  
> No build step, no Node.js required. Just a simple HTTP server.

---

## 🚀 Running the Docs Site Locally

### Option 1 — Python (recommended)

```bash
# From the docs/ directory
python -m http.server 8088

# On systems where python3 is the default
python3 -m http.server 8088
```

Open your browser at: **http://localhost:8088**

### Option 2 — Node.js (npx serve)

```bash
cd docs
npx serve -p 8088
```

### Option 3 — VS Code Live Server

1. Install the **Live Server** extension by Ritwick Dey
2. Right-click `index.html` → **Open with Live Server**
3. Opens automatically at `http://127.0.0.1:5500`

> ⚠️ **Do not open HTML files directly via `file://`** — the diagram modal relies on module patterns that require an HTTP origin.

---

## 📂 Folder Structure

```
docs/
├── index.html              ← Home page (hero, stats, navigation)
├── getting-started.html    ← Full project run guide (backend, mobile, frontend)
├── overview.html           ← System architecture
├── uml.html                ← Use Case + Sequence + Activity + ER diagrams
├── features.html           ← Full feature reference (Controllers, ViewModels, APIs)
├── auth.html               ← Auth & JWT security
├── geofence.html           ← Geofence engine & GPS
├── audio.html              ← Audio / Azure TTS pipeline
├── startup.html            ← Backend + Mobile startup sequences
├── offline.html            ← Offline sync + SQLite cache
├── content.html            ← POI & Database
├── localization.html       ← Multilingual (i18n)
├── admin.html              ← Admin / Vendor portal
├── patterns.html           ← Design patterns
├── appendix.html           ← Tech stack & dependencies
│
├── css/
│   └── styles.css          ← All styling (custom dark theme)
│
└── js/
    ├── main.js             ← Navigation, scroll progress bar, mobile menu
    └── diagrams.js         ← ⭐ Single source of truth for ALL Mermaid diagrams
```

---

## ✏️ Editing the Documentation

### Updating or Adding a Diagram (Sequence, Activity, Architecture)

**Edit one file only:** `js/diagrams.js`

```js
// Every diagram is a key inside the DIAGRAMS object:
window.DIAGRAMS = {
  'auth-jwt': {
    title: 'Login + Token Refresh',
    code: `sequenceDiagram
      ...`
  },
  // Add new diagrams here
  'my-new-diagram': {
    title: 'Modal window title',
    code: `sequenceDiagram
      ...`
  }
}
```

Then add a trigger button in the relevant HTML page:

```html
<button class="diagram-btn" data-diagram="my-new-diagram">🆕 Button label</button>
```

### Updating Use Case Diagrams

Use Case diagrams are **inline SVG** inside `uml.html` — edit the `<svg>` blocks directly in that file.

### Adding a New Page

1. Copy an existing page (e.g. `patterns.html`) as a template
2. Rename it (e.g. `newpage.html`)
3. Update the `<nav>` block in **every** HTML file:

```powershell
# PowerShell — bulk-add a nav link to all pages
$files = Get-ChildItem "*.html"
foreach ($f in $files) {
    $c = Get-Content $f.FullName -Raw -Encoding UTF8
    $c = $c -replace '(<li><a href="appendix\.html">)', '<li><a href="newpage.html">Page Name</a></li>$1'
    [System.IO.File]::WriteAllText($f.FullName, $c, [System.Text.UTF8Encoding]::new($false))
}
```

---

## 📤 Publishing Updates (Git Push)

```bash
# From the project root (c-sharp-au/)
git add docs/
git commit -m "docs: <describe your changes>"
git push origin main
```

Remote: `https://github.com/codeweb2005/csharp-project.git`  
Default branch: `main`

---

## 🛠️ Documentation Tech Stack

| Component      | Technology                                      |
|----------------|-------------------------------------------------|
| Markup         | Vanilla HTML / CSS / JS — no framework          |
| Diagrams       | [Mermaid.js 10](https://mermaid.js.org) via CDN |
| Use Case SVGs  | Inline SVG (bypasses Mermaid for clarity)       |
| Font           | Inter (Google Fonts)                            |
| Icons          | Unicode emoji                                   |
| Theme          | Custom dark mode (`#0f172a` background)          |

---

## ⚠️ Important Guidelines

- All architecture, API, and logic changes **must be reflected in `diagrams.js`** to keep documentation accurate.
- **Never add mock or invented data** — every fact must match the actual codebase.
- The `getting-started.html` page covers the full project setup (Backend, Frontend, Mobile, Docker).
