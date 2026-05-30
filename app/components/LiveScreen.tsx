"use client";

import {
  Button as HButton,
  Modal,
} from "@heroui/react";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  SpotifyEmbedPlayer,
  type SpotifyPlayerHandle,
} from "./SpotifyEmbedPlayer";
import { CHALLENGES } from "../lib/data";
import { spotifySearchUrl, tcVar, teamScore } from "../lib/game";
import type {
  Celebration,
  Config,
  Team,
  Track,
} from "../lib/types";
import {
  BoardGrid,
  BottomSheet,
  DifBadge,
  Equalizer,
  KBButton,
  KBCard,
  KBChip,
  KBLinkButton,
  TeamDot,
} from "./ui";

// Deep link al track concreto. `open.spotify.com/track/{id}` abre la app de
// Spotify (desktop / móvil) si está instalada; si no, abre el web player.
function trackOpenUrl(track: Track): string {
  const id = trackId(track);
  if (id) return `https://open.spotify.com/track/${id}`;
  return spotifySearchUrl(track);
}

function trackId(track: Track): string | null {
  if (track.uri && track.uri.startsWith("spotify:track:")) {
    return track.uri.slice("spotify:track:".length);
  }
  return null;
}

// Iframe oficial de Spotify para preview de 30s. No requiere auth ni Premium.
function trackEmbedUrl(track: Track): string | null {
  const id = trackId(track);
  return id ? `https://open.spotify.com/embed/track/${id}?utm_source=karaoke-battle` : null;
}

type Flow =
  | { phase: "claim"; teamId: string; stealing?: boolean }
  | { phase: "validate"; teamId: string; cellIdx: number; stealing?: boolean }
  | { phase: "steal"; failedTeam: string; cellIdx: number };

type Props = {
  teams: Team[];
  config: Config;
  round: number;
  track: Track | null;
  onNextSong: () => void;
  markCell: (teamId: string, idx: number) => void;
  celebration: Celebration | null;
  clearCelebration: () => void;
};

