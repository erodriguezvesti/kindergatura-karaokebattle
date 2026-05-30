// screens.jsx — Setup, Categorías, Tableros, Impresión
const { useState: useStateS } = React;

/* ============ SETUP — flujo guiado por pasos ============ */
// Conteo de canciones de la playlist. Determinista a partir del id.
// En producción se reemplaza por el total real que devuelve la API de Spotify.
function pseudoCount(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return 21 + (h % 58); // 21–78 canciones
}

const STEPS = ["Equipos", "Playlists", "Reglas"];

function SetupScreen({ config, setConfig, teams, setTeams, categories, onGenerate }) {
  const [step, setStep] = useStateS(0);
  const COLORS = window.KB.TEAM_COLORS;
  const usedColors = teams.map((t) => t.color);

  function addTeam() {
    const free = COLORS.find((c) => !usedColors.includes(c)) || COLORS[teams.length % COLORS.length];
    setTeams([...teams, { id: "t" + Date.now(), name: "", color: free, cells: [], marked: new Set(), wins: [] }]);
  }
  function updateTeam(id, patch) { setTeams(teams.map((t) => (t.id === id ? { ...t, ...patch } : t))); }
  function removeTeam(id) { setTeams(teams.filter((t) => t.id !== id)); }
  function toggleRule(rid) { setConfig({ ...config, rules: { ...config.rules, [rid]: !config.rules[rid] } }); }
  function setPlaylist(id, raw) {
    const parsed = parseSpotifyPlaylist(raw);
    updateTeam(id, { playlistRaw: raw, playlist: parsed, trackCount: parsed ? pseudoCount(parsed.id) : 0 });
  }

  const slots = config.size * config.size;
  const teamsOk = teams.length >= 2 && teams.every((t) => t.name.trim());
  const listsOk = teams.length >= 2 && teams.every((t) => t.playlist);
  const catsOk = categories.length >= (config.size % 2 ? slots - 1 : slots);
  const totalTracks = teams.reduce((s, t) => s + (t.trackCount || 0), 0);
  const connected = teams.filter((t) => t.playlist).length;

  const stepReady = [teamsOk, listsOk, catsOk][step];
  function next() { if (stepReady) setStep((s) => Math.min(2, s + 1)); }
  function back() { setStep((s) => Math.max(0, s - 1)); }

  return (
    <div className="screen-pad">
      <ScreenHeader eyebrow={"Paso " + (step + 1) + " de 3 · " + STEPS[step]} title="Nueva partida" />

      {/* progress */}
      <div className="row" style={{ gap: 6, marginBottom: 24 }}>
        {STEPS.map((s, i) => (
          <div key={s} onClick={() => i < step && setStep(i)} style={{ flex: 1, cursor: i < step ? "pointer" : "default" }}>
            <div style={{ height: 4, borderRadius: 3, background: i <= step ? "var(--accent)" : "var(--line)", transition: "background .25s ease" }} />
          </div>
        ))}
      </div>

      {/* ---- PASO 1 · EQUIPOS ---- */}
      {step === 0 && (
        <div>
          <div className="row between" style={{ marginBottom: 12 }}>
            <span className="eyebrow">Equipos · {teams.length}</span>
            <button className="btn btn-ghost btn-sm" onClick={addTeam}>+ Agregar</button>
          </div>
          <div className="stack" style={{ gap: 10 }}>
            {teams.map((t) => (
              <div key={t.id} className="card" style={{ padding: 12 }}>
                <div className="row" style={{ gap: 10 }}>
                  <TeamDot color={t.color} />
                  <input className="input" style={{ flex: 1 }} placeholder="Nombre del equipo"
                         value={t.name} onChange={(e) => updateTeam(t.id, { name: e.target.value })} />
                  <button className="btn btn-ghost btn-icon" onClick={() => removeTeam(t.id)} aria-label="Eliminar">✕</button>
                </div>
                <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  {COLORS.map((c) => (
                    <button key={c} onClick={() => updateTeam(t.id, { color: c })} aria-label={c}
                            style={{ width: 26, height: 26, borderRadius: "50%", cursor: "pointer", background: tcVar(c),
                                     border: t.color === c ? "2px solid var(--text)" : "2px solid transparent",
                                     boxShadow: t.color === c ? "0 0 10px " + tcVar(c) : "none" }} />
                  ))}
                </div>
              </div>
            ))}
            {teams.length < 2 && <p className="subtitle" style={{ fontSize: 13 }}>Agrega al menos 2 equipos.</p>}
          </div>
        </div>
      )}

      {/* ---- PASO 2 · PLAYLISTS ---- */}
      {step === 1 && (
        <div>
          <p className="subtitle" style={{ fontSize: 13.5, marginBottom: 18, marginTop: -6 }}>
            Cada equipo sugiere su playlist de Spotify. De ahí sale el pool de canciones de la partida.
          </p>
          <div className="stack" style={{ gap: 10, marginBottom: 22 }}>
            {teams.map((t) => (
              <div key={t.id} className="card" style={{ padding: 14, "--tc": tcVar(t.color),
                     borderColor: t.playlist ? "color-mix(in oklch, var(--spotify) 35%, var(--line-soft))" : "var(--line-soft)" }}>
                <div className="row between" style={{ marginBottom: 11 }}>
                  <div className="row" style={{ gap: 10, minWidth: 0 }}>
                    <TeamDot color={t.color} />
                    <span style={{ fontWeight: 600, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name || "Equipo"}</span>
                  </div>
                  {t.playlist && (
                    <span className="chip mono" style={{ color: "var(--spotify)", borderColor: "color-mix(in oklch, var(--spotify) 45%, transparent)", flexShrink: 0 }}>
                      ♫ {t.trackCount} canciones
                    </span>
                  )}
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <span style={{ flex: "0 0 auto", color: "var(--spotify)", fontSize: 18 }}>♫</span>
                  <input className="input" style={{ flex: 1, fontSize: 13.5 }}
                         placeholder="open.spotify.com/playlist/…"
                         value={t.playlistRaw || ""} onChange={(e) => setPlaylist(t.id, e.target.value)} />
                </div>
                {t.playlistRaw && !t.playlist && (
                  <div className="row" style={{ gap: 6, marginTop: 9, paddingLeft: 26 }}>
                    <span className="chip mono" style={{ color: "var(--rose)", borderColor: "color-mix(in oklch, var(--rose) 45%, transparent)" }}>Link no reconocido — pega el enlace de la playlist</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* resumen del pool */}
          <div className="card" style={{ padding: 18, textAlign: "center", borderColor: "color-mix(in oklch, var(--spotify) 30%, var(--line))",
                 background: "color-mix(in oklch, var(--spotify) 7%, var(--surface))" }}>
            <div className="mono glow-text" style={{ fontSize: 46, fontWeight: 700, color: "var(--spotify)", lineHeight: 1, "--accent": "var(--spotify)" }}>{totalTracks}</div>
            <div style={{ fontWeight: 600, fontSize: 14, marginTop: 6 }}>canciones en el pool</div>
            <div className="subtitle mono" style={{ fontSize: 11.5, marginTop: 6 }}>{connected}/{teams.length} playlists conectadas</div>
          </div>
          <p className="subtitle" style={{ fontSize: 11.5, textAlign: "center", marginTop: 12, lineHeight: 1.5 }}>
            En la partida el host reproduce canciones del pool y se abren directo en Spotify.
          </p>
        </div>
      )}

      {/* ---- PASO 3 · MODO Y REGLAS ---- */}
      {step === 2 && (
        <div>
          <span className="eyebrow">Modo de juego</span>
          <div style={{ marginTop: 10, marginBottom: 14 }}>
            <Segmented value={config.mode} onChange={(v) => setConfig({ ...config, mode: v })}
              options={[{ value: "clasico", label: "Clásico" }, { value: "puntaje", label: "Por puntaje" }]} />
          </div>
          <p className="subtitle" style={{ fontSize: 13, marginBottom: 24 }}>
            {config.mode === "clasico"
              ? "Gana quien complete una línea, columna, diagonal o el cartón completo."
              : "Cada casilla suma según dificultad (1 / 2 / 3 pts). Gana el mayor puntaje."}
          </p>

          <span className="eyebrow">Tamaño del tablero</span>
          <div style={{ marginTop: 10, marginBottom: 6 }}>
            <Segmented value={config.size} onChange={(v) => setConfig({ ...config, size: v })}
              options={[{ value: 4, label: "4 × 4 · rápida" }, { value: 5, label: "5 × 5 · fiesta" }]} />
          </div>
          <p className="subtitle" style={{ fontSize: 13, marginBottom: 24 }}>
            {config.size === 5 ? "25 casillas con centro 🎤 libre." : "16 casillas, sin casilla libre."}
          </p>

          <span className="eyebrow">Reglas opcionales</span>
          <div className="stack" style={{ gap: 0, marginTop: 12, marginBottom: 8 }}>
            {window.KB.RULES.map((r, i) => (
              <div key={r.id}>
                <div className="row between" style={{ alignItems: "flex-start", gap: 14, padding: "14px 0" }}>
                  <div className="stack" style={{ gap: 3, flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{r.title}</span>
                    <span className="subtitle" style={{ fontSize: 12.5 }}>{r.desc}</span>
                  </div>
                  <Switch on={!!config.rules[r.id]} onChange={() => toggleRule(r.id)} />
                </div>
                {i < window.KB.RULES.length - 1 && <hr className="divider" style={{ margin: 0 }} />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- NAV ---- */}
      <div className="row" style={{ gap: 10, marginTop: 26 }}>
        {step > 0 && <button className="btn btn-ghost" onClick={back} style={{ flex: "0 0 auto" }}>← Atrás</button>}
        {step < 2
          ? <button className="btn btn-primary block" disabled={!stepReady} onClick={next} style={{ padding: 15 }}>Siguiente →</button>
          : <button className="btn btn-primary block" disabled={!stepReady} onClick={onGenerate} style={{ padding: 15 }}>Generar tableros únicos →</button>}
      </div>
      {!stepReady && (
        <p className="subtitle" style={{ fontSize: 12, textAlign: "center", marginTop: 12 }}>
          {step === 0 ? "Agrega al menos 2 equipos con nombre."
            : step === 1 ? "Conecta una playlist de Spotify para cada equipo."
            : "Faltan categorías para este tamaño de tablero."}
        </p>
      )}
    </div>
  );
}

/* ============ CATEGORÍAS ============ */
function CategoriesScreen({ categories, setCategories }) {
  const [filter, setFilter] = useStateS(0);
  const [editing, setEditing] = useStateS(null); // category or {new:true}
  const counts = { 1: 0, 2: 0, 3: 0 };
  categories.forEach((c) => counts[c.dif]++);
  const list = categories.filter((c) => !filter || c.dif === filter);

  function save(cat) {
    if (cat.id) setCategories(categories.map((c) => (c.id === cat.id ? cat : c)));
    else setCategories([...categories, { ...cat, id: "c" + Date.now() }]);
    setEditing(null);
  }
  function del(id) { setCategories(categories.filter((c) => c.id !== id)); setEditing(null); }

  const difColor = { 1: "var(--lime)", 2: "var(--amber)", 3: "var(--rose)" };

  return (
    <div className="screen-pad">
      <ScreenHeader eyebrow={categories.length + " categorías"} title="Banco de categorías"
        action={<button className="btn btn-primary btn-sm" onClick={() => setEditing({ label: "", dif: 1 })}>+ Nueva</button>} />

      <div className="row" style={{ gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {[[0, "Todas", categories.length], [1, "Fácil", counts[1]], [2, "Media", counts[2]], [3, "Difícil", counts[3]]].map(([v, l, n]) => (
          <button key={v} className={"chip" + (filter === v ? " on" : "")} onClick={() => setFilter(v)}
                  style={filter === v ? { "--tc": v ? difColor[v] : "var(--accent)" } : {}}>
            {l} · {n}
          </button>
        ))}
      </div>

      <div className="stack" style={{ gap: 8 }}>
        {list.map((c) => (
          <div key={c.id} className="card row between" style={{ padding: "13px 14px", cursor: "pointer" }} onClick={() => setEditing(c)}>
            <div className="row" style={{ gap: 11 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: difColor[c.dif], flex: "0 0 8px" }} />
              <span style={{ fontSize: 14.5, fontWeight: 500 }}>{c.label}</span>
            </div>
            <DifBadge dif={c.dif} />
          </div>
        ))}
      </div>

      <CategoryEditor cat={editing} onSave={save} onDelete={del} onClose={() => setEditing(null)} />
    </div>
  );
}

function CategoryEditor({ cat, onSave, onClose, onDelete }) {
  const [label, setLabel] = useStateS("");
  const [dif, setDif] = useStateS(1);
  React.useEffect(() => { if (cat) { setLabel(cat.label || ""); setDif(cat.dif || 1); } }, [cat]);
  if (!cat) return null;
  return (
    <Sheet open={!!cat} onClose={onClose}>
      <h2 className="title" style={{ marginBottom: 18 }}>{cat.id ? "Editar categoría" : "Nueva categoría"}</h2>
      <span className="eyebrow">Categoría musical</span>
      <input className="input" style={{ margin: "10px 0 20px" }} placeholder="Ej: Canción de despecho" value={label}
             onChange={(e) => setLabel(e.target.value)} autoFocus />
      <span className="eyebrow">Dificultad / puntaje</span>
      <div style={{ marginTop: 10, marginBottom: 24 }}>
        <Segmented value={dif} onChange={setDif}
          options={[{ value: 1, label: "Fácil · 1" }, { value: 2, label: "Media · 2" }, { value: 3, label: "Difícil · 3" }]} />
      </div>
      <div className="row" style={{ gap: 10 }}>
        {cat.id && <button className="btn btn-ghost btn-icon" onClick={() => onDelete(cat.id)} aria-label="Eliminar" style={{ color: "var(--rose)" }}>🗑</button>}
        <button className="btn btn-primary block" disabled={!label.trim()} onClick={() => onSave({ ...cat, label: label.trim(), dif })}>
          Guardar
        </button>
      </div>
    </Sheet>
  );
}

/* ============ TABLEROS ============ */
function BoardsScreen({ teams, config, onRegen, onRegenAll, onPrint, onStart }) {
  const [active, setActive] = useStateS(0);
  const team = teams[active];
  if (!team) return <div className="screen-pad"><p className="subtitle">Genera tableros desde Configurar.</p></div>;

  return (
    <div className="screen-pad">
      <ScreenHeader eyebrow={config.size + "×" + config.size + " · " + teams.length + " tableros"} title="Tableros"
        action={<button className="btn btn-ghost btn-sm" onClick={onRegenAll}>↻ Todos</button>} />

      <div className="row" style={{ gap: 8, marginBottom: 18, overflowX: "auto", paddingBottom: 4 }}>
        {teams.map((t, i) => (
          <button key={t.id} className={"chip" + (active === i ? " on" : "")} onClick={() => setActive(i)}
                  style={{ "--tc": tcVar(t.color), flexShrink: 0 }}>
            <span className="dot" style={{ "--tc": active === i ? "currentColor" : tcVar(t.color), width: 7, height: 7 }} />
            {t.name}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 14, "--tc": tcVar(team.color) }}>
        <div className="row between" style={{ marginBottom: 14 }}>
          <div className="row" style={{ gap: 9 }}>
            <TeamDot color={team.color} />
            <span style={{ fontWeight: 600, fontSize: 16 }}>{team.name}</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => onRegen(team.id)}>↻ Regenerar</button>
        </div>
        <BoardGrid cells={team.cells} size={config.size} marked={new Set()} color={team.color} />
      </div>

      <div className="row" style={{ gap: 10, marginTop: 22 }}>
        <button className="btn btn-ghost block" onClick={onPrint}>🖨 Imprimir todos</button>
        <button className="btn btn-primary block" onClick={onStart}>Empezar partida</button>
      </div>
      <p className="subtitle" style={{ fontSize: 12.5, textAlign: "center", marginTop: 14 }}>
        Cada tablero es único. Imprime en papel para repartir, o juega marcando desde el teléfono.
      </p>
    </div>
  );
}

/* ============ IMPRESIÓN (render into #print-root) ============ */
function PrintSheets({ teams, config }) {
  const difColor = { 1: "#16a34a", 2: "#d97706", 3: "#e11d48" };
  return (
    <div style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#111" }}>
      {teams.map((team) => (
        <div key={team.id} style={{ pageBreakAfter: "always", padding: "4mm 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "6mm", borderBottom: "2px solid #111", paddingBottom: "3mm" }}>
            <div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "10pt", letterSpacing: "0.18em", textTransform: "uppercase", color: "#666" }}>Karaoke Battle · {config.size}×{config.size}</div>
              <div style={{ fontSize: "26pt", fontWeight: 700, letterSpacing: "-0.02em" }}>{team.name}</div>
            </div>
            <div style={{ width: "16mm", height: "16mm", border: "2px solid #111", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20pt" }}>🎤</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${config.size}, 1fr)`, gap: "3mm" }}>
            {team.cells.map((cell, i) => (
              <div key={i} style={{
                aspectRatio: "1 / 1", border: "1.5px solid #111", borderRadius: "10px",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                textAlign: "center", padding: "3mm", position: "relative",
                background: cell.free ? "#f3f3f3" : "#fff",
              }}>
                {!cell.free && config.mode === "puntaje" && (
                  <span style={{ position: "absolute", top: "1.5mm", right: "2mm", fontFamily: "'Space Mono', monospace", fontSize: "8pt", fontWeight: 700, color: difColor[cell.dif] }}>{cell.dif}pt</span>
                )}
                <span style={{ fontSize: config.size === 5 ? "9.5pt" : "11pt", fontWeight: 600, lineHeight: 1.18 }}>
                  {cell.free ? "🎤 LIBRE" : cell.label}
                </span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "5mm", fontFamily: "'Space Mono', monospace", fontSize: "8.5pt", color: "#888", textAlign: "center" }}>
            Marca una categoría reclamándola y validándola… cantando. 🎶
          </div>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { SetupScreen, CategoriesScreen, BoardsScreen, PrintSheets, pseudoCount });
