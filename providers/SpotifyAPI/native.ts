import { CspPolicies, ConnectSrc } from "@main/csp";

CspPolicies["https://spotify-lyrics-api-pi.vercel.app"] = ConnectSrc;

interface LyricsAPIResp {
    error: boolean;
    syncType: string;
    lines: Line[];
}
interface Line {
    startTimeMs: string;
    words: string;
    syllables: any[];
    endTimeMs: string;
}

export async function fetchSpotifyLyrics(trackId: string): Promise<LyricsAPIResp | null> {
    try {
        const resp = await fetch(`https://spotify-lyrics-api-pi.vercel.app/?trackid=${encodeURIComponent(trackId)}`);
        if (!resp.ok) return null;

        const data = (await resp.json()) as LyricsAPIResp;
        if (!data || !Array.isArray(data.lines)) return null;
        return data;
    } catch (err) {
        console.error("[vc-spotifylyrics native.ts] fetch error:", err);
        return null;
    }
}
