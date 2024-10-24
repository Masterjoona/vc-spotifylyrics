/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { Track } from "plugins/spotifyControls/SpotifyStore";

import { getLyricsLrclib } from "./providers/lrclibAPI";
import { getLyricsSpotify } from "./providers/SpotifyAPI";
import { LyricsData, Provider, SyncedLyric } from "./providers/types";
import settings from "./settings";


const LyricsCacheKey = "SpotifyLyricsCacheNew";

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
        return await getAndCacheLyrics(Provider.Spotify, () => getLyricsSpotify(track.id));
    }

    return await getAndCacheLyrics(Provider.Lrclib, () => getLyricsLrclib(track));
}

export async function clearLyricsCache() {
    nullLyricCache = {};
    await DataStore.set(LyricsCacheKey, {});
}

export async function updateLyrics(trackId: string, newLyrics: SyncedLyric[], useProvider: Provider, toProvider?: Provider) {
    const cache = await DataStore.get(LyricsCacheKey) as Record<string, LyricsData | null>;
    const current = cache[trackId];

    await DataStore.set(LyricsCacheKey,
        {
            ...cache, [trackId]: {
                ...current,
                useLyric: useProvider,
                lyricsVersions: {
                    ...current?.lyricsVersions,
                    [toProvider || useProvider]: newLyrics
                }
            }
        }
    );
}

export async function removeTranslations() {
    const cache = await DataStore.get(LyricsCacheKey) as Record<string, LyricsData | null>;
    const newCache = {} as Record<string, LyricsData | null>;

    for (const [trackId, trackData] of Object.entries(cache)) {
        const { Translated, ...lyricsVersions } = trackData?.lyricsVersions || {};
        const newUseLyric = !!lyricsVersions[Provider.Spotify] ? Provider.Spotify : Provider.Lrclib;

        newCache[trackId] = { lyricsVersions, useLyric: newUseLyric };
    }

    await DataStore.set(LyricsCacheKey, newCache);
}

export async function removeOldData() {
    await DataStore.set("SpotifyLyricsCache", {});
}
