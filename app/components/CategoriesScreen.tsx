"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { Category, Difficulty } from "../lib/types";
import {
  BottomSheet,
  DifBadge,
  KBButton,
  KBCard,
  KBChip,
  KBInput,
  ScreenHeader,
  Segmented,
} from "./ui";

type Props = {
  categories: Category[];
  setCategories: (c: Category[]) => void;
};

const DIF_COLOR: Record<Difficulty, string> = {
  1: "var(--lime)",
  2: "var(--amber)",
  3: "var(--rose)",
};

type EditingCat = Category | { id?: undefined; label: string; dif: Difficulty };

export function CategoriesScreen({ categories, setCategories }: Props) {
  const [filter, setFilter] = useState<0 | Difficulty>(0);
  const [editing, setEditing] = useState<EditingCat | null>(null);
  const counts: Record<Difficulty, number> = { 1: 0, 2: 0, 3: 0 };
  categories.forEach((c) => counts[c.dif]++);
  const list = categories.filter((c) => !filter || c.dif === filter);

  function save(cat: EditingCat) {
    if (cat.id) {
      setCategories(
        categories.map((c) => (c.id === cat.id ? (cat as Category) : c))
      );
    } else {
      setCategories([
        ...categories,
        { ...cat, id: "c" + Date.now() } as Category,
      ]);
    }
    setEditing(null);
  }
  function del(id: string) {
    setCategories(categories.filter((c) => c.id !== id));
    setEditing(null);
  }

  return (
    <div className="screen-pad">
      <ScreenHeader
        eyebrow={`${categories.length} categorías`}
        title="Banco de categorías"
        action={
          <KBButton
            variant="primary"
            sm
            onPress={() => setEditing({ label: "", dif: 1 })}
          >
            + Nueva
          </KBButton>
        }
      />

      <div
        className="row"
        style={{ gap: 8, marginBottom: 18, flexWrap: "wrap" }}
      >
        {(
          [
            [0, "Todas", categories.length],
            [1, "Fácil", counts[1]],
            [2, "Media", counts[2]],
            [3, "Difícil", counts[3]],
          ] as const
        ).map(([v, l, n]) => (
          <KBChip
            key={v}
            on={filter === v}
            onClick={() => setFilter(v)}
            style={
              filter === v
                ? ({
                    ["--tc" as string]: v
                      ? DIF_COLOR[v as Difficulty]
                      : "var(--accent)",
                  } as CSSProperties)
                : undefined
            }
          >
            {l} · {n}
          </KBChip>
        ))}
      </div>

      <div className="stack" style={{ gap: 8 }}>
        {list.map((c) => (
          <KBCard
            key={c.id}
            className="row between"
            style={{ padding: "13px 14px", cursor: "pointer" }}
            onClick={() => setEditing(c)}
          >
            <div className="row" style={{ gap: 11 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: DIF_COLOR[c.dif],
                  flex: "0 0 8px",
                }}
              />
              <span style={{ fontSize: 14.5, fontWeight: 500 }}>{c.label}</span>
            </div>
            <DifBadge dif={c.dif} />
          </KBCard>
        ))}
      </div>

      <CategoryEditor
        cat={editing}
        onSave={save}
        onDelete={del}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}

function CategoryEditor({
  cat,
  onSave,
  onClose,
  onDelete,
}: {
  cat: EditingCat | null;
  onSave: (c: EditingCat) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const [label, setLabel] = useState("");
  const [dif, setDif] = useState<Difficulty>(1);
  useEffect(() => {
    if (cat) {
      setLabel(cat.label || "");
      setDif(cat.dif || 1);
    }
  }, [cat]);

  return (
    <BottomSheet open={!!cat} onOpenChange={(o) => !o && onClose()}>
      {cat && (
        <>
          <h2 className="title" style={{ marginBottom: 18 }}>
            {cat.id ? "Editar categoría" : "Nueva categoría"}
          </h2>
          <span className="eyebrow">Categoría musical</span>
          <KBInput
            style={{ margin: "10px 0 20px" }}
            placeholder="Ej: Canción de despecho"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            autoFocus
            aria-label="Categoría musical"
          />
          <span className="eyebrow">Dificultad / puntaje</span>
          <div style={{ marginTop: 10, marginBottom: 24 }}>
            <Segmented<Difficulty>
              value={dif}
              onChange={setDif}
              options={[
                { value: 1, label: "Fácil · 1" },
                { value: 2, label: "Media · 2" },
                { value: 3, label: "Difícil · 3" },
              ]}
            />
          </div>
          <div className="row" style={{ gap: 10 }}>
            {cat.id && (
              <KBButton
                variant="ghost"
                iconOnly
                onPress={() => onDelete(cat.id!)}
                aria-label="Eliminar"
                style={{ color: "var(--rose)" }}
              >
                🗑
              </KBButton>
            )}
            <KBButton
              variant="primary"
              block
              isDisabled={!label.trim()}
              onPress={() => onSave({ ...cat, label: label.trim(), dif })}
            >
              Guardar
            </KBButton>
          </div>
        </>
      )}
    </BottomSheet>
  );
}
