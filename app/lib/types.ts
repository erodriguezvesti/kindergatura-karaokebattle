export type TeamColor =
  | "magenta"
  | "cyan"
  | "lime"
  | "amber"
  | "violet"
  | "rose";

export type Difficulty = 1 | 2 | 3;

export type Category = {
  id: string;
  label: string;
  dif: Difficulty;
};

export type Cell =
  | { free: true; label: string; dif: 0; catId: "free" }
  | { free: false; label: string; dif: Difficulty; catId: string };

import type { SpotifyPlaylistInfo } from "./spotify-types";

export type Team = {
  id: string;
  name: string;
  color: TeamColor;
  playlistRaw: string;
  playlist: SpotifyPlaylistInfo | null;
  cells: Cell[];
  marked: Set<number>;
  wins: Win[];
};

export type Mode = "clasico" | "puntaje";

export type Size = 4 | 5;

export type Config = {
  mode: Mode;
  size: Size;
};

export type Win = {
  type: "Línea" | "Columna" | "Diagonal" | "Cartón completo";
  idx: number[];
};

export type Track = { t: string; a: string; uri?: string };

export type Challenge = { id: string; label: string; icon: string };

export type Celebration = {
  name: string;
  color: TeamColor;
  type: string;
  final: boolean;
};

export type Screen =
  | "setup"
  | "categorias"
  | "tableros"
  | "partida"
  | "marcador"
  | "win";
