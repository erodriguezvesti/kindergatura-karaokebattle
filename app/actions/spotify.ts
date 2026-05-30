"use server";

import {
  parsePlaylistId,
  scrapePlaylistMeta,
  scrapePlaylistWithTracks,
} from "../lib/spotify";
import type {
  SpotifyPlaylistInfo,
  SpotifyPlaylistWithTracks,
} from "../lib/spotify-types";

export async function validatePlaylist(
  raw: string
): Promise<
  | { ok: true; playlist: SpotifyPlaylistInfo }
  | { ok: false; error: string }
> {
  const id = parsePlaylistId(raw);
  if (!id) {
    return {
      ok: false,
      error: "Link no reconocido. Pegá una URL como open.spotify.com/playlist/…",
    };
  }
  try {
    const playlist = await scrapePlaylistMeta(id);
    return { ok: true, playlist };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo leer la playlist",
    };
  }
}

export async function fetchPoolTracks(
  rawPlaylists: string[]
): Promise<
  | { ok: true; playlists: SpotifyPlaylistWithTracks[] }
  | { ok: false; error: string }
> {
  const ids = rawPlaylists
    .map(parsePlaylistId)
    .filter((x): x is string => !!x);
  if (!ids.length) {
    return { ok: false, error: "No hay playlists válidas para leer." };
  }
  try {
    const playlists = await Promise.all(
      ids.map((id) => scrapePlaylistWithTracks(id))
    );
    return { ok: true, playlists };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error leyendo playlists",
    };
  }
}
