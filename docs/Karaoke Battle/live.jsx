// live.jsx — Partida en vivo, validación, marcador y pantalla de ganador
const { useState: useStateL, useEffect: useEffectL, useRef: useRefL } = React;

/* ============ PARTIDA EN VIVO ============ */
function LiveScreen({ teams, config, round, track, onNextSong, markCell, celebration, clearCelebration }) {
  const [flow, setFlow] = useStateL(null); // {phase, teamId, cellIdx, challenge, stealFrom}
  const [showLists, setShowLists] = useStateL(false);
  const close = () => setFlow(null);

  const claimingTeam = flow ? teams.find((t) => t.id === flow.teamId) : null;
  const playlistTeams = teams.filter((t) => t.playlist);

  function openClaim(teamId) { setFlow({ phase: "claim", teamId }); }
  function pickCell(idx) { setFlow({ ...flow, phase: "validate", cellIdx: idx }); }
  function validate(success) {
    if (success && flow) markCell(flow.teamId, flow.cellIdx);
    if (!success && config.rules.steal) { setFlow({ phase: "steal", failedTeam: flow.teamId, cellIdx: flow.cellIdx }); return; }
    close();
  }
  function steal(teamId) { setFlow({ phase: "claim", teamId, stealing: true }); }

  return (
    <div className="screen-pad">
      <div className="row between" style={{ marginTop: 8, marginBottom: 18 }}>
        <div className="stack" style={{ gap: 4 }}>
          <span className="eyebrow">{config.mode === "clasico" ? "Modo clásico" : "Por puntaje"}</span>
          <h1 className="title">En vivo</h1>
        </div>
        <GameTimer />
      </div>

      {/* Canción sonando */}
      {track ? (
        <div className="card glass" style={{ padding: 18, marginBottom: 22 }}>
          <div className="row between" style={{ marginBottom: 14 }}>
            <span className="eyebrow" style={{ color: "var(--spotify)" }}>♫ Sonando · Spotify</span>
            <span className="mono" style={{ fontSize: 13, color: "var(--text-dim)" }}>#{String(round).padStart(2, "0")}</span>
          </div>
          <div className="row" style={{ gap: 14, alignItems: "center", marginBottom: 16 }}>
            <Equalizer />
            <div className="stack" style={{ gap: 3, flex: 1, minWidth: 0 }}>
              <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{track.t}</span>
              <span className="subtitle" style={{ fontSize: 13 }}>{track.a}</span>
            </div>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <a className="btn block" href={spotifySearchUrl(track)} target="_blank" rel="noopener noreferrer"
               style={{ background: "var(--spotify)", color: "oklch(0.16 0.02 295)", border: "none", textDecoration: "none", flex: 2 }}>
              ▶ Reproducir
            </a>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onNextSong}>⏭ Otra</button>
          </div>
          <button className="btn btn-ghost btn-sm block" style={{ marginTop: 10, color: "var(--text-dim)" }} onClick={() => setShowLists(true)}>
            Ver playlists de los equipos ({playlistTeams.length})
          </button>
        </div>
      ) : (
        <div className="card glass" style={{ padding: 18, marginBottom: 22 }}>
          <div className="row between" style={{ marginBottom: 14 }}>
            <span className="eyebrow">Ronda</span>
            <span className="mono" style={{ fontSize: 13, color: "var(--text-dim)" }}>#{String(round).padStart(2, "0")}</span>
          </div>
          <div className="row" style={{ gap: 14, alignItems: "center" }}>
            <Equalizer />
            <div className="stack" style={{ gap: 3, flex: 1 }}>
              <span style={{ fontWeight: 600, fontSize: 16 }}>Reproduce un fragmento</span>
              <span className="subtitle" style={{ fontSize: 12.5 }}>Aleatorio de tu playlist. Los equipos reclaman.</span>
            </div>
          </div>
          <button className="btn btn-primary block" style={{ marginTop: 16 }} onClick={onNextSong}>▶ Siguiente canción</button>
        </div>
      )}

      {/* Equipos — toca para reclamar */}
      <span className="eyebrow">Equipos · toca para reclamar casilla</span>
      <div className="stack" style={{ gap: 10, marginTop: 12 }}>
        {teams.map((t) => (
          <TeamLiveCard key={t.id} team={t} config={config} onClick={() => openClaim(t.id)} />
        ))}
      </div>

      {/* CLAIM sheet */}
      <Sheet open={flow && flow.phase === "claim"} onClose={close}>
        {claimingTeam && (
          <div>
            <div className="row between" style={{ marginBottom: 4 }}>
              <div className="row" style={{ gap: 9 }}>
                <TeamDot color={claimingTeam.color} />
                <h2 className="title">{claimingTeam.name}</h2>
              </div>
              {flow.stealing && <span className="chip" style={{ "--tc": "var(--amber)", color: "var(--amber)" }}>Robo · otra categoría</span>}
            </div>
            <p className="subtitle" style={{ fontSize: 13, marginBottom: 16 }}>Toca la categoría que reclaman para esta canción.</p>
            <BoardGrid cells={claimingTeam.cells} size={config.size} marked={claimingTeam.marked}
                       color={claimingTeam.color} onCellTap={pickCell} />
          </div>
        )}
      </Sheet>

      {/* VALIDATE sheet */}
      <ValidateSheet open={flow && flow.phase === "validate"} flow={flow} team={claimingTeam}
                     config={config} onValidate={validate} onClose={close} />

      {/* STEAL sheet */}
      <Sheet open={flow && flow.phase === "steal"} onClose={close}>
        <h2 className="title" style={{ marginBottom: 6 }}>Robo de casilla</h2>
        <p className="subtitle" style={{ fontSize: 13, marginBottom: 18 }}>El equipo falló. Otro puede robar la canción usando <b>otra</b> categoría de su tablero.</p>
        <div className="stack" style={{ gap: 10 }}>
          {teams.filter((t) => flow && t.id !== flow.failedTeam).map((t) => (
            <button key={t.id} className="card row between" style={{ padding: "14px 16px", cursor: "pointer", border: "1px solid var(--line)" }} onClick={() => steal(t.id)}>
              <div className="row" style={{ gap: 10 }}><TeamDot color={t.color} /><span style={{ fontWeight: 600 }}>{t.name}</span></div>
              <span className="util">robar →</span>
            </button>
          ))}
        </div>
        <button className="btn btn-ghost block" style={{ marginTop: 16 }} onClick={close}>Nadie roba</button>
      </Sheet>

      {/* CELEBRATION */}
      {celebration && <WinOverlay celebration={celebration} onClose={clearCelebration} />}

      {/* PLAYLISTS sheet */}
      <Sheet open={showLists} onClose={() => setShowLists(false)}>
        <h2 className="title" style={{ marginBottom: 4 }}><span style={{ color: "var(--spotify)" }}>♫</span> Playlists</h2>
        <p className="subtitle" style={{ fontSize: 13, marginBottom: 18 }}>Abre la playlist sugerida por cada equipo en Spotify.</p>
        <div className="stack" style={{ gap: 10 }}>
          {teams.map((t) => (
            <div key={t.id} className="card row between" style={{ padding: "13px 15px", "--tc": tcVar(t.color) }}>
              <div className="row" style={{ gap: 10, minWidth: 0 }}>
                <TeamDot color={t.color} />
                <span style={{ fontWeight: 600, fontSize: 14.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
              </div>
              {t.playlist
                ? <a className="btn btn-sm" href={t.playlist.url} target="_blank" rel="noopener noreferrer"
                     style={{ background: "var(--spotify)", color: "oklch(0.16 0.02 295)", border: "none", textDecoration: "none", flexShrink: 0 }}>Abrir →</a>
                : <span className="mono" style={{ fontSize: 11, color: "var(--text-faint)", flexShrink: 0 }}>sin playlist</span>}
            </div>
          ))}
        </div>
      </Sheet>
    </div>
  );
}

function TeamLiveCard({ team, config, onClick }) {
  const total = team.cells.length;
  const markedCount = team.marked.size + team.cells.filter((c) => c.free).length;
  const pts = teamScore(team, team.cells);
  return (
    <button className="card row between" onClick={onClick}
            style={{ padding: 14, cursor: "pointer", "--tc": tcVar(team.color), borderColor: team.wins.length ? tcVar(team.color) : "var(--line-soft)" }}>
      <div className="row" style={{ gap: 11 }}>
        <TeamDot color={team.color} />
        <div className="stack" style={{ gap: 3, alignItems: "flex-start" }}>
          <span style={{ fontWeight: 600, fontSize: 15.5 }}>{team.name}</span>
          <span className="mono" style={{ fontSize: 11, color: "var(--text-faint)" }}>
            {markedCount}/{total} casillas{team.wins.length ? " · 🏆 " + team.wins.length : ""}
          </span>
        </div>
      </div>
      <div className="row" style={{ gap: 12 }}>
        {config.mode === "puntaje"
          ? <span className="mono glow-text" style={{ fontSize: 22, fontWeight: 700, color: tcVar(team.color) }}>{pts}</span>
          : <span style={{ fontSize: 20 }}>›</span>}
      </div>
    </button>
  );
}

function ValidateSheet({ open, flow, team, config, onValidate, onClose }) {
  const [challenge, setChallenge] = useStateL(null);
  const [count, setCount] = useStateL(null); // hotmic countdown
  const timerRef = useRefL(null);
  useEffectL(() => { if (!open) { setChallenge(null); setCount(null); clearInterval(timerRef.current); } }, [open]);

  function startHotMic() {
    setCount(3);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCount((c) => { if (c <= 1) { clearInterval(timerRef.current); return 0; } return c - 1; });
    }, 1000);
  }
  if (!open || !team || flow.cellIdx == null) return null;
  const cell = team.cells[flow.cellIdx];

  return (
    <Sheet open={open} onClose={onClose}>
      <span className="eyebrow">{team.name} reclama</span>
      <div className="row between" style={{ alignItems: "flex-start", margin: "8px 0 18px", gap: 12 }}>
        <h2 className="title" style={{ flex: 1 }}>{cell && cell.label}</h2>
        {config.mode === "puntaje" && cell && <DifBadge dif={cell.dif} />}
      </div>

      <span className="eyebrow">Desafío musical</span>
      <div className="row" style={{ gap: 8, flexWrap: "wrap", margin: "12px 0 22px" }}>
        {window.KB.CHALLENGES.map((ch) => (
          <button key={ch.id} className={"chip" + (challenge === ch.id ? " on" : "")} onClick={() => setChallenge(ch.id)}
                  style={{ fontSize: 12, padding: "8px 12px" }}>
            {ch.label}
          </button>
        ))}
      </div>

      {config.rules.hotmic && (
        <div className="card" style={{ padding: 14, marginBottom: 20, textAlign: "center", borderColor: count === 0 ? "var(--rose)" : "var(--line)" }}>
          <div className="row between" style={{ marginBottom: 12, gap: 10 }}>
            <span style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap" }}>🎤 Micrófono caliente</span>
            <span className="subtitle" style={{ fontSize: 11.5, whiteSpace: "nowrap" }}>3s para cantar</span>
          </div>
          {count == null
            ? <button className="btn btn-ghost btn-sm block" onClick={startHotMic}>Iniciar cuenta atrás</button>
            : <div className="mono glow-text" style={{ fontSize: 52, fontWeight: 700, lineHeight: 1, color: count === 0 ? "var(--rose)" : "var(--accent)" }}>
                {count === 0 ? "¡FUERA!" : count}
              </div>}
        </div>
      )}

      <div className="row" style={{ gap: 10 }}>
        <button className="btn block" onClick={() => onValidate(false)}
                style={{ background: "color-mix(in oklch, var(--rose) 16%, transparent)", color: "var(--rose)", border: "1px solid color-mix(in oklch, var(--rose) 40%, transparent)" }}>
          ✕ Falló
        </button>
        <button className="btn block" onClick={() => onValidate(true)}
                style={{ background: "var(--lime)", color: "oklch(0.16 0.02 295)", border: "none" }}>
          ✓ Validó — cantó
        </button>
      </div>
    </Sheet>
  );
}

