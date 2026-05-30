"use client";

import type { Config, Difficulty, Team } from "../lib/types";

const DIF_COLOR: Record<Difficulty, string> = {
  1: "#16a34a",
  2: "#d97706",
  3: "#e11d48",
};

export function PrintSheets({
  teams,
  config,
}: {
  teams: Team[];
  config: Config;
}) {
  return (
    <div style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#111" }}>
      {teams.map((team) => (
        <div
          key={team.id}
          style={{ pageBreakAfter: "always", padding: "4mm 0" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginBottom: "6mm",
              borderBottom: "2px solid #111",
              paddingBottom: "3mm",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "10pt",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "#666",
                }}
              >
                Karaoke Battle · {config.size}×{config.size}
              </div>
              <div
                style={{
                  fontSize: "26pt",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                }}
              >
                {team.name}
              </div>
            </div>
            <div
              style={{
                width: "16mm",
                height: "16mm",
                border: "2px solid #111",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20pt",
              }}
            >
              🎤
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${config.size}, 1fr)`,
              gap: "3mm",
            }}
          >
            {team.cells.map((cell, i) => (
              <div
                key={i}
                style={{
                  aspectRatio: "1 / 1",
                  border: "1.5px solid #111",
                  borderRadius: "10px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  padding: "3mm",
                  position: "relative",
                  background: cell.free ? "#f3f3f3" : "#fff",
                }}
              >
                {!cell.free && config.mode === "puntaje" && (
                  <span
                    style={{
                      position: "absolute",
                      top: "1.5mm",
                      right: "2mm",
                      fontFamily: "'Space Mono', monospace",
                      fontSize: "8pt",
                      fontWeight: 700,
                      color: DIF_COLOR[cell.dif],
                    }}
                  >
                    {cell.dif}pt
                  </span>
                )}
                <span
                  style={{
                    fontSize: config.size === 5 ? "9.5pt" : "11pt",
                    fontWeight: 600,
                    lineHeight: 1.18,
                  }}
                >
                  {cell.free ? "🎤 LIBRE" : cell.label}
                </span>
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: "5mm",
              fontFamily: "'Space Mono', monospace",
              fontSize: "8.5pt",
              color: "#888",
              textAlign: "center",
            }}
          >
            Marca una categoría reclamándola y validándola… cantando. 🎶
          </div>
        </div>
      ))}
    </div>
  );
}
