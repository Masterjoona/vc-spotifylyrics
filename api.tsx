/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { Track } from "plugins/spotifyControls/SpotifyStore";

const baseUrlLrclib = "https://lrclib.net/api/get";
const LyricsCacheKey = "SpotifyLyricsCache";
const nullLyricCache = new Set<string>();

export interface SyncedLyrics {
    id: number;
    lrcTime: string;
    time: number;
    text: string | null;
}

export interface LrcLibResponse {
    id: number;
    name: string;
    trackName: string;
    artistName: string;
    albumName: string;
    duration: number;
    instrumental: boolean;
    plainLyrics: string;
    syncedLyrics?: any;
}

function lyricTimeToSeconds(time: string) {
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

    const data = await response.json() as LrcLibResponse;
    if (!data.syncedLyrics) {
        return null;
    }

    const lyrics = data.syncedLyrics;
    const lines = lyrics.split("\n");
    return lines.map((line: string, i: number) => {
        const [time, text] = line.split("] ");
        return {
            time: lyricTimeToSeconds(time),
            text: text || null, // instead of empty string
            id: i,
            lrcTime: time.slice(1)
        };
    });
}


export async function getLyrics(track: Track): Promise<SyncedLyrics[] | null> {
    const cacheKey = track.id;
    const cached = await DataStore.get(LyricsCacheKey) as Record<string, SyncedLyrics[] | null>;
    if (cached && cacheKey in cached) {
        return cached[cacheKey];
    }

    if (nullLyricCache.has(cacheKey)) return null;

    const lyrics = await fetchLyrics(track);
    if (!lyrics) {
        nullLyricCache.add(cacheKey);
        return null;
    }

    await DataStore.set(LyricsCacheKey, { ...cached, [cacheKey]: lyrics });
    return lyrics;
}

export async function clearLyricsCache() {
    nullLyricCache.clear();
    await DataStore.set(LyricsCacheKey, {});
}

