export type SpotifyTrackLite = {
  id: string;
  uri: string;
  name: string;
  artists: string;
  durationMs: number;
  albumImage?: string;
};

export type SpotifyPlaylistInfo = {
  id: string;
  url: string;
  name: string;
  owner: string;
  trackCount: number;
  imageUrl?: string;
};

export type SpotifyPlaylistWithTracks = SpotifyPlaylistInfo & {
  tracks: SpotifyTrackLite[];
};
