"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchPoolTracks } from "./actions/spotify";
import { BoardsScreen } from "./components/BoardsScreen";
import { CategoriesScreen } from "./components/CategoriesScreen";
import { LiveScreen } from "./components/LiveScreen";
import { PrintSheets } from "./components/PrintSheets";
import { ScoreboardScreen } from "./components/ScoreboardScreen";
import { SetupScreen } from "./components/SetupScreen";
import { EmptyState } from "./components/ui";
import { WinScreen } from "./components/WinScreen";
import { CATEGORIES, SAMPLE_TEAMS } from "./lib/data";
import {
  generateBoard,
  getWins,
  shuffle,
} from "./lib/game";
import { clearSnapshot, loadSnapshot, saveSnapshot } from "./lib/persist";
import { sfx, startSplashMusic, stopSplashMusic } from "./lib/sound";
import type {
  Category,
  Celebration,
  Config,
  Screen,
  Team,
  Track,
} from "./lib/types";

function freshTeams(): Team[] {
  return SAMPLE_TEAMS.map((s, i) => ({
    id: "t" + i + Date.now(),
    name: s.name,
    color: s.color,
    playlistRaw: s.playlistRaw || "",
    playlist: null,
    cells: [],
    marked: new Set<number>(),
    wins: [],
  }));
}

const TABS: { id: Screen; label: string; ico: string }[] = [
  { id: "setup", label: "Inicio", ico: "⚙" },
  { id: "categorias", label: "Banco", ico: "♫" },
  { id: "tableros", label: "Tableros", ico: "▦" },
  { id: "partida", label: "Jugar", ico: "▶" },
];

