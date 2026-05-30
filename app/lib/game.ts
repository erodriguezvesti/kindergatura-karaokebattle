import type {
  Category,
  Cell,
  Size,
  Team,
  TeamColor,
  Track,
  Win,
} from "./types";

export const TC_HEX: Record<TeamColor, string> = {
  magenta: "oklch(0.72 0.205 350)",
  cyan: "oklch(0.78 0.135 205)",
  lime: "oklch(0.85 0.205 130)",
  amber: "oklch(0.82 0.165 70)",
  violet: "oklch(0.72 0.175 295)",
  rose: "oklch(0.74 0.175 18)",
};

export function tcVar(color: TeamColor | string): string {
  return TC_HEX[color as TeamColor] || "var(--accent)";
}

export function spotifySearchUrl(track: Track): string {
  const q = encodeURIComponent((track.t + " " + track.a).trim());
  return "https://open.spotify.com/search/" + q;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateBoard(categories: Category[], size: Size): Cell[] {
  const need = size * size;
  const hasFree = size % 2 === 1;
  const slots = hasFree ? need - 1 : need;
  let pool = shuffle(categories);
  while (pool.length < slots) pool = pool.concat(shuffle(categories));
  const picked = pool.slice(0, slots);
  const cells: Cell[] = [];
  let pi = 0;
  const center = Math.floor(need / 2);
  for (let i = 0; i < need; i++) {
    if (hasFree && i === center) {
      cells.push({ free: true, label: "LIBRE", dif: 0, catId: "free" });
    } else {
      const c = picked[pi++];
      cells.push({ free: false, label: c.label, dif: c.dif, catId: c.id });
    }
  }
  return cells;
}

export function getWins(
  marked: Set<number>,
  cells: Cell[],
  size: Size
): Win[] {
  const lines: Win[] = [];
  const isMarked = (i: number) => cells[i].free || marked.has(i);
  for (let r = 0; r < size; r++) {
    const idx: number[] = [];
    for (let c = 0; c < size; c++) idx.push(r * size + c);
    if (idx.every(isMarked)) lines.push({ type: "Línea", idx });
  }
  for (let c = 0; c < size; c++) {
    const idx: number[] = [];
    for (let r = 0; r < size; r++) idx.push(r * size + c);
    if (idx.every(isMarked)) lines.push({ type: "Columna", idx });
  }
  const d1: number[] = [];
  const d2: number[] = [];
  for (let i = 0; i < size; i++) {
    d1.push(i * size + i);
    d2.push(i * size + (size - 1 - i));
  }
  if (d1.every(isMarked)) lines.push({ type: "Diagonal", idx: d1 });
  if (d2.every(isMarked)) lines.push({ type: "Diagonal", idx: d2 });
  const all = cells.map((_, i) => i);
  if (all.every(isMarked)) lines.push({ type: "Cartón completo", idx: all });
  return lines;
}

export function teamScore(team: Team, cells: Cell[]): number {
  let pts = 0;
  team.marked.forEach((i) => {
    pts += (cells[i] && cells[i].dif) || 0;
  });
  return pts;
}
