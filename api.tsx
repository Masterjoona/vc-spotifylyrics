/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { PluginNative } from "@utils/types";
import { Track } from "plugins/spotifyControls/SpotifyStore";

import { settings } from ".";
import { getLyricsLrclib } from "./lrclibAPI";
import { LyricsData, Provider } from "./types";


const LyricsCacheKey = "SpotifyLyricsCache";
const Native = VencordNative.pluginHelpers.SpotifyLyrics as PluginNative<typeof import("./native")>;

interface NullLyricCache {
    [key: string]: {
        Lrclib?: boolean;
        Spotify?: boolean;
    };
}

let nullLyricCache = {} as NullLyricCache;

export async function getLyrics(track: Track | null): Promise<LyricsData | null> {
    if (!track) return null;
    const cacheKey = track.id;
    const cached = await DataStore.get(LyricsCacheKey) as Record<string, LyricsData | null>;
    if (cached && cacheKey in cached) {
        return cached[cacheKey];
    }

    if (nullLyricCache[cacheKey] && nullLyricCache[cacheKey].Lrclib && nullLyricCache[cacheKey].Spotify) {
        return null;
    }

    const provider = settings.store.LyricsProvier;

    if (provider === Provider.Spotify) {
        const lyrics = await Native.getLyricsSpotify(track.id);
        if (!lyrics) {
            nullLyricCache[cacheKey] = { ...nullLyricCache[cacheKey], Spotify: true };
            return null;
        }

        const lyricsInfo = {
            useLyric: Provider.Spotify,
            lyricsVersions: {
                [Provider.Spotify]: lyrics
            }
        };

        await DataStore.set(LyricsCacheKey, { ...cached, [cacheKey]: lyricsInfo });
        return lyricsInfo;

    }

    const lyricsInfo = await getLyricsLrclib(track);
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

export async function addLyrics(track: Track, lyricsInfo: LyricsData) {
    await DataStore.set(LyricsCacheKey, { ...await DataStore.get(LyricsCacheKey), [track.id]: lyricsInfo });
}

/*
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
*/
