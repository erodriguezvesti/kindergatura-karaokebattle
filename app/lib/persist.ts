import type {
  Category,
  Config,
  Screen,
  Team,
  Track,
} from "./types";

const STORAGE_KEY = "karaoke-battle:v1";

type SerializedTeam = Omit<Team, "marked"> & { marked: number[] };

export type PersistedSnapshot = {
  v: 1;
  screen: Screen;
  config: Config;
  teams: SerializedTeam[];
  categories: Category[];
  round: number;
  generated: boolean;
  winner: SerializedTeam | null;
  pool: Track[];
  trackOrder: number[];
};

function serializeTeam(t: Team): SerializedTeam {
  return { ...t, marked: Array.from(t.marked) };
}

function deserializeTeam(t: SerializedTeam): Team {
  return { ...t, marked: new Set<number>(t.marked ?? []) };
}

export function saveSnapshot(s: {
  screen: Screen;
  config: Config;
  teams: Team[];
  categories: Category[];
  round: number;
  generated: boolean;
  winner: Team | null;
  pool: Track[];
  trackOrder: number[];
}) {
  if (typeof window === "undefined") return;
  try {
    const data: PersistedSnapshot = {
      v: 1,
      screen: s.screen,
      config: s.config,
      teams: s.teams.map(serializeTeam),
      categories: s.categories,
      round: s.round,
      generated: s.generated,
      winner: s.winner ? serializeTeam(s.winner) : null,
      pool: s.pool,
      trackOrder: s.trackOrder,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("[karaoke-battle] no pude guardar el estado:", e);
  }
}

export type LoadedSnapshot = {
  screen: Screen;
  config: Config;
  teams: Team[];
  categories: Category[];
  round: number;
  generated: boolean;
  winner: Team | null;
  pool: Track[];
  trackOrder: number[];
};

export function loadSnapshot(): LoadedSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PersistedSnapshot;
    if (data.v !== 1) return null;
    if (!Array.isArray(data.teams) || !Array.isArray(data.categories))
      return null;
    return {
      screen: data.screen,
      config: data.config,
      teams: data.teams.map(deserializeTeam),
      categories: data.categories,
      round: data.round,
      generated: data.generated,
      winner: data.winner ? deserializeTeam(data.winner) : null,
      pool: data.pool || [],
      trackOrder: data.trackOrder || [],
    };
  } catch (e) {
    console.warn("[karaoke-battle] no pude cargar el estado:", e);
    return null;
  }
}

export function clearSnapshot() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
