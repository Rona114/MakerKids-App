import { useState, useRef, useCallback } from "react";

const COLORS = {
  teal: "#2DD4BF",
  tealDark: "#0F766E",
  tealLight: "#CCFBF1",
  amber: "#F59E0B",
  amberLight: "#FEF3C7",
  blue: "#3B82F6",
  blueLight: "#EFF6FF",
  purple: "#8B5CF6",
  purpleLight: "#F5F3FF",
  coral: "#F97316",
  coralLight: "#FFF7ED",
  bg: "#F0FDF9",
  card: "#FFFFFF",
  text: "#134E4A",
  muted: "#6B7280",
  border: "#D1FAE5",
};

const AGE_GROUPS = [
  { label: "6–8 Jahre", emoji: "🌱", complexity: "sehr einfach", hint: "Ein einfaches Herz oder Stern?" },
  { label: "9–11 Jahre", emoji: "🚀", complexity: "einfach", hint: "Ein kleines Tierchen oder Fahrzeug?" },
  { label: "12–14 Jahre", emoji: "⚙️", complexity: "mittel", hint: "Ein Schlüsselanhänger oder Nameplate?" },
  { label: "15–16 Jahre", emoji: "🔬", complexity: "komplex", hint: "Ein Zahnrad oder ein Gehäuse?" },
];

const OUTPUT_FORMATS = [
  { id: "svg", label: "SVG", sub: "Lasercutter", icon: "✂️", color: COLORS.amber, lightColor: COLORS.amberLight },
  { id: "stl_openscad", label: "STL", sub: "3D-Druck", icon: "🖨️", color: COLORS.blue, lightColor: COLORS.blueLight },
  { id: "both", label: "Beides", sub: "SVG + STL", icon: "✨", color: COLORS.purple, lightColor: COLORS.purpleLight },
];

const EXAMPLE_IDEAS = [
  "Ein kleiner Drache mit Flügeln",
  "Mein Name als 3D-Buchstaben",
  "Ein Herz mit Blumen drumherum",
  "Ein Raketenmodell",
  "Eine Schildkröte von oben",
  "Ein Zahnrad mit 8 Zähnen",
];

const systemPromptSVG = `Du bist ein kreativer 3D/2D-Design-Assistent für Kinder und Jugendliche (6–16 Jahre). 
Du generierst SVG-Code für Lasercutter und OpenSCAD-Code für 3D-Drucker.

WICHTIG: Antworte NUR mit einem JSON-Objekt, kein Markdown, keine Backticks, kein Text drumherum.

Format:
{
  "svg": "<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'>...</svg>",
  "openscad": "// OpenSCAD code here\\nlinear_extrude(5) { ... }",
  "description": "Kurze deutsche Beschreibung was generiert wurde (max 2 Sätze)",
  "tip": "Ein kurzer Tipp für den Druck/Schnitt auf Deutsch"
}

SVG-Regeln:
- viewBox="0 0 200 200", keine Größenangaben in px
- Nur einfache Formen: rect, circle, ellipse, polygon, path
- Stroke-based Design für Lasercutter (stroke="black", fill="none" für Schnittlinien, fill="red" für Gravur)
- Kindgerecht, erkennbar, nicht zu komplex
- Komplexität anpassen: "sehr einfach" = 3-5 Formen, "komplex" = 10-20 Formen

OpenSCAD-Regeln:
- Immer linear_extrude() verwenden, Höhe 3-5mm
- Einfache parametrische Formen
- Kommentare auf Deutsch
- Kindgerecht und druckbar (keine überhängenden Teile wenn möglich)`;

