/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { hash as h64 } from "@intrnl/xxhash64";
import { Track } from "plugins/spotifyControls/SpotifyStore";

import { getLyricsLrclib } from "./providers/lrclibAPI";
import { getLyricsSpotify } from "./providers/SpotifyAPI";
import { LyricsData, Provider, SyncedLyric } from "./providers/types";
import settings from "./settings";

export const identifyTrack = (track: Track) => track.id ?? h64(track.name + "__" + track.artists.map(a => a.name).join("_"));

const LyricsCacheKey = "SpotifyLyricsCacheNew";

interface NullLyricCacheEntry {
    [Provider.LRCLIB]?: boolean;
    [Provider.Spotify]?: boolean;
}

const nullLyricCache = new Map<string, NullLyricCacheEntry>();

export const lyricFetchers = {
    [Provider.Spotify]: async (track: Track) => await getLyricsSpotify(track.id),
    [Provider.LRCLIB]: getLyricsLrclib,
} as const;

export const providers = Object.keys(lyricFetchers) as Provider[];

async function getCache() {
    const cache = await DataStore.get(LyricsCacheKey) as Record<string, LyricsData | null>;
    return cache ?? {};
}

export function makeCacheData(provider: Provider, lyrics: SyncedLyric[]): LyricsData {
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

    if (cache?.[id]) return cache[id]!;

    const nullEntry = nullLyricCache.get(id);
    const preferredProvider = settings.store.LyricsProvider;

    if (nullEntry?.[preferredProvider] && !settings.store.FallbackProvider) {
        return undefined;
    }
    if (nullEntry && providers.every(p => nullEntry[p])) {
        return undefined;
    }

    const providersToTry = [preferredProvider, ...providers.filter(p => p !== preferredProvider)];

    for (const provider of providersToTry) {
        if (nullLyricCache.get(id)?.[provider]) continue;

        try {
            const syncedLyrics = await lyricFetchers[provider](track);

            if (syncedLyrics?.length) {
                const lyricsInfo = makeCacheData(provider, syncedLyrics);
                await DataStore.set(LyricsCacheKey, { ...await getCache(), [id]: lyricsInfo });
                return lyricsInfo;
            }
        } catch (e) { }

        const currentNulls = nullLyricCache.get(id) ?? {};
        nullLyricCache.set(id, { ...currentNulls, [provider]: true });

        if (!settings.store.FallbackProvider) break;
    }

    return undefined;
}

export async function clearLyricsCache() {
    nullLyricCache.clear();
    await DataStore.set(LyricsCacheKey, {});
}

export async function getLyricsCount(): Promise<number> {
    const cache = await getCache();
    return Object.keys(cache).length;
}

export async function updateLyrics(trackId: string, newLyrics: SyncedLyric[], provider: Provider) {
    const cache = await DataStore.get(LyricsCacheKey) as Record<string, LyricsData | null>;
    const current = cache[trackId];

    await DataStore.set(LyricsCacheKey,
        {
            ...cache, [trackId]: {
                ...current,
                useLyric: provider,
                lyricsVersions: {
                    ...current?.lyricsVersions,
                    [provider]: newLyrics
                }
            }
        }
    );
}

export async function removeTranslations() {
    const cache = await getCache();
    const newCache = {} as Record<string, LyricsData | null>;

    for (const [trackId, trackData] of Object.entries(cache)) {
        const { Translated, ...lyricsVersions } = trackData?.lyricsVersions || {};
        const newUseLyric = !!lyricsVersions[Provider.Spotify] ? Provider.Spotify : Provider.LRCLIB;

        newCache[trackId] = { lyricsVersions, useLyric: newUseLyric };
    }

    await DataStore.set(LyricsCacheKey, newCache);
}

export async function migrateOldLyrics() {
    const oldCache = await DataStore.get("SpotifyLyricsCache");
    if (!oldCache || !Object.entries(oldCache).length) return;

    const filteredCache = Object.entries(oldCache).filter(lrc => lrc[1]);
    const result = {};

    filteredCache.forEach(([trackId, lyrics]) => {
        result[trackId] = {
            lyricsVersions: {
                // @ts-ignore
                LRCLIB: lyrics.map(({ time, text }) => ({ time, text }))
            },
            useLyric: "LRCLIB"
        };
    });

    await DataStore.set(LyricsCacheKey, result);
    await DataStore.set("SpotifyLyricsCache", {});
}
