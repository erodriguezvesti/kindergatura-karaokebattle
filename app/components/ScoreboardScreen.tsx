"use client";

import type { CSSProperties } from "react";
import { tcVar, teamScore } from "../lib/game";
import type { Config, Team } from "../lib/types";
import {
  KBButton,
  KBCard,
  KBProgress,
  ScreenHeader,
  TeamDot,
} from "./ui";

type Props = {
  teams: Team[];
  config: Config;
  onEnd: (top: Team) => void;
  onReset: () => void;
};

export function ScoreboardScreen({ teams, config, onEnd, onReset }: Props) {
  const ranked = [...teams].sort((a, b) => {
    if (config.mode === "puntaje")
      return teamScore(b, b.cells) - teamScore(a, a.cells);
    const bm = b.marked.size + b.cells.filter((c) => c.free).length;
    const am = a.marked.size + a.cells.filter((c) => c.free).length;
    return b.wins.length - a.wins.length || bm - am;
  });
  const maxPts = Math.max(1, ...teams.map((t) => teamScore(t, t.cells)));

  return (
    <div className="screen-pad">
      <ScreenHeader
        eyebrow={
          config.mode === "clasico"
            ? "Líneas · cartón"
            : "Puntaje acumulado"
        }
        title="Marcador"
      />
      <div className="stack" style={{ gap: 12 }}>
        {ranked.map((t, i) => {
          const pts = teamScore(t, t.cells);
          const total = t.cells.length;
          const markedCount =
            t.marked.size + t.cells.filter((c) => c.free).length;
          const pct =
            config.mode === "puntaje"
              ? (pts / maxPts) * 100
              : (markedCount / total) * 100;
          return (
            <KBCard
              key={t.id}
              style={
                {
                  padding: 16,
                  ["--tc" as string]: tcVar(t.color),
                } as CSSProperties
              }
            >
              <div className="row between" style={{ marginBottom: 12 }}>
                <div className="row" style={{ gap: 12 }}>
                  <span
                    className="mono"
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: i === 0 ? tcVar(t.color) : "var(--text-faint)",
                      width: 26,
                    }}
                  >
                    {i + 1}
                  </span>
                  <TeamDot color={t.color} />
                  <span style={{ fontWeight: 600, fontSize: 16 }}>
                    {t.name}
                  </span>
                </div>
                {config.mode === "puntaje" ? (
                  <span
                    className="mono glow-text"
                    style={{
                      fontSize: 26,
                      fontWeight: 700,
                      color: tcVar(t.color),
                    }}
                  >
                    {pts}
                  </span>
                ) : (
                  <span
                    className="mono"
                    style={{ fontSize: 14, color: "var(--text-dim)" }}
                  >
                    🏆 {t.wins.length}
                  </span>
                )}
              </div>
              <KBProgress
                value={pct}
                color={tcVar(t.color)}
                ariaLabel={`Progreso de ${t.name}`}
              />
              <div className="row between" style={{ marginTop: 8 }}>
                <span
                  className="mono"
                  style={{ fontSize: 11, color: "var(--text-faint)" }}
                >
                  {markedCount}/{total} casillas
                </span>
                {t.wins.length > 0 && (
                  <span
                    className="mono"
                    style={{ fontSize: 11, color: tcVar(t.color) }}
                  >
                    {t.wins.map((w) => w.type).join(" · ")}
                  </span>
                )}
              </div>
            </KBCard>
          );
        })}
      </div>
      <KBButton
        variant="ghost"
        block
        style={{ marginTop: 22 }}
        onPress={() => onEnd(ranked[0])}
      >
        Terminar y coronar ganador 🏆
      </KBButton>
      <KBButton
        variant="ghost"
        block
        style={{
          marginTop: 10,
          color: "var(--rose)",
          borderColor:
            "color-mix(in oklch, var(--rose) 35%, transparent)",
        }}
        onPress={() => {
          if (
            window.confirm(
              "¿Reiniciar el juego? Vas a perder los puntajes, los tableros y la configuración actual."
            )
          ) {
            onReset();
          }
        }}
      >
        ↺ Reiniciar juego
      </KBButton>
    </div>
  );
}