export function LiveScreen({
  teams,
  config,
  round,
  track,
  onNextSong,
  markCell,
  celebration,
  clearCelebration,
}: Props) {
  const [flow, setFlow] = useState<Flow | null>(null);
  const [showLists, setShowLists] = useState(false);
  const playerRef = useRef<SpotifyPlayerHandle>(null);
  const close = () => setFlow(null);

  function nextAndPlay() {
    // Llamamos play() ANTES de cambiar el round para que el user gesture
    // (este click) consuma el permiso de autoplay del iframe mientras
    // todavía está vivo. Después actualizamos round → el embed hace loadUri
    // y se reintenta el play en el useEffect del player.
    playerRef.current?.play();
    onNextSong();
  }

  const claimingTeam =
    flow && (flow.phase === "claim" || flow.phase === "validate")
      ? teams.find((t) => t.id === flow.teamId) || null
      : null;
  const playlistTeams = teams.filter((t) => t.playlist);

  function openClaim(teamId: string) {
    setFlow({ phase: "claim", teamId });
  }
  function pickCell(idx: number) {
    if (!flow || flow.phase !== "claim") return;
    setFlow({
      phase: "validate",
      teamId: flow.teamId,
      cellIdx: idx,
      stealing: flow.stealing,
    });
  }
  function validate(success: boolean) {
    if (!flow || flow.phase !== "validate") return;
    if (success) {
      markCell(flow.teamId, flow.cellIdx);
      close();
      return;
    }
    setFlow({
      phase: "steal",
      failedTeam: flow.teamId,
      cellIdx: flow.cellIdx,
    });
  }
  function steal(teamId: string) {
    setFlow({ phase: "claim", teamId, stealing: true });
  }

  return (
    <div className="screen-pad">
      <div className="row between" style={{ marginTop: 8, marginBottom: 18 }}>
        <div className="stack" style={{ gap: 4 }}>
          <span className="eyebrow">
            {config.mode === "clasico" ? "Modo clásico" : "Por puntaje"}
          </span>
          <h1 className="title">En vivo</h1>
        </div>
        <GameTimer />
      </div>

      {/* Canción sonando */}
      {track ? (
        <KBCard glass style={{ padding: 14, marginBottom: 22 }}>
          <div className="row between" style={{ marginBottom: 12, padding: "0 4px" }}>
            <span className="eyebrow" style={{ color: "var(--spotify)" }}>
              ♫ Preview · Spotify
            </span>
            <span
              className="mono"
              style={{ fontSize: 13, color: "var(--text-dim)" }}
            >
              #{String(round).padStart(2, "0")}
            </span>
          </div>
          {track.uri && (
            <div
              style={{
                position: "relative",
                borderRadius: "var(--radius-sm)",
                overflow: "hidden",
                marginBottom: 12,
                background: "var(--bg-2)",
              }}
            >
              <SpotifyEmbedPlayer
                ref={playerRef}
                uri={track.uri}
                height={152}
              />
              {/* Overlay que tapa portada + título + artista del embed.
                  Deja visible solo la barra de play/pause y la progress
                  abajo. pointerEvents: none para no robarle taps al iframe. */}
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 96,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  background:
                    "linear-gradient(180deg, oklch(0.18 0.022 295) 0%, oklch(0.215 0.024 293) 100%)",
                  color: "var(--text-dim)",
                  fontFamily: "var(--font-display), system-ui, sans-serif",
                  fontWeight: 700,
                  fontSize: 14,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  pointerEvents: "none",
                  userSelect: "none",
                }}
              >
                <span style={{ fontSize: 22 }}>🎤</span>
                <span>¿Qué canción es?</span>
              </div>
            </div>
          )}
          <div className="row" style={{ gap: 10 }}>
            <KBLinkButton
              className="block"
              href={trackOpenUrl(track)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: "transparent",
                color: "var(--spotify)",
                border: "1px solid color-mix(in oklch, var(--spotify) 45%, transparent)",
                textDecoration: "none",
                flex: 2,
                fontSize: 13,
              }}
            >
              ↗ Abrir en Spotify (canción completa)
            </KBLinkButton>
            <KBButton variant="ghost" style={{ flex: 1 }} onPress={nextAndPlay}>
              ⏭ Otra
            </KBButton>
          </div>
          <KBButton
            variant="ghost"
            sm
            block
            style={{ marginTop: 10, color: "var(--text-dim)" }}
            onPress={() => setShowLists(true)}
          >
            Ver playlists de los equipos ({playlistTeams.length})
          </KBButton>
        </KBCard>
      ) : (
        <KBCard glass style={{ padding: 18, marginBottom: 22 }}>
          <div className="row between" style={{ marginBottom: 14 }}>
            <span className="eyebrow">Ronda</span>
            <span
              className="mono"
              style={{ fontSize: 13, color: "var(--text-dim)" }}
            >
              #{String(round).padStart(2, "0")}
            </span>
          </div>
          <div className="row" style={{ gap: 14, alignItems: "center" }}>
            <Equalizer />
            <div className="stack" style={{ gap: 3, flex: 1 }}>
              <span style={{ fontWeight: 600, fontSize: 16 }}>
                Reproduce un fragmento
              </span>
              <span className="subtitle" style={{ fontSize: 12.5 }}>
                Aleatorio de tu playlist. Los equipos reclaman.
              </span>
            </div>
          </div>
          <KBButton
            variant="primary"
            block
            style={{ marginTop: 16 }}
            onPress={onNextSong}
          >
            ▶ Siguiente canción
          </KBButton>
        </KBCard>
      )}

      {/* Equipos */}
      <span className="eyebrow">Equipos · toca para reclamar casilla</span>
      <div className="stack" style={{ gap: 10, marginTop: 12 }}>
        {teams.map((t) => (
          <TeamLiveCard
            key={t.id}
            team={t}
            config={config}
            onClick={() => openClaim(t.id)}
          />
        ))}
      </div>

      {/* CLAIM — fullscreen para mostrar el tablero del equipo */}
      <BottomSheet
        fullscreen
        open={!!(flow && flow.phase === "claim")}
        onOpenChange={(o) => !o && close()}
      >
        {claimingTeam && flow?.phase === "claim" && (
          <div className="stack" style={{ gap: 14 }}>
            <div className="row between">
              <div className="row" style={{ gap: 10 }}>
                <TeamDot color={claimingTeam.color} />
                <h2 className="title">{claimingTeam.name}</h2>
              </div>
              {flow.stealing && (
                <span
                  className="chip"
                  style={
                    {
                      ["--tc" as string]: "var(--amber)",
                      color: "var(--amber)",
                    } as CSSProperties
                  }
                >
                  Robo · otra categoría
                </span>
              )}
            </div>
            <p className="subtitle" style={{ fontSize: 13 }}>
              Toca la categoría que reclaman para esta canción.
            </p>
            <BoardGrid
              cells={claimingTeam.cells}
              size={config.size}
              marked={claimingTeam.marked}
              color={claimingTeam.color}
              onCellTap={pickCell}
            />
          </div>
        )}
      </BottomSheet>

      {/* VALIDATE */}
      <ValidateSheet
        open={!!(flow && flow.phase === "validate")}
        cellIdx={flow && flow.phase === "validate" ? flow.cellIdx : null}
        team={claimingTeam}
        config={config}
        onValidate={validate}
        onClose={close}
      />

      {/* STEAL */}
      <BottomSheet
        open={!!(flow && flow.phase === "steal")}
        onOpenChange={(o) => !o && close()}
      >
        <h2 className="title" style={{ marginBottom: 6 }}>
          Robo de casilla
        </h2>
        <p className="subtitle" style={{ fontSize: 13, marginBottom: 18 }}>
          El equipo falló. Otro puede robar la canción usando <b>otra</b>{" "}
          categoría de su tablero.
        </p>
        <div className="stack" style={{ gap: 10 }}>
          {teams
            .filter(
              (t) =>
                flow && flow.phase === "steal" && t.id !== flow.failedTeam
            )
            .map((t) => (
              <KBCard
                key={t.id}
                className="row between"
                style={{
                  padding: "14px 16px",
                  cursor: "pointer",
                  border: "1px solid var(--line)",
                }}
                onClick={() => steal(t.id)}
              >
                <div className="row" style={{ gap: 10 }}>
                  <TeamDot color={t.color} />
                  <span style={{ fontWeight: 600 }}>{t.name}</span>
                </div>
                <span className="util">robar →</span>
              </KBCard>
            ))}
        </div>
        <KBButton
          variant="ghost"
          block
          style={{ marginTop: 16 }}
          onPress={close}
        >
          Nadie roba
        </KBButton>
      </BottomSheet>

      {/* CELEBRATION (HeroUI AlertDialog) */}
      <WinOverlay celebration={celebration} onClose={clearCelebration} />

      {/* PLAYLISTS */}
      <BottomSheet
        open={showLists}
        onOpenChange={(o) => !o && setShowLists(false)}
      >
        <h2 className="title" style={{ marginBottom: 4 }}>
          <span style={{ color: "var(--spotify)" }}>♫</span> Playlists
        </h2>
        <p className="subtitle" style={{ fontSize: 13, marginBottom: 18 }}>
          Abre la playlist sugerida por cada equipo en Spotify.
        </p>
        <div className="stack" style={{ gap: 10 }}>
          {teams.map((t) => (
            <KBCard
              key={t.id}
              className="row between"
              style={
                {
                  padding: "13px 15px",
                  ["--tc" as string]: tcVar(t.color),
                } as CSSProperties
              }
            >
              <div className="row" style={{ gap: 10, minWidth: 0 }}>
                <TeamDot color={t.color} />
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: 14.5,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.name}
                </span>
              </div>
              {t.playlist ? (
                <KBLinkButton
                  className="btn-sm"
                  href={t.playlist.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: "var(--spotify)",
                    color: "oklch(0.16 0.02 295)",
                    border: "none",
                    textDecoration: "none",
                    flexShrink: 0,
                  }}
                >
                  Abrir →
                </KBLinkButton>
              ) : (
                <span
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--text-faint)",
                    flexShrink: 0,
                  }}
                >
                  sin playlist
                </span>
              )}
            </KBCard>
          ))}
        </div>
      </BottomSheet>
    </div>
  );
}

