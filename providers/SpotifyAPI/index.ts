/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { LyricsData, Provider } from "../types";

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

const formatTimes = (ms: string) => {
    const seconds = Number(ms) / 1000;
    const minutes = Math.floor(seconds / 60);
    const lrcTime = `${String(minutes).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}.${String(Math.floor((seconds % 1) * 100)).padStart(2, "0")}`;
    return {
        lrcTime, time: seconds
    };
};

export async function getLyricsSpotify(trackId: string): Promise<LyricsData | null> {
    const resp = await fetch("https://spotify-lyrics-api-pi.vercel.app/?trackid=" + trackId);
    if (!resp.ok) return null;

    const data = await resp.json() as LyricsAPIResp;
    const lyrics = data.lines;
    if (lyrics[0].startTimeMs === "0" && lyrics[lyrics.length - 1].startTimeMs === "0") return null;

    return {
        useLyric: Provider.Spotify,
        lyricsVersions: {
            Spotify: lyrics.map(line => {
                const trimmedText = line.words.trim();
                return {
                    ...formatTimes(line.startTimeMs),
                    text: (trimmedText === "" || trimmedText === "♪") ? null : trimmedText
                };
            })
        }
    };
}