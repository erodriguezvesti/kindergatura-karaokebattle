// components.jsx — UI compartida + lógica de juego para Karaoke Battle
const { useState, useEffect, useRef } = React;

/* ---------- Color helpers ---------- */
const TC_HEX = {
  magenta: "oklch(0.72 0.205 350)",
  cyan: "oklch(0.78 0.135 205)",
  lime: "oklch(0.85 0.205 130)",
  amber: "oklch(0.82 0.165 70)",
  violet: "oklch(0.72 0.175 295)",
  rose: "oklch(0.74 0.175 18)",
};
function tcVar(color) { return TC_HEX[color] || "var(--accent)"; }

/* ---------- Spotify helpers (deeplinks reales, sin backend) ---------- */
// Búsqueda directa de la canción: abre Spotify y la deja lista para reproducir.
function spotifySearchUrl(track) {
  const q = encodeURIComponent((track.t + " " + track.a).trim());
  return "https://open.spotify.com/search/" + q;
}
// Parsea un link de playlist y devuelve {id, url} normalizado, o null.
function parseSpotifyPlaylist(raw) {
  if (!raw) return null;
  const s = raw.trim();
  let m = s.match(/playlist[/:]([a-zA-Z0-9]+)/);
  if (m) return { id: m[1], url: "https://open.spotify.com/playlist/" + m[1] };
  m = s.match(/^([a-zA-Z0-9]{22})$/); // id pelado
  if (m) return { id: m[1], url: "https://open.spotify.com/playlist/" + m[1] };
  return null;
}

/* ---------- Board generation ---------- */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Builds a unique board: array of cells {catId, label, dif, free}
function generateBoard(categories, size) {
  const need = size * size;
  const hasFree = size % 2 === 1; // free center on odd boards (5x5)
  const slots = hasFree ? need - 1 : need;
  let pool = shuffle(categories);
  // if not enough categories, allow repeats
  while (pool.length < slots) pool = pool.concat(shuffle(categories));
  const picked = pool.slice(0, slots);
  const cells = [];
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

/* ---------- Winner detection ---------- */
// marked: Set of indices. Returns array of winning line descriptions.
function getWins(marked, cells, size) {
  const lines = [];
  const isMarked = (i) => cells[i].free || marked.has(i);
  // rows
  for (let r = 0; r < size; r++) {
    const idx = []; for (let c = 0; c < size; c++) idx.push(r * size + c);
    if (idx.every(isMarked)) lines.push({ type: "Línea", idx });
  }
  // cols
  for (let c = 0; c < size; c++) {
    const idx = []; for (let r = 0; r < size; r++) idx.push(r * size + c);
    if (idx.every(isMarked)) lines.push({ type: "Columna", idx });
  }
  // diagonals
  const d1 = [], d2 = [];
  for (let i = 0; i < size; i++) { d1.push(i * size + i); d2.push(i * size + (size - 1 - i)); }
  if (d1.every(isMarked)) lines.push({ type: "Diagonal", idx: d1 });
  if (d2.every(isMarked)) lines.push({ type: "Diagonal", idx: d2 });
  // full card
  const all = cells.map((_, i) => i);
  if (all.every(isMarked)) lines.push({ type: "Cartón completo", idx: all });
  return lines;
}

function teamScore(team, cells) {
  // points mode: sum dif of marked cells (free = 0)
  let pts = 0;
  team.marked.forEach((i) => { pts += (cells[i] && cells[i].dif) || 0; });
  return pts;
}

/* ---------- Small UI atoms ---------- */
function StatusBar({ title }) {
  return (
    <div className="statusbar">
      <span className="mono">{title || "9:41"}</span>
      <div className="dots">
        <span></span><span></span><span></span>
      </div>
    </div>
  );
}

function Switch({ on, onChange }) {
  return (
    <div className={"switch" + (on ? " on" : "")} onClick={() => onChange(!on)} role="switch" aria-checked={on}>
      <div className="knob" />
    </div>
  );
}

function Segmented({ value, options, onChange }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o.value} className={value === o.value ? "on" : ""} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function TeamDot({ color }) {
  return <span className="dot" style={{ "--tc": tcVar(color) }} />;
}

function DifBadge({ dif }) {
  if (!dif) return null;
  const map = { 1: ["Fácil", "var(--lime)"], 2: ["Media", "var(--amber)"], 3: ["Difícil", "var(--rose)"] };
  const [label, col] = map[dif];
  return (
    <span className="chip mono" style={{ borderColor: "transparent", color: col, background: "color-mix(in oklch, " + col + " 16%, transparent)" }}>
      {dif} pt
    </span>
  );
}

/* ---------- Board grid (interactive) ---------- */
function BoardGrid({ cells, size, marked, winIdx, onCellTap, color, compact }) {
  const winSet = new Set(winIdx || []);
  return (
    <div className="board" style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, "--tc": tcVar(color) }}>
      {cells.map((cell, i) => {
        const isMarked = cell.free || (marked && marked.has(i));
        const isWin = winSet.has(i);
        return (
          <div
            key={i}
            className={"cell" + (isMarked ? " marked" : "") + (cell.free ? " free" : "")}
            onClick={() => onCellTap && !cell.free && onCellTap(i)}
            style={{
              fontSize: compact ? "8.5px" : undefined,
              boxShadow: isWin ? "0 0 0 2px white, 0 0 14px var(--tc)" : undefined,
            }}
          >
            {cell.free ? <span style={{ fontSize: "15px" }}>🎤</span> : cell.label}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Bottom sheet (portaled to #kb-overlay so it isn't clipped by the scroll area) ---------- */
function Sheet({ open, onClose, children }) {
  if (!open) return null;
  const target = document.getElementById("kb-overlay") || document.body;
  return ReactDOM.createPortal(
    <div className="sheet-scrim" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grip" />
        {children}
      </div>
    </div>,
    target
  );
}

/* ---------- Header block ---------- */
function ScreenHeader({ eyebrow, title, action }) {
  return (
    <div className="row between" style={{ alignItems: "flex-end", marginBottom: 18, marginTop: 8 }}>
      <div className="stack" style={{ gap: 6 }}>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1 className="title">{title}</h1>
      </div>
      {action}
    </div>
  );
}

Object.assign(window, {
  TC_HEX, tcVar, shuffle, generateBoard, getWins, teamScore,
  spotifySearchUrl, parseSpotifyPlaylist,
  StatusBar, Switch, Segmented, TeamDot, DifBadge, BoardGrid, Sheet, ScreenHeader,
});
