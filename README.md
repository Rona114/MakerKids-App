# 🖨️ MakerKids – Deployment Anleitung

Kinder zwischen 6–16 Jahren können hier ihre eigenen 3D-Druck und Lasercutter-Dateien generieren – einfach per Texteingabe oder Foto!

---

## ✅ Was du brauchst

- Einen kostenlosen [Netlify-Account](https://netlify.com) (keine Kreditkarte nötig)
- Einen kostenlosen [GitHub-Account](https://github.com) (empfohlen)
- Einen Anthropic API-Key von [console.anthropic.com](https://console.anthropic.com)

---

## 🚀 Schritt-für-Schritt Deployment

### Schritt 1 – Anthropic API-Key holen
1. Gehe auf [console.anthropic.com](https://console.anthropic.com)
2. Registriere dich oder melde dich an
3. Klicke auf **API Keys** → **Create Key**
4. Kopiere den Key (beginnt mit `sk-ant-...`) – du brauchst ihn gleich!

---

### Schritt 2 – Dateien auf GitHub hochladen

1. Gehe auf [github.com](https://github.com) und erstelle ein **neues Repository** (z.B. `makerkids`)
2. Klicke auf **"uploading an existing file"**
3. Lade **alle Dateien aus diesem Paket** hoch (Ordnerstruktur beibehalten!)
4. Klicke auf **"Commit changes"**

**Ordnerstruktur muss so aussehen:**
```
makerkids/
├── index.html
├── package.json
├── vite.config.js
├── netlify.toml
├── public/
│   └── favicon.svg
├── src/
│   ├── main.jsx
│   └── App.jsx
└── netlify/
    └── functions/
        └── claude.js
```

---

### Schritt 3 – Auf Netlify deployen

1. Gehe auf [app.netlify.com](https://app.netlify.com)
2. Klicke auf **"Add new site"** → **"Import an existing project"**
3. Wähle **GitHub** und dein `makerkids`-Repository aus
4. Die Build-Einstellungen werden automatisch aus `netlify.toml` erkannt:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Klicke auf **"Deploy site"**

---

### Schritt 4 – API-Key sicher hinterlegen

⚠️ **Wichtig:** Den API-Key NIEMALS direkt in den Code schreiben!

1. In Netlify: Gehe zu **Site configuration** → **Environment variables**
2. Klicke auf **"Add a variable"**
3. Key: `ANTHROPIC_API_KEY`
4. Value: Dein API-Key (z.B. `sk-ant-api03-...`)
5. Klicke **Save**
6. Gehe zu **Deploys** → **"Trigger deploy"** → **"Deploy site"**

✅ Fertig! Deine App ist jetzt live unter einer Netlify-URL wie `https://makerkids-abc123.netlify.app`

---

### Schritt 5 – Eigene Domain (optional)

Unter **Domain management** kannst du eine eigene Domain eintragen, z.B. `makerkids.deineschule.de`.

---

## 🔒 Datenschutz & Sicherheit (für Schulen)

- Der API-Key liegt auf dem Netlify-Server, **nicht im Browser** – Schüler können ihn nicht sehen
- Fotos werden direkt an die API gesendet und **nicht gespeichert**
- Texteingaben werden nur für die Generierung verwendet
- Für Schulen empfohlen: In den Netlify-Einstellungen unter **"Identity"** eine einfache Passwort-Absicherung einrichten

---

## 💰 Kosten

| Dienst | Kosten |
|--------|--------|
| Netlify Hosting | Kostenlos (Free Plan reicht) |
| Anthropic API | Ca. 0,003€ pro Generierung (sehr günstig) |

Bei 100 Generierungen pro Monat: ca. **0,30€** API-Kosten.

---

## 🛠️ Lokale Entwicklung (für Entwickler)

```bash
# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten
npm run dev

# Für lokale API-Tests: .env Datei erstellen
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env
```

---

## 📞 Support

Bei Fragen einfach ein GitHub Issue erstellen oder die Netlify-Dokumentation unter [docs.netlify.com](https://docs.netlify.com) konsultieren.