/* ============ MARCADOR ============ */
function ScoreboardScreen({ teams, config, onEnd }) {
  const ranked = [...teams].sort((a, b) => {
    if (config.mode === "puntaje") return teamScore(b, b.cells) - teamScore(a, a.cells);
    const bm = b.marked.size + b.cells.filter((c) => c.free).length;
    const am = a.marked.size + a.cells.filter((c) => c.free).length;
    return (b.wins.length - a.wins.length) || (bm - am);
  });
  const maxPts = Math.max(1, ...teams.map((t) => teamScore(t, t.cells)));

  return (
    <div className="screen-pad">
      <ScreenHeader eyebrow={config.mode === "clasico" ? "Líneas · cartón" : "Puntaje acumulado"} title="Marcador" />
      <div className="stack" style={{ gap: 12 }}>
        {ranked.map((t, i) => {
          const pts = teamScore(t, t.cells);
          const total = t.cells.length;
          const markedCount = t.marked.size + t.cells.filter((c) => c.free).length;
          return (
            <div key={t.id} className="card" style={{ padding: 16, "--tc": tcVar(t.color) }}>
              <div className="row between" style={{ marginBottom: 12 }}>
                <div className="row" style={{ gap: 12 }}>
                  <span className="mono" style={{ fontSize: 20, fontWeight: 700, color: i === 0 ? tcVar(t.color) : "var(--text-faint)", width: 26 }}>{i + 1}</span>
                  <TeamDot color={t.color} />
                  <span style={{ fontWeight: 600, fontSize: 16 }}>{t.name}</span>
                </div>
                {config.mode === "puntaje"
                  ? <span className="mono glow-text" style={{ fontSize: 26, fontWeight: 700, color: tcVar(t.color) }}>{pts}</span>
                  : <span className="mono" style={{ fontSize: 14, color: "var(--text-dim)" }}>🏆 {t.wins.length}</span>}
              </div>
              <div style={{ height: 7, borderRadius: 4, background: "var(--bg-2)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: (config.mode === "puntaje" ? (pts / maxPts * 100) : (markedCount / total * 100)) + "%", background: tcVar(t.color), borderRadius: 4, transition: "width .4s ease" }} />
              </div>
              <div className="row between" style={{ marginTop: 8 }}>
                <span className="mono" style={{ fontSize: 11, color: "var(--text-faint)" }}>{markedCount}/{total} casillas</span>
                {t.wins.length > 0 && <span className="mono" style={{ fontSize: 11, color: tcVar(t.color) }}>{t.wins.map((w) => w.type).join(" · ")}</span>}
              </div>
            </div>
          );
        })}
      </div>
      <button className="btn btn-ghost block" style={{ marginTop: 22 }} onClick={() => onEnd(ranked[0])}>Terminar y coronar ganador 🏆</button>
    </div>
  );
}

/* ============ TIMER de partida (cronómetro) ============ */
function GameTimer() {
  const [sec, setSec] = useStateL(0);
  const [run, setRun] = useStateL(false);
  const ref = useRefL(null);
  useEffectL(() => {
    if (run) ref.current = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(ref.current);
  }, [run]);
  const mm = String(Math.floor(sec / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");
  return (
    <button className="chip mono" onClick={() => setRun(!run)} onDoubleClick={() => { setSec(0); setRun(false); }}
            style={{ fontSize: 14, padding: "8px 12px", color: run ? "var(--accent)" : "var(--text-dim)" }}>
      {run ? "⏸" : "▶"} {mm}:{ss}
    </button>
  );
}

/* ============ Equalizer deco ============ */
function Equalizer() {
  return (
    <div className="row" style={{ gap: 3, alignItems: "flex-end", height: 34, width: 34, flex: "0 0 34px" }}>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} style={{
          flex: 1, background: "var(--accent)", borderRadius: 2,
          animation: `eq 0.9s ease-in-out ${i * 0.15}s infinite alternate`,
          height: "40%",
        }} />
      ))}
      <style>{`@keyframes eq { from { height: 22%; } to { height: 100%; } }`}</style>
    </div>
  );
}

