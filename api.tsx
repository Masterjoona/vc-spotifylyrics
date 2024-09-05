/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Track } from "plugins/spotifyControls/SpotifyStore";

const baseUrlLrclib = "https://lrclib.net/api/get";
const LyricsCache = new Map<string, SyncedLyrics[] | null>();

export interface SyncedLyrics {
    id: number;
    lrcTime: string;
    time: number;
    text: string | null;
}

function parseTime(time: string) {
    const [minutes, seconds] = time.slice(1, -1).split(":").map(Number);
    return minutes * 60 + seconds;
}

async function fetchLyrics(track: Track): Promise<SyncedLyrics[] | null> {
    const info = {
        track_name: track.name,
        artist_name: track.artists[0].name,
        album_name: track.album.name,
        duration: track.duration / 1000
    };

    const params = new URLSearchParams(info as any);
    const url = `${baseUrlLrclib}?${params.toString()}`;
    const response = await fetch(url, {
        headers: {
            "User-Agent": "https://github.com/Masterjoona/vc-spotifylyrics"
        }
    });
    if (!response.ok) {
        return null;
    }
    const data = await response.json();
    if (!data.syncedLyrics) {
        return null;
    }
    const lyrics = data.syncedLyrics as string;
    const lines = lyrics.split("\n");
    return lines.map((line: string, i: number) => {
        const [time, text] = line.split("] ");
        return {
            time: parseTime(time),
            text: text || null, // instead of empty string
            id: i,
            lrcTime: time.slice(1)
        };
    });
}


export async function getLyrics(track: Track): Promise<SyncedLyrics[] | null> {
    console.log("getLyrics", track);
    const cacheKey = track.id;
    if (LyricsCache.has(cacheKey)) {
        return LyricsCache.get(cacheKey)!;
    }

    const lyrics = await fetchLyrics(track);
    if (!lyrics) {
        LyricsCache.set(cacheKey, null);
        return null;
    }
    LyricsCache.set(cacheKey, lyrics);
    return lyrics;
}
