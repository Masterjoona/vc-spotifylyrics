import { CspPolicies, ConnectSrc } from "@main/csp";

CspPolicies["https://lrclib.net"] = ConnectSrc;

export interface LrcLibResponse {
    id: number;
    name: string;
    trackName: string;
    artistName: string;
    albumName: string;
    duration: number;
    instrumental: boolean;
    plainLyrics: string | null;
    syncedLyrics: string | null;
}

export interface LrcLibQuery {
    track_name: string;
    artist_name: string;
    album_name: string;
    duration: string;
}

export async function fetchLrclibLyrics(query: LrcLibQuery): Promise<LrcLibResponse | null> {
    try {
        const params = new URLSearchParams(query as Record<string, string>);
        const url = `https://lrclib.net/api/get?${params.toString()}`;

        const resp = await fetch(url, {
            headers: {
                "User-Agent": "SpotifyLyrics for Vencord (https://github.com/Masterjoona/vc-spotifylyrics)"
            }
        });

        if (!resp.ok) return null;

        const json = (await resp.json()) as LrcLibResponse;
        if (!json?.syncedLyrics) return null;

        return json;
    } catch (err) {
        console.error("[vc-spotifylyrics native.ts] LRCLIB fetch error:", err);
        return null;
    }
}
