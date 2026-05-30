"use client";

import type { CSSProperties } from "react";
import { tcVar, teamScore } from "../lib/game";
import type { Config, Team } from "../lib/types";
import { KBButton } from "./ui";

type Props = {
  winner: Team | null;
  config: Config;
  onAgain: () => void;
  onScores: () => void;
};

export function WinScreen({ winner, config, onAgain, onScores }: Props) {
  if (!winner) return null;
  const pts = teamScore(winner, winner.cells);
  return (
    <div
      className="screen-pad"
      style={
        {
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100%",
          textAlign: "center",
          ["--tc" as string]: tcVar(winner.color),
        } as CSSProperties
      }
    >
      <div
        style={{
          fontSize: 72,
          marginBottom: 4,
          animation: "pop .5s cubic-bezier(.2,.9,.3,1.2)",
        }}
      >
        🏆
      </div>
      <span className="eyebrow" style={{ color: tcVar(winner.color) }}>
        Ganador de la batalla
      </span>
      <h1
        className="title glow-text"
        style={
          {
            fontSize: 38,
            margin: "10px 0 14px",
            ["--accent" as string]: tcVar(winner.color),
          } as CSSProperties
        }
      >
        {winner.name}
      </h1>
      {config.mode === "puntaje" ? (
        <div
          className="mono glow-text"
          style={
            {
              fontSize: 60,
              fontWeight: 700,
              color: tcVar(winner.color),
              ["--accent" as string]: tcVar(winner.color),
            } as CSSProperties
          }
        >
          {pts}
          <span style={{ fontSize: 20 }}> pts</span>
        </div>
      ) : (
        <p className="subtitle" style={{ fontSize: 15 }}>
          {winner.wins.map((w) => w.type).join(" · ") || "Mejor desempeño"}
        </p>
      )}
      <div
        className="stack"
        style={{ gap: 10, marginTop: 34, width: "100%", maxWidth: 280 }}
      >
        <KBButton variant="ghost" block onPress={onScores}>
          Ver marcador final
        </KBButton>
        <KBButton variant="primary" block onPress={onAgain}>
          Nueva partida
        </KBButton>
      </div>
    </div>
  );
}