/* ============ WIN OVERLAY ============ */
function WinOverlay({ celebration, onClose }) {
  const target = document.getElementById("kb-overlay") || document.body;
  return ReactDOM.createPortal(
    <div className="sheet-scrim" style={{ alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div className="card" onClick={(e) => e.stopPropagation()} style={{
        margin: 24, padding: "32px 26px", textAlign: "center", maxWidth: 340,
        animation: "pop .4s cubic-bezier(.2,.9,.3,1.2)", "--tc": tcVar(celebration.color),
        border: "1px solid " + tcVar(celebration.color), boxShadow: "0 0 50px -10px " + tcVar(celebration.color),
      }}>
        <div style={{ fontSize: 56, marginBottom: 10 }}>🏆</div>
        <span className="eyebrow" style={{ color: tcVar(celebration.color) }}>{celebration.type}</span>
        <h1 className="title glow-text" style={{ fontSize: 30, margin: "8px 0 6px" }}>{celebration.name}</h1>
        <p className="subtitle" style={{ fontSize: 14 }}>{celebration.final ? "¡Gana la partida!" : "¡Casilla completada! Sigue jugando o termina."}</p>
        <button className="btn btn-primary block" style={{ marginTop: 22 }} onClick={onClose}>Seguir</button>
      </div>
    </div>,
    target
  );
}

Object.assign(window, { LiveScreen, ScoreboardScreen, WinOverlay, GameTimer });
