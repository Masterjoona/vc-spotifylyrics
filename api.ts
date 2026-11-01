/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { hash as h64 } from "@intrnl/xxhash64";
import { Track } from "@plugins/spotifyControls/SpotifyStore";

import { fetchCustomLyrics, getCustomProviders } from "./providers/customProvider";
import { LRCLIB_PROVIDER_ID } from "./providers/defaults";
import { LyricsData, SyncedLyric } from "./providers/types";
import settings from "./settings";

export const identifyTrack = (track: Track) => track.id ?? h64(track.name + "__" + track.artists.map(a => a.name).join("_"));

const LyricsCacheKey = "SpotifyLyricsCacheNew";

type LyricsCache = Map<string, LyricsData>;
type StoredLyricsCache = LyricsCache | Record<string, LyricsData>;

const nullLyricCache = new Map<string, Set<string>>();

function toCache(stored: StoredLyricsCache | undefined): LyricsCache {
    return stored instanceof Map ? stored : new Map(Object.entries(stored ?? {}));
}

async function getCache(): Promise<LyricsCache> {
    return toCache(await DataStore.get<StoredLyricsCache>(LyricsCacheKey));
}

async function updateCache(updater: (cache: LyricsCache) => void): Promise<void> {
    await DataStore.update<StoredLyricsCache>(LyricsCacheKey, stored => {
        const cache = toCache(stored);
        updater(cache);
        return cache;
    });
}

export function makeCacheData(provider: string, lyrics: SyncedLyric[]): LyricsData {
    return {
        useLyric: provider,
        lyricsVersions: {
            [provider]: lyrics
        }
    };
}

export async function getLyrics(track: Track | null): Promise<LyricsData | undefined> {
    if (!track?.name) return undefined;

    const id = identifyTrack(track);
    const cache = await getCache();
    const cachedLyrics = cache.get(id);

    if (cachedLyrics) return cachedLyrics;

    const nullProviders = nullLyricCache.get(id) ?? new Set<string>();
    const preferredProvider = settings.store.LyricsProvider || LRCLIB_PROVIDER_ID;

    if (nullProviders.has(preferredProvider) && !settings.store.FallbackProvider) {
        return undefined;
    }

    const providersById = new Map(getCustomProviders().map(p => [p.id, p]));
    const enabledCustomProviders = [...providersById.values()].filter(p => p.enabled);

    if (enabledCustomProviders.length && enabledCustomProviders.every(p => nullProviders.has(p.id))) {
        return undefined;
    }

    const providersToTry = [
        preferredProvider,
        ...enabledCustomProviders.map(p => p.id).filter(id => id !== preferredProvider)
    ];

    for (const provider of providersToTry) {
        if (nullProviders.has(provider)) continue;

        const customProvider = providersById.get(provider);
        const syncedLyrics = customProvider
            ? await fetchCustomLyrics(customProvider, track)
            : null;

        if (syncedLyrics?.length) {
            const lyricsInfo = makeCacheData(provider, syncedLyrics);
            await updateCache(cache => cache.set(id, lyricsInfo));
            return lyricsInfo;
        }

        nullProviders.add(provider);

        if (!settings.store.FallbackProvider) break;
    }

    nullLyricCache.set(id, nullProviders);
    return undefined;
}

export async function clearLyricsCache() {
    nullLyricCache.clear();
    await DataStore.set(LyricsCacheKey, new Map());
}

export async function getLyricsCount(): Promise<number> {
    const cache = await getCache();
    return cache.size;
}

export async function updateLyrics(trackId: string, newLyrics: SyncedLyric[], provider: string) {
    await updateCache(cache => {
        const current = cache.get(trackId);

        cache.set(trackId, {
            ...current,
            useLyric: provider,
            lyricsVersions: {
                ...current?.lyricsVersions,
                [provider]: newLyrics
            }
        });
    });
}

export async function removeTranslations() {
    await updateCache(cache => {
        for (const [trackId, trackData] of cache) {
            const { Translated, ...lyricsVersions } = trackData.lyricsVersions;
            if (!Translated) continue;

            const useLyric = lyricsVersions[trackData.useLyric]
                ? trackData.useLyric
                : Object.keys(lyricsVersions)[0] ?? LRCLIB_PROVIDER_ID;

            cache.set(trackId, { lyricsVersions, useLyric });
        }
    });
}
