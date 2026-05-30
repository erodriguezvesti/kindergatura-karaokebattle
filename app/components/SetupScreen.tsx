"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
} from "react";
import { validatePlaylist } from "../actions/spotify";
import { TEAM_COLORS } from "../lib/data";
import { tcVar } from "../lib/game";
import type { Category, Config, Team, TeamColor } from "../lib/types";
import {
  KBButton,
  KBCard,
  KBInput,
  ScreenHeader,
  Segmented,
  TeamDot,
} from "./ui";

const STEPS = ["Equipos", "Playlists", "Reglas"] as const;

type Props = {
  config: Config;
  setConfig: (c: Config) => void;
  teams: Team[];
  setTeams: (t: Team[]) => void;
  categories: Category[];
  onGenerate: () => void;
  isGenerating: boolean;
  generateError: string | null;
};

export function SetupScreen({
  config,
  setConfig,
  teams,
  setTeams,
  categories,
  onGenerate,
  isGenerating,
  generateError,
}: Props) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [pending, startTr] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validating, setValidating] = useState<Record<string, boolean>>({});
  const lastValidatedRef = useRef<Record<string, string>>({});
  const usedColors = teams.map((t) => t.color);

  // Auto-validate teams whose raw playlist hasn't been validated yet,
  // whenever we enter step 2.
  useEffect(() => {
    if (step !== 1) return;
    teams.forEach((t) => {
      const raw = (t.playlistRaw || "").trim();
      if (!raw) return;
      if (lastValidatedRef.current[t.id] === raw) return;
      void runValidate(t.id, raw);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function runValidate(teamId: string, raw: string) {
    if (!raw.trim()) return;
    lastValidatedRef.current[teamId] = raw;
    setValidating((p) => ({ ...p, [teamId]: true }));
    startTr(async () => {
      const result = await validatePlaylist(raw);
      setValidating((p) => ({ ...p, [teamId]: false }));
      if (result.ok) {
        setErrors((p) => {
          const { [teamId]: _omit, ...rest } = p;
          return rest;
        });
        setTeams(
          teams.map((t) =>
            t.id === teamId ? { ...t, playlist: result.playlist } : t
          )
        );
      } else {
        setErrors((p) => ({ ...p, [teamId]: result.error }));
        setTeams(
          teams.map((t) =>
            t.id === teamId ? { ...t, playlist: null } : t
          )
        );
      }
    });
  }

  function addTeam() {
    const free =
      TEAM_COLORS.find((c) => !usedColors.includes(c)) ||
      TEAM_COLORS[teams.length % TEAM_COLORS.length];
    setTeams([
      ...teams,
      {
        id: "t" + Date.now(),
        name: "",
        color: free,
        playlistRaw: "",
        playlist: null,
        cells: [],
        marked: new Set(),
        wins: [],
      },
    ]);
  }
  function updateTeam(id: string, patch: Partial<Team>) {
    setTeams(teams.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }
  function removeTeam(id: string) {
    setTeams(teams.filter((t) => t.id !== id));
  }
  function onPlaylistInput(id: string, raw: string) {
    // Clear validation state until user blurs / step re-enters.
    updateTeam(id, { playlistRaw: raw, playlist: null });
    if (errors[id]) {
      setErrors((p) => {
        const { [id]: _omit, ...rest } = p;
        return rest;
      });
    }
  }

  const slots = config.size * config.size;
  const teamsOk = teams.length >= 2 && teams.every((t) => t.name.trim());
  const listsOk = teams.length >= 2 && teams.every((t) => t.playlist);
  const catsOk =
    categories.length >= (config.size % 2 ? slots - 1 : slots);
  const totalTracks = teams.reduce(
    (s, t) => s + (t.playlist?.trackCount || 0),
    0
  );
  const connected = teams.filter((t) => t.playlist).length;

  const stepReady = [teamsOk, listsOk, catsOk][step];
  function next() {
    if (stepReady) setStep((s) => Math.min(2, s + 1) as 0 | 1 | 2);
  }
  function back() {
    setStep((s) => Math.max(0, s - 1) as 0 | 1 | 2);
  }

  return (
    <div className="screen-pad">
      <ScreenHeader
        eyebrow={`Paso ${step + 1} de 3 · ${STEPS[step]}`}
        title="Nueva partida"
      />

      <div className="row" style={{ gap: 6, marginBottom: 24 }}>
        {STEPS.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => i < step && setStep(i as 0 | 1 | 2)}
            style={{
              flex: 1,
              cursor: i < step ? "pointer" : "default",
              background: "none",
              border: "none",
              padding: 0,
            }}
            aria-label={`Paso ${i + 1}: ${s}`}
          >
            <div
              style={{
                height: 4,
                borderRadius: 3,
                background: i <= step ? "var(--accent)" : "var(--line)",
                transition: "background .25s ease",
              }}
            />
          </button>
        ))}
      </div>

      {/* PASO 1 · EQUIPOS */}
      {step === 0 && (
        <div>
          <div className="row between" style={{ marginBottom: 12 }}>
            <span className="eyebrow">Equipos · {teams.length}</span>
            <KBButton variant="ghost" sm onPress={addTeam}>
              + Agregar
            </KBButton>
          </div>
          <div className="stack" style={{ gap: 10 }}>
            {teams.map((t) => (
              <KBCard key={t.id} style={{ padding: 12 }}>
                <div className="row" style={{ gap: 10 }}>
                  <TeamDot color={t.color} />
                  <KBInput
                    style={{ flex: 1 }}
                    placeholder="Nombre del equipo"
                    value={t.name}
                    onChange={(e) =>
                      updateTeam(t.id, { name: e.target.value })
                    }
                    aria-label="Nombre del equipo"
                  />
                  <KBButton
                    variant="ghost"
                    iconOnly
                    onPress={() => removeTeam(t.id)}
                    aria-label="Eliminar equipo"
                  >
                    ✕
                  </KBButton>
                </div>
                <div
                  className="row"
                  style={{ gap: 8, marginTop: 12, flexWrap: "wrap" }}
                >
                  {TEAM_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => updateTeam(t.id, { color: c })}
                      aria-label={`Color ${c}`}
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        cursor: "pointer",
                        background: tcVar(c),
                        border:
                          t.color === c
                            ? "2px solid var(--text)"
                            : "2px solid transparent",
                        boxShadow:
                          t.color === c ? "0 0 10px " + tcVar(c) : "none",
                      }}
                    />
                  ))}
                </div>
              </KBCard>
            ))}
            {teams.length < 2 && (
              <p className="subtitle" style={{ fontSize: 13 }}>
                Agrega al menos 2 equipos.
              </p>
            )}
          </div>
        </div>
      )}

      {/* PASO 2 · PLAYLISTS */}
      {step === 1 && (
        <div>
          <p
            className="subtitle"
            style={{ fontSize: 13.5, marginBottom: 18, marginTop: -6 }}
          >
            Cada equipo sugiere su playlist de Spotify. De ahí sale el pool de
            canciones de la partida.
          </p>
          <div className="stack" style={{ gap: 10, marginBottom: 22 }}>
            {teams.map((t) => (
              <KBCard
                key={t.id}
                style={
                  {
                    padding: 14,
                    ["--tc" as string]: tcVar(t.color),
                    borderColor: t.playlist
                      ? "color-mix(in oklch, var(--spotify) 35%, var(--line-soft))"
                      : "var(--line-soft)",
                  } as CSSProperties
                }
              >
                <div className="row between" style={{ marginBottom: 11 }}>
                  <div className="row" style={{ gap: 10, minWidth: 0 }}>
                    <TeamDot color={t.color} />
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: 15,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {t.name || "Equipo"}
                    </span>
                  </div>
                  {t.playlist && (
                    <span
                      className="chip mono"
                      style={{
                        color: "var(--spotify)",
                        borderColor:
                          "color-mix(in oklch, var(--spotify) 45%, transparent)",
                        flexShrink: 0,
                      }}
                    >
                      ♫ {t.playlist.trackCount} canciones
                    </span>
                  )}
                  {validating[t.id] && !t.playlist && (
                    <span
                      className="mono"
                      style={{ fontSize: 11, color: "var(--text-faint)" }}
                    >
                      Validando…
                    </span>
                  )}
                </div>
                {t.playlist && (
                  <div
                    className="subtitle mono"
                    style={{ fontSize: 11, marginBottom: 8 }}
                  >
                    {t.playlist.name} · {t.playlist.owner}
                  </div>
                )}
                <div className="row" style={{ gap: 8 }}>
                  <span
                    style={{
                      flex: "0 0 auto",
                      color: "var(--spotify)",
                      fontSize: 18,
                    }}
                  >
                    ♫
                  </span>
                  <KBInput
                    style={{ flex: 1, fontSize: 13.5 }}
                    placeholder="open.spotify.com/playlist/…"
                    value={t.playlistRaw || ""}
                    onChange={(e) => onPlaylistInput(t.id, e.target.value)}
                    onBlur={(e) => runValidate(t.id, e.target.value)}
                    aria-label="Playlist Spotify"
                  />
                </div>
                {errors[t.id] && (
                  <div
                    className="row"
                    style={{ gap: 6, marginTop: 9, paddingLeft: 26 }}
                  >
                    <span
                      className="chip mono"
                      style={{
                        color: "var(--rose)",
                        borderColor:
                          "color-mix(in oklch, var(--rose) 45%, transparent)",
                      }}
                    >
                      {errors[t.id]}
                    </span>
                  </div>
                )}
              </KBCard>
            ))}
          </div>

          <KBCard
            style={{
              padding: 18,
              textAlign: "center",
              borderColor:
                "color-mix(in oklch, var(--spotify) 30%, var(--line))",
              background:
                "color-mix(in oklch, var(--spotify) 7%, var(--surface))",
            }}
          >
            <div
              className="mono glow-text"
              style={
                {
                  fontSize: 46,
                  fontWeight: 700,
                  color: "var(--spotify)",
                  lineHeight: 1,
                  ["--accent" as string]: "var(--spotify)",
                } as CSSProperties
              }
            >
              {totalTracks}
            </div>
            <div style={{ fontWeight: 600, fontSize: 14, marginTop: 6 }}>
              canciones en el pool
            </div>
            <div
              className="subtitle mono"
              style={{ fontSize: 11.5, marginTop: 6 }}
            >
              {connected}/{teams.length} playlists conectadas
            </div>
          </KBCard>
          <p
            className="subtitle"
            style={{
              fontSize: 11.5,
              textAlign: "center",
              marginTop: 12,
              lineHeight: 1.5,
            }}
          >
            En la partida el host reproduce canciones del pool y se abren
            directo en Spotify.
          </p>
        </div>
      )}

      {/* PASO 3 · MODO Y REGLAS */}
      {step === 2 && (
        <div>
          <span className="eyebrow">Modo de juego</span>
          <div style={{ marginTop: 10, marginBottom: 14 }}>
            <Segmented
              value={config.mode}
              onChange={(v) => setConfig({ ...config, mode: v })}
              options={[
                { value: "clasico", label: "Clásico" },
                { value: "puntaje", label: "Por puntaje" },
              ]}
            />
          </div>
          <p className="subtitle" style={{ fontSize: 13, marginBottom: 24 }}>
            {config.mode === "clasico"
              ? "Gana quien complete una línea, columna, diagonal o el cartón completo."
              : "Cada casilla suma según dificultad (1 / 2 / 3 pts). Gana el mayor puntaje."}
          </p>

          <span className="eyebrow">Tamaño del tablero</span>
          <div style={{ marginTop: 10, marginBottom: 6 }}>
            <Segmented
              value={config.size}
              onChange={(v) => setConfig({ ...config, size: v })}
              options={[
                { value: 4, label: "4 × 4 · rápida" },
                { value: 5, label: "5 × 5 · fiesta" },
              ]}
            />
          </div>
          <p className="subtitle" style={{ fontSize: 13, marginBottom: 12 }}>
            {config.size === 5
              ? "25 casillas con centro 🎤 libre."
              : "16 casillas, sin casilla libre."}
          </p>
        </div>
      )}

      <div className="row" style={{ gap: 10, marginTop: 26 }}>
        {step > 0 && (
          <KBButton variant="ghost" onPress={back} style={{ flex: "0 0 auto" }}>
            ← Atrás
          </KBButton>
        )}
        {step < 2 ? (
          <KBButton
            variant="primary"
            block
            isDisabled={!stepReady}
            onPress={next}
            style={{ padding: 15 }}
          >
            Siguiente →
          </KBButton>
        ) : (
          <KBButton
            variant="primary"
            block
            isDisabled={!stepReady || isGenerating}
            onPress={onGenerate}
            style={{ padding: 15 }}
          >
            {isGenerating
              ? "Cargando tracks de Spotify…"
              : "Generar tableros únicos →"}
          </KBButton>
        )}
      </div>
      {!stepReady && (
        <p
          className="subtitle"
          style={{ fontSize: 12, textAlign: "center", marginTop: 12 }}
        >
          {stepHint(step)}
        </p>
      )}
      {generateError && (
        <p
          className="subtitle"
          style={{
            fontSize: 12,
            textAlign: "center",
            marginTop: 8,
            color: "var(--rose)",
          }}
        >
          {generateError}
        </p>
      )}
      {pending && (
        <p
          className="subtitle mono"
          style={{ fontSize: 11, textAlign: "center", marginTop: 8 }}
        >
          Sincronizando con Spotify…
        </p>
      )}
    </div>
  );
}

function stepHint(step: number): string {
  if (step === 0) return "Agrega al menos 2 equipos con nombre.";
  if (step === 1)
    return "Pegá una playlist pública de Spotify para cada equipo.";
  return "Faltan categorías para este tamaño de tablero.";
}

export type { TeamColor };