export default function Home() {
  // Splash de entrada. Flujo:
  //   1) Logo aparece + botón "Comenzar" tras la animación inicial.
  //   2) Click "Comenzar" → arranca música chiptune (el click es el gesto
  //      que el browser exige para audio) + logo celebra ~1.6s.
  //   3) Termina la celebración → fade-out del splash, app fade-in.
  const [splashHiding, setSplashHiding] = useState(false);
  const [splashGone, setSplashGone] = useState(false);
  const [splashButtonReady, setSplashButtonReady] = useState(false);
  const [splashCelebrating, setSplashCelebrating] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSplashButtonReady(true), 1700);
    return () => clearTimeout(t);
  }, []);
  const dismissSplash = useCallback(() => {
    // El click es el gesto que desbloquea AudioContext en el browser.
    startSplashMusic();
    sfx.start();
    setSplashCelebrating(true);
    // Después de la celebración (logo bouncing con música), fade-out del
    // splash. La música se corta justo antes del unmount.
    setTimeout(() => {
      stopSplashMusic();
      setSplashHiding(true);
      setTimeout(() => setSplashGone(true), 500);
    }, 1600);
  }, []);

  const [screen, setScreen] = useState<Screen>("setup");
  const [config, setConfig] = useState<Config>({
    mode: "clasico",
    size: 4,
  });
  const [teams, setTeams] = useState<Team[]>(() => freshTeams());
  const [categories, setCategories] = useState<Category[]>(() =>
    CATEGORIES.slice()
  );
  const [round, setRound] = useState(1);
  const [generated, setGenerated] = useState(false);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [winner, setWinner] = useState<Team | null>(null);
  const [pool, setPool] = useState<Track[]>([]);
  const [trackOrder, setTrackOrder] = useState<number[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Persistencia: cargar al montar (post-hidratación), guardar en cada cambio.
  // hydratedRef = true cuando ya restauramos del localStorage; sirve para no
  // sobrescribir el storage con los valores iniciales antes de cargar.
  const hydratedRef = useRef(false);
  useEffect(() => {
    const snap = loadSnapshot();
    if (snap) {
      setScreen(snap.screen);
      setConfig(snap.config);
      setTeams(snap.teams);
      setCategories(snap.categories);
      setRound(snap.round);
      setGenerated(snap.generated);
      setWinner(snap.winner);
      setPool(snap.pool);
      setTrackOrder(snap.trackOrder);
    }
    hydratedRef.current = true;
  }, []);
  useEffect(() => {
    if (!hydratedRef.current) return;
    saveSnapshot({
      screen,
      config,
      teams,
      categories,
      round,
      generated,
      winner,
      pool,
      trackOrder,
    });
  }, [
    screen,
    config,
    teams,
    categories,
    round,
    generated,
    winner,
    pool,
    trackOrder,
  ]);

  async function genAll() {
    setGenerateError(null);
    setIsGenerating(true);
    const rawList = teams
      .map((t) => t.playlistRaw)
      .filter((x): x is string => !!x);
    const result = await fetchPoolTracks(rawList);
    if (!result.ok) {
      setIsGenerating(false);
      setGenerateError(result.error);
      return;
    }
    const seen = new Set<string>();
    const realPool: Track[] = [];
    result.playlists
      .flatMap((p) => p.tracks)
      .forEach((tr) => {
        if (seen.has(tr.uri)) return;
        seen.add(tr.uri);
        realPool.push({ t: tr.name, a: tr.artists, uri: tr.uri });
      });
    if (realPool.length === 0) {
      setIsGenerating(false);
      setGenerateError(
        "Las playlists están vacías. Conecta otras o agrega tracks."
      );
      return;
    }
    setPool(realPool);
    setTrackOrder(shuffle(realPool.map((_, i) => i)));
    setTeams(
      teams.map((tm) => ({
        ...tm,
        cells: generateBoard(categories, config.size),
        marked: new Set<number>(),
        wins: [],
      }))
    );
    setGenerated(true);
    setRound(1);
    setIsGenerating(false);
    setScreen("tableros");
  }

  function regenTeam(id: string) {
    setTeams(
      teams.map((tm) =>
        tm.id === id
          ? {
              ...tm,
              cells: generateBoard(categories, config.size),
              marked: new Set<number>(),
              wins: [],
            }
          : tm
      )
    );
  }

  function regenAll() {
    setTeams(
      teams.map((tm) => ({
        ...tm,
        cells: generateBoard(categories, config.size),
        marked: new Set<number>(),
        wins: [],
      }))
    );
  }

  const markCell = useCallback(
    (teamId: string, idx: number) => {
      setTeams((prev) =>
        prev.map((tm) => {
          if (tm.id !== teamId) return tm;
          const marked = new Set(tm.marked);
          marked.add(idx);
          const wins = getWins(marked, tm.cells, config.size);
          if (config.mode === "clasico" && wins.length > tm.wins.length) {
            const newest = wins[wins.length - 1];
            setTimeout(
              () =>
                setCelebration({
                  name: tm.name,
                  color: tm.color,
                  type: "¡" + newest.type + "!",
                  final: true,
                }),
              60
            );
          }
          return { ...tm, marked, wins };
        })
      );
    },
    [config.mode, config.size]
  );

  function doPrint() {
    if (typeof window === "undefined") return;
    // PrintSheets vive siempre renderizado en `#print-root` (oculto por CSS).
    // En modo print el @media print lo muestra y oculta el resto.
    window.print();
  }

  function endGame(top: Team) {
    setWinner(top);
    setScreen("win");
  }

  function resetGame() {
    clearSnapshot();
    setTeams(freshTeams());
    setPool([]);
    setTrackOrder([]);
    setGenerated(false);
    setRound(1);
    setWinner(null);
    setCelebration(null);
    setScreen("setup");
  }

  // Avanzar a la próxima canción. Si estamos a punto de wrappear el trackOrder
  // (ya pasamos por todas las canciones del pool), lo re-mezclamos para que la
  // próxima vuelta tenga otro orden y que la primera nueva no coincida con la
  // última del ciclo viejo (anti-repetición inmediata).
  function nextSong() {
    const nextRound = round + 1;
    const orderLen = trackOrder.length;
    if (orderLen > 1 && (nextRound - 1) % orderLen === 0 && nextRound > 1) {
      const currentIdx = trackOrder[(round - 1) % orderLen];
      const reshuffled = shuffle(pool.map((_, i) => i));
      if (reshuffled[0] === currentIdx && reshuffled.length > 1) {
        const swapAt =
          1 + Math.floor(Math.random() * (reshuffled.length - 1));
        [reshuffled[0], reshuffled[swapAt]] = [
          reshuffled[swapAt],
          reshuffled[0],
        ];
      }
      setTrackOrder(reshuffled);
    }
    setRound(nextRound);
  }

  const track =
    generated && pool.length
      ? pool[trackOrder[(round - 1) % trackOrder.length]]
      : null;

  return (
    <>
    {!splashGone && (
      <div
        className={"kb-splash" + (splashHiding ? " kb-splash--out" : "")}
        aria-hidden={splashHiding}
      >
        <Image
          src="/kindergaura-logo.png"
          alt="Kindergatura Karaoke Battle"
          width={420}
          height={420}
          priority
          className={
            "kb-splash__logo" +
            (splashCelebrating ? " kb-splash__logo--party" : "")
          }
        />
        {!splashCelebrating && (
          <button
            type="button"
            className={
              "kb-splash__cta" +
              (splashButtonReady ? " kb-splash__cta--in" : "")
            }
            onClick={dismissSplash}
            disabled={!splashButtonReady}
          >
            Comenzar
          </button>
        )}
      </div>
    )}
    <div className={"stage" + (splashGone ? "" : " kb-stage--waiting")}>
      <div className="screen" key={screen}>
        {screen === "setup" && (
          <SetupScreen
            config={config}
            setConfig={setConfig}
            teams={teams}
            setTeams={setTeams}
            categories={categories}
            onGenerate={genAll}
            isGenerating={isGenerating}
            generateError={generateError}
          />
        )}

        {screen === "categorias" && (
          <CategoriesScreen
            categories={categories}
            setCategories={setCategories}
          />
        )}

        {screen === "tableros" &&
          (generated ? (
            <BoardsScreen
              teams={teams}
              config={config}
              onRegen={regenTeam}
              onRegenAll={regenAll}
              onPrint={doPrint}
              onStart={() => setScreen("partida")}
            />
          ) : (
            <EmptyState
              title="Aún no hay tableros"
              msg="Configura los equipos y genera los tableros únicos."
              cta="Ir a configurar"
              onCta={() => setScreen("setup")}
            />
          ))}

        {screen === "partida" &&
          (generated ? (
            <LiveScreen
              teams={teams}
              config={config}
              round={round}
              onNextSong={nextSong}
              track={track}
              markCell={markCell}
              celebration={celebration}
              clearCelebration={() => setCelebration(null)}
            />
          ) : (
            <EmptyState
              title="La partida no ha empezado"
              msg="Genera los tableros primero."
              cta="Ir a configurar"
              onCta={() => setScreen("setup")}
            />
          ))}

        {screen === "marcador" &&
          (generated ? (
            <ScoreboardScreen
              teams={teams}
              config={config}
              onEnd={endGame}
              onReset={resetGame}
            />
          ) : (
            <EmptyState
              title="Sin marcador todavía"
              msg="Empieza una partida para ver los puntajes."
              cta="Ir a configurar"
              onCta={() => setScreen("setup")}
            />
          ))}

        {screen === "win" && (
          <WinScreen
            winner={winner}
            config={config}
            onAgain={resetGame}
            onScores={() => setScreen("marcador")}
          />
        )}
      </div>

      {screen !== "win" && (
        <nav className="tabbar">
          {TABS.map((tab) => {
            // Si el juego ya está en curso, "Inicio" no vuelve al setup
            // (perderías el contexto del juego) — lo redirigimos al marcador.
            const target =
              tab.id === "setup" && generated ? "marcador" : tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={"tab" + (screen === target ? " active" : "")}
                onClick={() => {
                  if (screen !== target) sfx.tap();
                  setScreen(target);
                }}
              >
                <span className="ico">{tab.ico}</span>
                {tab.label}
              </button>
            );
          })}
        </nav>
      )}
    </div>

    {/* Print sheets — fuera de .stage porque @media print oculta .stage con
        display: none y eso oculta a TODOS sus hijos sin importar la regla
        propia del hijo. Como hermano, #print-root sobrevive el `display: none`
        del padre. */}
    {generated && (
      <div id="print-root">
        <PrintSheets teams={teams} config={config} />
      </div>
    )}
    </>
  );
}

