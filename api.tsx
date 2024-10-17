/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { PluginNative } from "@utils/types";
import { Track } from "plugins/spotifyControls/SpotifyStore";

import { settings } from ".";
import { fetchLrclibLyrics } from "./lrclib";
import { LyricsData, Provider, SyncedLyric } from "./types";


const LyricsCacheKey = "SpotifyLyricsCache";
interface NullLyricCache {
    [key: string]: {
        Lrclib: boolean;
        Musixmatch: boolean;
    };
}
let nullLyricCache = {} as NullLyricCache;


const Native = VencordNative.pluginHelpers.SpotifyLyrics as PluginNative<typeof import("./native")>;


export async function getLyrics(track: Track | null): Promise<LyricsData | null> {
    if (!track) return null;
    const cacheKey = track.id;
    const cached = await DataStore.get(LyricsCacheKey) as Record<string, LyricsData | null>;
    if (cached && cacheKey in cached) {
        return cached[cacheKey];
    }

    if (nullLyricCache[cacheKey] && nullLyricCache[cacheKey].Lrclib && nullLyricCache[cacheKey].Musixmatch) {
        return null;
    }

    const provider = settings.store.LyricsProvier;

    if (provider === "musixmatch") {
        const resp = await Native.fetchLyrics(track);
        if (!resp) {
            nullLyricCache[cacheKey] = { ...nullLyricCache[cacheKey], Musixmatch: true };
            return null;
        }

        const synced = await Native.getSyncedLyrics(resp);
        const lyricInfo = {
            musixmatchLyrics: synced,
            useLyric: Provider.Musixmatch,
            englishTranslation: null,
            musixmatchTrackId: resp?.["matcher.track.get"]?.message?.body?.track?.track_id,
        } as LyricsData;
        await DataStore.set(LyricsCacheKey, { ...cached, [cacheKey]: lyricInfo });
        return lyricInfo;
    }

    const lyricsInfo = await fetchLrclibLyrics(track);
    if (!lyricsInfo) {
        nullLyricCache[cacheKey] = { ...nullLyricCache[cacheKey], Lrclib: true };
        return null;
    }


    await DataStore.set(LyricsCacheKey, { ...cached, [cacheKey]: lyricsInfo });
    return lyricsInfo;
}

export async function clearLyricsCache() {
    nullLyricCache = {};
    await DataStore.set(LyricsCacheKey, {});
}

export async function migrateOldLyrics() {
    const oldLyrics = await DataStore.get(LyricsCacheKey) as Record<string, SyncedLyric[] | null>;
    if (!oldLyrics) return;
    // @ts-ignore
    if (Object.entries(oldLyrics)[0][1].useLyric) {
        return;
    }

    const newLyrics = Object.entries(oldLyrics).reduce((acc, [id, lyrics]) => {
        acc[id] = {
            lrclibLyrics: lyrics,
            useLyric: Provider.Lrclib,
            englishTranslation: null,
            musixmatchLyrics: null
        };
        return acc;
    }, {} as Record<string, LyricsData>);
    await DataStore.set(LyricsCacheKey, newLyrics);
}

export async function addLyrics(track: Track, lyricsInfo: LyricsData) {
    await DataStore.set(LyricsCacheKey, { ...await DataStore.get(LyricsCacheKey), [track.id]: lyricsInfo });
}
