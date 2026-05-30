// app.jsx — orquestador: estado, navegación, impresión y Tweaks
const { useState: useApp, useEffect: useAppEffect, useRef: useAppRef } = React;

const NEON = {
  magenta: "oklch(0.72 0.205 350)",
  cyan: "oklch(0.78 0.135 205)",
  lime: "oklch(0.85 0.205 130)",
  violet: "oklch(0.72 0.175 295)",
  amber: "oklch(0.82 0.165 70)",
  rose: "oklch(0.74 0.175 18)",
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "oklch(0.72 0.205 350)",
  "accent2": "oklch(0.78 0.135 205)",
  "radius": "rounded"
}/*EDITMODE-END*/;

const RADIUS_MAP = {
  soft:    { r: "12px", rs: "9px", rl: "18px" },
  rounded: { r: "18px", rs: "12px", rl: "26px" },
  sharp:   { r: "6px",  rs: "5px",  rl: "10px" },
};

function freshTeams(samples) {
  return samples.map((s, i) => {
    const playlist = s.playlistRaw ? parseSpotifyPlaylist(s.playlistRaw) : null;
    return {
      id: "t" + i + Date.now(), name: s.name, color: s.color,
      playlistRaw: s.playlistRaw || "", playlist,
      trackCount: playlist ? pseudoCount(playlist.id) : 0,
      cells: [], marked: new Set(), wins: [],
    };
  });
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [screen, setScreen] = useApp("setup");
  const [config, setConfig] = useApp({ mode: "clasico", size: 4, rules: { hotmic: true, steal: true, oneper: false, ban: false, wild: false } });
  const [teams, setTeams] = useApp(() => freshTeams(window.KB.SAMPLE_TEAMS));
  const [categories, setCategories] = useApp(() => window.KB.CATEGORIES.slice());
  const [round, setRound] = useApp(1);
  const [generated, setGenerated] = useApp(false);
  const [celebration, setCelebration] = useApp(null);
  const [winner, setWinner] = useApp(null);
  const [trackOrder, setTrackOrder] = useApp(() => shuffle(window.KB.DEMO_TRACKS.map((_, i) => i)));
  const printRootRef = useAppRef(null);

  /* ---- board generation ---- */
  function genAll() {
    setTeams(teams.map((tm) => ({ ...tm, cells: generateBoard(categories, config.size), marked: new Set(), wins: [] })));
    setGenerated(true);
    setRound(1);
    setTrackOrder(shuffle(window.KB.DEMO_TRACKS.map((_, i) => i)));
    setScreen("tableros");
  }
  function regenTeam(id) {
    setTeams(teams.map((tm) => (tm.id === id ? { ...tm, cells: generateBoard(categories, config.size), marked: new Set(), wins: [] } : tm)));
  }
  function regenAll() {
    setTeams(teams.map((tm) => ({ ...tm, cells: generateBoard(categories, config.size), marked: new Set(), wins: [] })));
  }

  /* ---- marking + winner detection ---- */
  function markCell(teamId, idx) {
    setTeams((prev) => prev.map((tm) => {
      if (tm.id !== teamId) return tm;
      const marked = new Set(tm.marked); marked.add(idx);
      const wins = getWins(marked, tm.cells, config.size);
      if (config.mode === "clasico" && wins.length > tm.wins.length) {
        const newest = wins[wins.length - 1];
        setTimeout(() => setCelebration({ name: tm.name, color: tm.color, type: "¡" + newest.type + "!", final: true }), 60);
      }
      return { ...tm, marked, wins };
    }));
  }

  /* ---- print ---- */
  function doPrint() {
    if (!printRootRef.current) printRootRef.current = ReactDOM.createRoot(document.getElementById("print-root"));
    printRootRef.current.render(<PrintSheets teams={teams} config={config} />);
    setTimeout(() => window.print(), 120);
  }
  useAppEffect(() => () => { /* keep print root */ }, []);

  function endGame(top) { setWinner(top); setScreen("win"); }
  function resetGame() {
    setTeams(freshTeams(window.KB.SAMPLE_TEAMS));
    setGenerated(false); setRound(1); setWinner(null); setCelebration(null); setScreen("setup");
  }

  /* ---- tweak-driven CSS vars ---- */
  const rad = RADIUS_MAP[t.radius] || RADIUS_MAP.rounded;
  const styleVars = {
    "--accent": t.accent,
    "--accent-2": t.accent2,
    "--radius": rad.r, "--radius-sm": rad.rs, "--radius-lg": rad.rl,
    height: "100%",
  };

  const TABS = [
    { id: "setup", label: "Inicio", ico: "⚙" },
    { id: "categorias", label: "Banco", ico: "♫" },
    { id: "tableros", label: "Tableros", ico: "▦" },
    { id: "partida", label: "Jugar", ico: "▶" },
    { id: "marcador", label: "Marcador", ico: "★" },
  ];

  const statusTitle = { setup: "Configurar", categorias: "Banco", tableros: "Tableros", partida: "Ronda " + round, marcador: "Marcador", win: "Resultado" }[screen];

  return (
    <div className="stage" style={styleVars}>
      <div className="phone">
        <StatusBar title={"9:41"} />

        <div className="screen" key={screen}>
          {screen === "setup" && (
            <SetupScreen config={config} setConfig={setConfig} teams={teams} setTeams={setTeams}
                         categories={categories} onGenerate={genAll} />
          )}
          {screen === "categorias" && <CategoriesScreen categories={categories} setCategories={setCategories} />}
          {screen === "tableros" && (
            generated
              ? <BoardsScreen teams={teams} config={config} onRegen={regenTeam} onRegenAll={regenAll} onPrint={doPrint} onStart={() => setScreen("partida")} />
              : <EmptyState title="Aún no hay tableros" msg="Configura los equipos y genera los tableros únicos." cta="Ir a configurar" onCta={() => setScreen("setup")} />
          )}
          {screen === "partida" && (
            generated
              ? <LiveScreen teams={teams} config={config} round={round} onNextSong={() => setRound((r) => r + 1)}
                            track={window.KB.DEMO_TRACKS[trackOrder[(round - 1) % trackOrder.length]]}
                            markCell={markCell} celebration={celebration} clearCelebration={() => setCelebration(null)} />
              : <EmptyState title="La partida no ha empezado" msg="Genera los tableros primero." cta="Ir a configurar" onCta={() => setScreen("setup")} />
          )}
          {screen === "marcador" && (
            generated
              ? <ScoreboardScreen teams={teams} config={config} onEnd={endGame} />
              : <EmptyState title="Sin marcador todavía" msg="Empieza una partida para ver los puntajes." cta="Ir a configurar" onCta={() => setScreen("setup")} />
          )}
          {screen === "win" && <WinScreen winner={winner} config={config} onAgain={resetGame} onScores={() => setScreen("marcador")} />}
        </div>

        {screen !== "win" && (
          <nav className="tabbar">
            {TABS.map((tab) => (
              <button key={tab.id} className={"tab" + (screen === tab.id ? " active" : "")} onClick={() => setScreen(tab.id)}>
                <span className="ico">{tab.ico}</span>{tab.label}
              </button>
            ))}
          </nav>
        )}

        <div id="kb-overlay" className="overlay-layer"></div>
      </div>

      <TweaksPanel>
        <TweakSection label="Color" />
        <TweakColor label="Acento" value={t.accent} options={[NEON.magenta, NEON.cyan, NEON.lime, NEON.violet, NEON.amber, NEON.rose]}
                    onChange={(v) => setTweak("accent", v)} />
        <TweakColor label="Secundario" value={t.accent2} options={[NEON.cyan, NEON.magenta, NEON.lime, NEON.violet, NEON.amber, NEON.rose]}
                    onChange={(v) => setTweak("accent2", v)} />
        <TweakSection label="Forma" />
        <TweakRadio label="Esquinas" value={t.radius} options={["soft", "rounded", "sharp"]}
                    onChange={(v) => setTweak("radius", v)} />
      </TweaksPanel>
    </div>
  );
}