export default function MakerKidsApp() {
  const [ageGroup, setAgeGroup] = useState(1);
  const [inputMode, setInputMode] = useState("text");
  const [description, setDescription] = useState("");
  const [outputFormat, setOutputFormat] = useState("svg");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("preview");
  const [uploadedImage, setUploadedImage] = useState(null);
  const [uploadedImageBase64, setUploadedImageBase64] = useState(null);
  const [mascotAnim, setMascotAnim] = useState(false);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const selectedAge = AGE_GROUPS[ageGroup];

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setUploadedImage(url);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target.result.split(",")[1];
      setUploadedImageBase64(b64);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = useCallback(async () => {
    const prompt = description.trim();
    if (!prompt && !uploadedImageBase64) {
      setError("Bitte beschreibe dein Objekt oder lade ein Foto hoch!");
      return;
    }
    setError(null);
    setIsGenerating(true);
    setResult(null);
    setMascotAnim(true);

    const userContent = [];
    if (uploadedImageBase64) {
      userContent.push({
        type: "image",
        source: { type: "base64", media_type: "image/jpeg", data: uploadedImageBase64 },
      });
    }
    const formatNote =
      outputFormat === "svg"
        ? "Generiere nur SVG (Lasercutter-optimiert). OpenSCAD kann leer sein."
        : outputFormat === "stl_openscad"
        ? "Generiere nur OpenSCAD (3D-Druck). SVG kann eine vereinfachte 2D-Version sein."
        : "Generiere beides: SVG für Lasercutter UND OpenSCAD für 3D-Druck.";

    const userText = `Altersgruppe: ${selectedAge.label} (Komplexität: ${selectedAge.complexity})
Gewünschtes Objekt: ${prompt || "Basierend auf dem hochgeladenen Bild"}
Ausgabeformat: ${formatNote}

Bitte generiere eine kindgerechte Datei.`;

    userContent.push({ type: "text", text: userText });

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemPromptSVG,
          messages: [{ role: "user", content: userContent }],
        }),
      });

      const data = await response.json();
      const raw = data.content?.map((b) => b.text || "").join("");
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setResult(parsed);
      setActiveTab("preview");
    } catch (err) {
      setError("Ups! Da ist etwas schiefgelaufen. Bitte versuche es nochmal.");
    } finally {
      setIsGenerating(false);
      setTimeout(() => setMascotAnim(false), 1000);
    }
  }, [description, uploadedImageBase64, outputFormat, selectedAge]);

  const downloadFile = (content, filename, mime) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const safeName = (description || "objekt").replace(/\s+/g, "_").toLowerCase().slice(0, 20);

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, fontFamily: "'Nunito', 'Segoe UI', sans-serif", padding: "0 0 40px" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Fredoka+One&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${COLORS.tealDark} 0%, #065F46 100%)`, padding: "20px 24px 28px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, background: "rgba(255,255,255,0.05)", borderRadius: "50%" }} />
        <div style={{ position: "absolute", bottom: -30, left: 60, width: 80, height: 80, background: "rgba(255,255,255,0.05)", borderRadius: "50%" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 14, position: "relative" }}>
          <div style={{ width: 52, height: 52, background: COLORS.teal, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>🖨️</div>
          <div>
            <div style={{ fontFamily: "'Fredoka One', cursive", fontSize: 28, color: "white", letterSpacing: 0.5 }}>MakerKids</div>
            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, fontWeight: 600 }}>Deine Idee – dein Objekt!</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 500, margin: "0 auto", padding: "0 16px" }}>

        {/* Mascot */}
        <div style={{
          background: "white", borderRadius: 20, padding: "16px 18px", marginTop: 20, marginBottom: 18,
          display: "flex", alignItems: "flex-start", gap: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          border: `1px solid ${COLORS.border}`,
        }}>
          <div style={{
            width: 44, height: 44, background: COLORS.tealLight, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0,
            transform: mascotAnim ? "rotate(15deg) scale(1.15)" : "none",
            transition: "transform 0.3s ease",
          }}>🤖</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: COLORS.tealDark, marginBottom: 3 }}>Maxy sagt:</div>
            <div style={{ fontSize: 14, color: COLORS.text, lineHeight: 1.5 }}>
              {isGenerating
                ? "Ich bastle gerade deine Datei... ⚙️ Das dauert einen Moment!"
                : result
                ? "Super! Deine Datei ist fertig! Du kannst sie herunterladen. 🎉"
                : `${selectedAge.hint} Beschreib mir deine Idee – ich mache eine Datei daraus!`}
            </div>
          </div>
        </div>

        {/* Age selector */}
        <SectionLabel>👤 Wie alt bist du?</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
          {AGE_GROUPS.map((g, i) => (
            <button key={i} onClick={() => setAgeGroup(i)} style={{
              padding: "10px 12px", borderRadius: 14, border: `2px solid ${i === ageGroup ? COLORS.teal : COLORS.border}`,
              background: i === ageGroup ? COLORS.tealLight : "white",
              cursor: "pointer", textAlign: "left", transition: "all 0.15s",
            }}>
              <div style={{ fontSize: 18 }}>{g.emoji}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: i === ageGroup ? COLORS.tealDark : COLORS.text }}>{g.label}</div>
            </button>
          ))}
        </div>

        {/* Input mode tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {[{ id: "text", label: "✏️ Beschreiben" }, { id: "photo", label: "📷 Foto" }].map(m => (
            <button key={m.id} onClick={() => setInputMode(m.id)} style={{
              padding: "9px 18px", borderRadius: 12, border: `2px solid ${inputMode === m.id ? COLORS.teal : COLORS.border}`,
              background: inputMode === m.id ? COLORS.tealLight : "white",
              color: inputMode === m.id ? COLORS.tealDark : COLORS.muted,
              fontWeight: 700, fontSize: 14, cursor: "pointer",
            }}>{m.label}</button>
          ))}
        </div>

        {/* Input area */}
        <div style={{ background: "white", borderRadius: 18, border: `1.5px solid ${COLORS.border}`, padding: 16, marginBottom: 18, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          {inputMode === "text" ? (
            <>
              <textarea
                ref={textareaRef}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={`z.B.: ${EXAMPLE_IDEAS[Math.floor(Math.random() * EXAMPLE_IDEAS.length)]}`}
                rows={4}
                style={{
                  width: "100%", border: "none", outline: "none", resize: "none",
                  fontSize: 16, color: COLORS.text, fontFamily: "inherit", lineHeight: 1.6,
                  background: "transparent",
                }}
              />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: 11, color: COLORS.muted, fontWeight: 700, width: "100%", marginBottom: 4 }}>IDEEN:</div>
                {EXAMPLE_IDEAS.slice(0, 3).map((idea, i) => (
                  <button key={i} onClick={() => setDescription(idea)} style={{
                    padding: "4px 10px", borderRadius: 20, border: `1px solid ${COLORS.border}`,
                    background: COLORS.bg, color: COLORS.tealDark, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  }}>{idea}</button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${COLORS.teal}`, borderRadius: 14, padding: "24px 16px",
                  textAlign: "center", cursor: "pointer", background: COLORS.tealLight, marginBottom: uploadedImage ? 12 : 0,
                }}
              >
                {uploadedImage ? (
                  <img src={uploadedImage} alt="Upload" style={{ maxHeight: 140, borderRadius: 10 }} />
                ) : (
                  <>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>📸</div>
                    <div style={{ color: COLORS.tealDark, fontWeight: 700, fontSize: 14 }}>Foto hier auswählen</div>
                    <div style={{ color: COLORS.muted, fontSize: 12, marginTop: 4 }}>JPG, PNG – bis 5 MB</div>
                  </>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
              {uploadedImage && (
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Optional: Was zeigt das Foto? Was soll daraus werden?"
                  rows={2}
                  style={{ width: "100%", border: "none", outline: "none", resize: "none", fontSize: 14, color: COLORS.text, fontFamily: "inherit", background: "transparent" }}
                />
              )}
            </>
          )}
        </div>

        {/* Output format */}
        <SectionLabel>📁 Was soll generiert werden?</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 22 }}>
          {OUTPUT_FORMATS.map(f => (
            <button key={f.id} onClick={() => setOutputFormat(f.id)} style={{
              padding: "12px 8px", borderRadius: 14, border: `2px solid ${outputFormat === f.id ? f.color : COLORS.border}`,
              background: outputFormat === f.id ? f.lightColor : "white",
              cursor: "pointer", textAlign: "center",
            }}>
              <div style={{ fontSize: 22 }}>{f.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: outputFormat === f.id ? f.color : COLORS.text }}>{f.label}</div>
              <div style={{ fontSize: 11, color: COLORS.muted }}>{f.sub}</div>
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "12px 16px", marginBottom: 16, color: "#B91C1C", fontSize: 14, fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          style={{
            width: "100%", padding: "16px", borderRadius: 18,
            background: isGenerating ? "#9CA3AF" : `linear-gradient(135deg, ${COLORS.teal} 0%, ${COLORS.tealDark} 100%)`,
            color: "white", border: "none", fontSize: 18, fontWeight: 800,
            cursor: isGenerating ? "not-allowed" : "pointer",
            boxShadow: isGenerating ? "none" : "0 4px 20px rgba(13,148,136,0.4)",
            transition: "all 0.2s", letterSpacing: 0.3,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          }}
        >
          {isGenerating ? (
            <><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⚙️</span> Wird gebaut...</>
          ) : (
            <><span>✨</span> Datei generieren!</>
          )}
        </button>

        {/* Result */}
        {result && (
          <div style={{ marginTop: 24, background: "white", borderRadius: 20, border: `1.5px solid ${COLORS.border}`, overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.07)" }}>
            <div style={{ background: COLORS.tealLight, padding: "14px 18px", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>🎉</span>
              <div>
                <div style={{ fontWeight: 800, color: COLORS.tealDark, fontSize: 15 }}>Fertig!</div>
                <div style={{ fontSize: 12, color: COLORS.muted }}>{result.description}</div>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: `1px solid ${COLORS.border}` }}>
              {[
                result.svg && { id: "preview", label: "👁️ Vorschau" },
                result.svg && { id: "svg", label: "SVG Code" },
                result.openscad && { id: "openscad", label: "OpenSCAD" },
              ].filter(Boolean).map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                  flex: 1, padding: "10px 8px", border: "none", background: "transparent",
                  borderBottom: `3px solid ${activeTab === tab.id ? COLORS.teal : "transparent"}`,
                  color: activeTab === tab.id ? COLORS.tealDark : COLORS.muted,
                  fontWeight: activeTab === tab.id ? 800 : 600, fontSize: 13, cursor: "pointer",
                }}>{tab.label}</button>
              ))}
            </div>

            <div style={{ padding: 18 }}>
              {activeTab === "preview" && result.svg && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ background: COLORS.bg, borderRadius: 14, padding: 16, display: "inline-block", width: "100%" }}
                    dangerouslySetInnerHTML={{ __html: result.svg.replace(/<svg/, '<svg style="max-width:100%;height:auto;"') }}
                  />
                </div>
              )}
              {activeTab === "svg" && result.svg && (
                <pre style={{ fontSize: 11, background: "#1E293B", color: "#E2E8F0", padding: 14, borderRadius: 12, overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{result.svg}</pre>
              )}
              {activeTab === "openscad" && result.openscad && (
                <pre style={{ fontSize: 11, background: "#1E293B", color: "#E2E8F0", padding: 14, borderRadius: 12, overflow: "auto", whiteSpace: "pre-wrap" }}>{result.openscad}</pre>
              )}

              {result.tip && (
                <div style={{ background: COLORS.amberLight, borderRadius: 12, padding: "10px 14px", marginTop: 14, fontSize: 13, color: "#92400E", fontWeight: 600 }}>
                  💡 {result.tip}
                </div>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
                {result.svg && (
                  <button onClick={() => downloadFile(result.svg, `${safeName}.svg`, "image/svg+xml")} style={{
                    flex: 1, padding: "11px", borderRadius: 12, border: `2px solid ${COLORS.amber}`,
                    background: COLORS.amberLight, color: "#92400E", fontWeight: 800, fontSize: 14, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}>✂️ SVG herunterladen</button>
                )}
                {result.openscad && (
                  <button onClick={() => downloadFile(result.openscad, `${safeName}.scad`, "text/plain")} style={{
                    flex: 1, padding: "11px", borderRadius: 12, border: `2px solid ${COLORS.blue}`,
                    background: COLORS.blueLight, color: "#1E40AF", fontWeight: 800, fontSize: 14, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}>🖨️ SCAD herunterladen</button>
                )}
              </div>

              <button onClick={() => { setResult(null); setDescription(""); setUploadedImage(null); }} style={{
                width: "100%", marginTop: 10, padding: "10px", borderRadius: 12, border: `1px solid ${COLORS.border}`,
                background: "white", color: COLORS.muted, fontWeight: 700, fontSize: 14, cursor: "pointer",
              }}>🔄 Neue Idee ausprobieren</button>
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 28, color: COLORS.muted, fontSize: 12 }}>
          MakerKids · Powered by Claude AI · Viel Spaß beim Basteln! 🎨
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        button { transition: all 0.15s ease; }
        button:active { transform: scale(0.97); }
        textarea::placeholder { color: #9CA3AF; }
      `}</style>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 800, color: COLORS.tealDark, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.8 }}>
      {children}
    </div>
  );
}
