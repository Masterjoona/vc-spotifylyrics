/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { PluginNative } from "@utils/types";
import { Track } from "plugins/spotifyControls/SpotifyStore";

import { settings } from ".";
import { getLyricsLrclib } from "./providers/lrclibAPI";
import { LyricsData, Provider, SyncedLyric } from "./providers/types";


const LyricsCacheKey = "SpotifyLyricsCacheNew";
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

    const nullCacheEntry = nullLyricCache[cacheKey];
    if (nullCacheEntry?.Lrclib && nullCacheEntry?.Spotify) {
        return null;
    }

    const provider = settings.store.LyricsProvider;

    const getAndCacheLyrics = async (provider: Provider, fetchLyrics: () => Promise<LyricsData | null>): Promise<LyricsData | null> => {
        const lyricsInfo = await fetchLyrics();
        if (!lyricsInfo) {
            nullLyricCache[cacheKey] = { ...nullCacheEntry, [provider]: true };
            return null;
        }

        await DataStore.set(LyricsCacheKey, { ...cached, [cacheKey]: lyricsInfo });
        return lyricsInfo;
    };

    if (provider === Provider.Spotify) {
        return await getAndCacheLyrics(Provider.Spotify, () => Native.getLyricsSpotify(track));
    }

    return await getAndCacheLyrics(Provider.Lrclib, () => getLyricsLrclib(track));
}

export async function clearLyricsCache() {
    nullLyricCache = {};
    await DataStore.set(LyricsCacheKey, {});
}

export async function updateLyrics(trackId: string, lyrics: SyncedLyric[], provider: Provider) {
    const cache = await DataStore.get(LyricsCacheKey) as Record<string, LyricsData | null>;
    const current = cache[trackId];

    await DataStore.set(LyricsCacheKey,
        {
            ...cache, [trackId]: {
                ...current,
                useLyric: provider,
                lyricsVersions: {
                    ...current?.lyricsVersions,
                    [provider]: lyrics
                }
            }
        }
    );
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