function TeamLiveCard({
  team,
  config,
  onClick,
}: {
  team: Team;
  config: Config;
  onClick: () => void;
}) {
  const total = team.cells.length;
  const markedCount =
    team.marked.size + team.cells.filter((c) => c.free).length;
  const pts = teamScore(team, team.cells);
  return (
    <KBCard
      className="row between"
      onClick={onClick}
      style={
        {
          padding: 14,
          cursor: "pointer",
          ["--tc" as string]: tcVar(team.color),
          borderColor: team.wins.length
            ? tcVar(team.color)
            : "var(--line-soft)",
        } as CSSProperties
      }
    >
      <div className="row" style={{ gap: 11 }}>
        <TeamDot color={team.color} />
        <div className="stack" style={{ gap: 3, alignItems: "flex-start" }}>
          <span style={{ fontWeight: 600, fontSize: 15.5 }}>{team.name}</span>
          <span
            className="mono"
            style={{ fontSize: 11, color: "var(--text-faint)" }}
          >
            {markedCount}/{total} casillas
            {team.wins.length ? " · 🏆 " + team.wins.length : ""}
          </span>
        </div>
      </div>
      <div className="row" style={{ gap: 12 }}>
        {config.mode === "puntaje" ? (
          <span
            className="mono glow-text"
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: tcVar(team.color),
            }}
          >
            {pts}
          </span>
        ) : (
          <span style={{ fontSize: 20 }}>›</span>
        )}
      </div>
    </KBCard>
  );
}

