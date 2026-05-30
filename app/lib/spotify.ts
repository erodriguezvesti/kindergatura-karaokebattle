import "server-only";
import type {
  SpotifyPlaylistInfo,
  SpotifyPlaylistWithTracks,
  SpotifyTrackLite,
} from "./spotify-types";

// Scrapeamos el embed público de Spotify para evitar la API oficial, que
// desde 2024 restringe Development Mode a un puñado de cuentas listadas en
// User Management. El embed es público, no necesita auth y trae la playlist
// completa con todos los tracks en un bloque __NEXT_DATA__ del HTML.

type EmbedTrack = {
  uri?: string;
  title?: string;
  subtitle?: string;
  duration?: number;
  isPlayable?: boolean;
};

type EmbedEntity = {
  id?: string;
  uri?: string;
  type?: string;
  title?: string;
  subtitle?: string;
  coverArt?: { sources?: { url: string }[] | null } | null;
  trackList?: EmbedTrack[] | null;
};

type EmbedNextData = {
  props?: {
    pageProps?: {
      state?: {
        data?: {
          entity?: EmbedEntity;
        };
      };
    };
  };
};

const SCRAPE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  Accept: "text/html,application/xhtml+xml",
};

export function parsePlaylistId(raw: string): string | null {
  if (!raw) return null;
  const s = raw.trim();
  let m = /playlist[/:]([a-zA-Z0-9]+)/.exec(s);
  if (m) return m[1];
  m = /^([a-zA-Z0-9]{22})$/.exec(s);
  if (m) return m[1];
  return null;
}

async function fetchEntity(playlistId: string): Promise<EmbedEntity> {
  const url = `https://open.spotify.com/embed/playlist/${encodeURIComponent(playlistId)}`;
  const res = await fetch(url, { headers: SCRAPE_HEADERS, cache: "no-store" });
  if (res.status === 404) {
    throw new Error(
      "Playlist no encontrada (404). Revisá que el link sea válido y la playlist sea pública."
    );
  }
  if (!res.ok) {
    throw new Error(`Spotify embed respondió ${res.status}`);
  }
  const html = await res.text();
  const m =
    /<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html);
  if (!m) {
    throw new Error(
      "Spotify cambió el formato del embed; el scraper no pudo parsearlo."
    );
  }
  let data: EmbedNextData;
  try {
    data = JSON.parse(m[1]) as EmbedNextData;
  } catch {
    throw new Error("Respuesta inválida de Spotify (JSON malformado).");
  }
  const entity = data?.props?.pageProps?.state?.data?.entity;
  if (!entity) {
    throw new Error(
      "La playlist no expone datos públicos. ¿Está privada? Hacela pública en Spotify y volvé a probar."
    );
  }
  if (entity.type && entity.type !== "playlist") {
    throw new Error(
      `El link apunta a un ${entity.type}, no a una playlist.`
    );
  }
  return entity;
}

function entityToTracks(
  entity: EmbedEntity,
  limit: number
): SpotifyTrackLite[] {
  const out: SpotifyTrackLite[] = [];
  for (const t of entity.trackList || []) {
    if (out.length >= limit) break;
    if (!t.uri || !t.uri.startsWith("spotify:track:")) continue;
    if (!t.title) continue;
    const id = t.uri.slice("spotify:track:".length);
    out.push({
      id,
      uri: t.uri,
      name: t.title,
      artists: t.subtitle || "",
      durationMs: t.duration || 0,
    });
  }
  return out;
}

function entityToInfo(
  entity: EmbedEntity,
  playlistId: string,
  trackCount?: number
): SpotifyPlaylistInfo {
  const id = entity.id || playlistId;
  return {
    id,
    name: entity.title || "Playlist sin nombre",
    owner: entity.subtitle || "desconocido",
    trackCount: trackCount ?? (entity.trackList?.length ?? 0),
    url: `https://open.spotify.com/playlist/${id}`,
    imageUrl: entity.coverArt?.sources?.[0]?.url,
  };
}

export async function scrapePlaylistMeta(
  playlistId: string
): Promise<SpotifyPlaylistInfo> {
  const entity = await fetchEntity(playlistId);
  return entityToInfo(entity, playlistId);
}

export async function scrapePlaylistWithTracks(
  playlistId: string,
  limit = 300
): Promise<SpotifyPlaylistWithTracks> {
  const entity = await fetchEntity(playlistId);
  const tracks = entityToTracks(entity, limit);
  return { ...entityToInfo(entity, playlistId, tracks.length), tracks };
}
