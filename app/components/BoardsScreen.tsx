"use client";

import { useState, type CSSProperties } from "react";
import { tcVar } from "../lib/game";
import type { Config, Team } from "../lib/types";
import {
  BoardGrid,
  KBButton,
  KBCard,
  KBChip,
  ScreenHeader,
  TeamDot,
} from "./ui";

type Props = {
  teams: Team[];
  config: Config;
  onRegen: (id: string) => void;
  onRegenAll: () => void;
  onPrint: () => void;
  onStart: () => void;
};

export function BoardsScreen({
  teams,
  config,
  onRegen,
  onRegenAll,
  onPrint,
  onStart,
}: Props) {
  const [active, setActive] = useState(0);
  const team = teams[active];
  if (!team)
    return (
      <div className="screen-pad">
        <p className="subtitle">Genera tableros desde Configurar.</p>
      </div>
    );

  return (
    <div className="screen-pad">
      <ScreenHeader
        eyebrow={`${config.size}×${config.size} · ${teams.length} tableros`}
        title="Tableros"
        action={
          <KBButton variant="ghost" sm onPress={onRegenAll}>
            ↻ Todos
          </KBButton>
        }
      />

      <div
        className="row"
        style={{
          gap: 8,
          marginBottom: 18,
          overflowX: "auto",
          paddingBottom: 4,
        }}
      >
        {teams.map((t, i) => (
          <KBChip
            key={t.id}
            on={active === i}
            onClick={() => setActive(i)}
            style={
              {
                ["--tc" as string]: tcVar(t.color),
                flexShrink: 0,
              } as CSSProperties
            }
          >
            <span
              className="dot"
              style={
                {
                  ["--tc" as string]:
                    active === i ? "currentColor" : tcVar(t.color),
                  width: 7,
                  height: 7,
                } as CSSProperties
              }
            />
            {t.name}
          </KBChip>
        ))}
      </div>

      <KBCard
        style={
          {
            padding: 14,
            ["--tc" as string]: tcVar(team.color),
          } as CSSProperties
        }
      >
        <div className="row between" style={{ marginBottom: 14 }}>
          <div className="row" style={{ gap: 9 }}>
            <TeamDot color={team.color} />
            <span style={{ fontWeight: 600, fontSize: 16 }}>{team.name}</span>
          </div>
          <KBButton variant="ghost" sm onPress={() => onRegen(team.id)}>
            ↻ Regenerar
          </KBButton>
        </div>
        <BoardGrid
          cells={team.cells}
          size={config.size}
          marked={new Set()}
          color={team.color}
        />
      </KBCard>

      <div className="row" style={{ gap: 10, marginTop: 22 }}>
        <KBButton variant="ghost" block onPress={onPrint}>
          🖨 Imprimir todos
        </KBButton>
        <KBButton variant="primary" block onPress={onStart}>
          Empezar partida
        </KBButton>
      </div>
      <p
        className="subtitle"
        style={{ fontSize: 12.5, textAlign: "center", marginTop: 14 }}
      >
        Cada tablero es único. Imprime en papel para repartir, o juega marcando
        desde el teléfono.
      </p>
    </div>
  );
}