function ValidateSheet({
  open,
  cellIdx,
  team,
  config,
  onValidate,
  onClose,
}: {
  open: boolean;
  cellIdx: number | null;
  team: Team | null;
  config: Config;
  onValidate: (success: boolean) => void;
  onClose: () => void;
}) {
  const [challenge, setChallenge] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open) {
      setChallenge(null);
      setCount(null);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [open]);

  function startHotMic() {
    setCount(3);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCount((c) => {
        if (c == null) return c;
        if (c <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  const cell = team && cellIdx != null ? team.cells[cellIdx] : null;

  return (
    <BottomSheet open={open} onOpenChange={(o) => !o && onClose()}>
      {team && cell && (
        <>
          <span className="eyebrow">{team.name} reclama</span>
          <div
            className="row between"
            style={{
              alignItems: "flex-start",
              margin: "8px 0 18px",
              gap: 12,
            }}
          >
            <h2 className="title" style={{ flex: 1 }}>
              {cell.label}
            </h2>
            {config.mode === "puntaje" && <DifBadge dif={cell.dif} />}
          </div>

          <span className="eyebrow">Desafío musical</span>
          <div
            className="row"
            style={{ gap: 8, flexWrap: "wrap", margin: "12px 0 22px" }}
          >
            {CHALLENGES.map((ch) => (
              <KBChip
                key={ch.id}
                on={challenge === ch.id}
                onClick={() => setChallenge(ch.id)}
                style={{ fontSize: 12, padding: "8px 12px" }}
              >
                {ch.label}
              </KBChip>
            ))}
          </div>

          <KBCard
            style={{
              padding: 14,
              marginBottom: 20,
              textAlign: "center",
              borderColor: count === 0 ? "var(--rose)" : "var(--line)",
            }}
          >
            <div
              className="row between"
              style={{ marginBottom: 12, gap: 10 }}
            >
              <span
                style={{
                  fontWeight: 600,
                  fontSize: 14,
                  whiteSpace: "nowrap",
                }}
              >
                🎤 Micrófono caliente
              </span>
              <span
                className="subtitle"
                style={{ fontSize: 11.5, whiteSpace: "nowrap" }}
              >
                3s para cantar
              </span>
            </div>
            {count == null ? (
              <KBButton variant="ghost" sm block onPress={startHotMic}>
                Iniciar cuenta atrás
              </KBButton>
            ) : (
              <div
                className="mono glow-text"
                style={{
                  fontSize: 52,
                  fontWeight: 700,
                  lineHeight: 1,
                  color: count === 0 ? "var(--rose)" : "var(--accent)",
                }}
              >
                {count === 0 ? "¡FUERA!" : count}
              </div>
            )}
          </KBCard>

          <div className="row" style={{ gap: 10 }}>
            <KBButton
              block
              onPress={() => onValidate(false)}
              style={{
                background:
                  "color-mix(in oklch, var(--rose) 16%, transparent)",
                color: "var(--rose)",
                border:
                  "1px solid color-mix(in oklch, var(--rose) 40%, transparent)",
              }}
            >
              ✕ Falló
            </KBButton>
            <KBButton
              block
              onPress={() => onValidate(true)}
              style={{
                background: "var(--lime)",
                color: "oklch(0.16 0.02 295)",
                border: "none",
              }}
            >
              ✓ Validó — cantó
            </KBButton>
          </div>
        </>
      )}
    </BottomSheet>
  );
}

function GameTimer() {
  const [sec, setSec] = useState(0);
  const [run, setRun] = useState(false);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (run) ref.current = setInterval(() => setSec((s) => s + 1), 1000);
    return () => {
      if (ref.current) clearInterval(ref.current);
    };
  }, [run]);
  const mm = String(Math.floor(sec / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");
  return (
    <KBChip
      className="mono"
      onClick={() => setRun(!run)}
      onDoubleClick={() => {
        setSec(0);
        setRun(false);
      }}
      style={{
        fontSize: 14,
        padding: "8px 12px",
        color: run ? "var(--accent)" : "var(--text-dim)",
      }}
    >
      {run ? "⏸" : "▶"} {mm}:{ss}
    </KBChip>
  );
}

function WinOverlay({
  celebration,
  onClose,
}: {
  celebration: Celebration | null;
  onClose: () => void;
}) {
  return (
    <Modal.Backdrop
      isOpen={!!celebration}
      onOpenChange={(o) => !o && onClose()}
      variant="opaque"
    >
      <Modal.Container
        placement="center"
        size="sm"
        className="min-h-screen! flex! items-center! justify-center!"
      >
        <Modal.Dialog
          className="card"
          style={
            {
              ["--tc" as string]: celebration ? tcVar(celebration.color) : "",
              padding: "32px 26px",
              textAlign: "center",
              background: "var(--surface)",
              border: celebration
                ? `1px solid ${tcVar(celebration.color)}`
                : "1px solid var(--line)",
              boxShadow: celebration
                ? `0 0 50px -10px ${tcVar(celebration.color)}`
                : undefined,
              animation: "pop .4s cubic-bezier(.2,.9,.3,1.2)",
            } as CSSProperties
          }
        >
          {celebration && (
            <>
              <div style={{ fontSize: 56, marginBottom: 10 }}>🏆</div>
              <span
                className="eyebrow"
                style={{ color: tcVar(celebration.color) }}
              >
                {celebration.type}
              </span>
              <h1
                className="title glow-text"
                style={{ fontSize: 30, margin: "8px 0 6px" }}
              >
                {celebration.name}
              </h1>
              <p className="subtitle" style={{ fontSize: 14 }}>
                {celebration.final
                  ? "¡Gana la partida!"
                  : "¡Casilla completada! Sigue jugando o termina."}
              </p>
              <HButton
                slot="close"
                onPress={onClose}
                className="btn btn-primary block"
                variant="tertiary"
                style={{ marginTop: 22 }}
              >
                Seguir
              </HButton>
            </>
          )}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