function EmptyState({ title, msg, cta, onCta }) {
  return (
    <div className="screen-pad" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", paddingTop: 120 }}>
      <div style={{ fontSize: 46, marginBottom: 16, opacity: 0.5 }}>🎤</div>
      <h2 className="title" style={{ marginBottom: 8 }}>{title}</h2>
      <p className="subtitle" style={{ fontSize: 14, maxWidth: 260, marginBottom: 22 }}>{msg}</p>
      <button className="btn btn-primary" onClick={onCta}>{cta}</button>
    </div>
  );
}

function WinScreen({ winner, config, onAgain, onScores }) {
  if (!winner) return null;
  const pts = teamScore(winner, winner.cells);
  return (
    <div className="screen-pad" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100%", textAlign: "center", "--tc": tcVar(winner.color) }}>
      <div style={{ fontSize: 72, marginBottom: 4, animation: "pop .5s cubic-bezier(.2,.9,.3,1.2)" }}>🏆</div>
      <span className="eyebrow" style={{ color: tcVar(winner.color) }}>Ganador de la batalla</span>
      <h1 className="title glow-text" style={{ fontSize: 38, margin: "10px 0 14px", "--accent": tcVar(winner.color) }}>{winner.name}</h1>
      {config.mode === "puntaje"
        ? <div className="mono glow-text" style={{ fontSize: 60, fontWeight: 700, color: tcVar(winner.color), "--accent": tcVar(winner.color) }}>{pts}<span style={{ fontSize: 20 }}> pts</span></div>
        : <p className="subtitle" style={{ fontSize: 15 }}>{winner.wins.map((w) => w.type).join(" · ") || "Mejor desempeño"}</p>}
      <div className="stack" style={{ gap: 10, marginTop: 34, width: "100%", maxWidth: 280 }}>
        <button className="btn btn-ghost block" onClick={onScores}>Ver marcador final</button>
        <button className="btn btn-primary block" onClick={onAgain}>Nueva partida</button>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
