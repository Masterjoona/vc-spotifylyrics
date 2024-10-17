/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Track } from "plugins/spotifyControls/SpotifyStore";

import { LyricsData, Provider } from "../types";

const baseUrlLrclib = "https://lrclib.net/api/get";

interface LrcLibResponse {
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

function lyricTimeToSeconds(time: string) {
    const [minutes, seconds] = time.slice(1, -1).split(":").map(Number);
    return minutes * 60 + seconds;
}

export async function fetchLrclibLyrics(track: Track): Promise<LyricsData | null> {
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

    if (!response.ok) return null;

    const data = await response.json() as LrcLibResponse;
    if (!data.syncedLyrics) return null;

    const lyrics = data.syncedLyrics;
    const lines = lyrics.split("\n");
    return {
        lrclibLyrics: lines.map((line: string) => {
            const [time, text] = line.split("] ");
            return {
                time: lyricTimeToSeconds(time),
                text: text || null,
                lrcTime: time.slice(1)
            };
        }),
        useLyric: Provider.Lrclib,
        englishTranslation: null
    } as LyricsData;
}
