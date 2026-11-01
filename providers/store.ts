/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { SpotifyStore, type Track } from "@plugins/spotifyControls/SpotifyStore";
import { Logger } from "@utils/index";
import { proxyLazyWebpack } from "@webpack";
import { Flux, FluxDispatcher } from "@webpack/common";

import { getLyrics, identifyTrack, updateLyrics } from "../api";
import settings from "../settings";
import { fetchCustomLyrics, getCustomProviders } from "./customProvider";
import { lyricsAlternativeFetchers } from "./translator";
import { AlternativeProvider, alternativeTypeLabels, LyricsData, Provider, SyncedLyric } from "./types";

const logger = new Logger("SpotifyLyrics");

interface SpotifyLyricsDispatchEvent {
    provider?: string;
    providerLabel?: string;
    newLyrics?: SyncedLyric[];
}

function showNotif(title: string, body: string) {
    settings.store.ShowFailedToasts && showNotification({
        color: "#ee2902",
        title,
        body,
        noPersist: true
    });
}

function showFetchFailed(providerLabel: string) {
    showNotif("Lyrics fetch failed", `Failed to fetch ${providerLabel} lyrics`);
}


export const SpotifyLrcStore = proxyLazyWebpack(() => {
    let currentTrackId: string | undefined;
    const pendingFetches = new Map<string, Promise<void>>();

    function setLyricsVersion(provider: string, lyrics: SyncedLyric[]) {
        store.lyricsInfo = {
            useLyric: provider,
            lyricsVersions: {
                ...(store.lyricsInfo?.lyricsVersions ?? {}),
                [provider]: lyrics
            }
        };
    }

    class SpotifyLrcStore extends Flux.Store {
        lyricsInfo?: LyricsData;
    }

    async function handlePlayerStateChange(track: Track) {
        const identifiedTrack = identifyTrack(track);

        if (currentTrackId === identifiedTrack && store.lyricsInfo) {
            return;
        }

        const existingFetch = pendingFetches.get(identifiedTrack);
        if (existingFetch) return existingFetch;

        currentTrackId = identifiedTrack;
        store.lyricsInfo = undefined;
        store.emitChange();

        const fetchPromise = (async () => {
            try {
                const lyrics = await getLyrics(track);

                if (currentTrackId !== identifiedTrack) return;

                store.lyricsInfo = lyrics;
                store.emitChange();

                const { LyricsConversion } = settings.store;
                if (LyricsConversion !== Provider.None) {
                    await dispatchProviderChange(LyricsConversion);
                }
            } catch (error) {
                logger.error(`Failed to fetch lyrics for ${identifiedTrack}:`, error);

                if (currentTrackId === identifiedTrack) {
                    store.lyricsInfo = undefined;
                    store.emitChange();
                }
            } finally {
                pendingFetches.delete(identifiedTrack);
            }
        })();

        pendingFetches.set(identifiedTrack, fetchPromise);
        return fetchPromise;
    }

    async function dispatchProviderChange(provider: string, providerLabel?: string) {
        const { track } = SpotifyStore;
        if (!track) return;

        const identifiedTrack = identifyTrack(track);

        if (currentTrackId !== identifiedTrack) return;

        const label = providerLabel || provider;

        try {
            const cachedLyrics = store.lyricsInfo?.lyricsVersions[provider];
            if (cachedLyrics) {
                store.lyricsInfo = { ...store.lyricsInfo!, useLyric: provider };
                store.emitChange();
                await updateLyrics(identifiedTrack, cachedLyrics, provider);
                return;
            }

            if (lyricsAlternativeFetchers[provider]) {
                await handleAlternativeFormat(provider as AlternativeProvider, identifiedTrack);
                return;
            }

            const customProvider = getCustomProviders().find(p => p.id === provider);
            if (!customProvider) {
                showFetchFailed(label);
                return;
            }

            const newLyrics = await fetchCustomLyrics(customProvider, track);
            if (!newLyrics) {
                showFetchFailed(label);
                return;
            }

            await handleLyricsUpdate(newLyrics, provider, track);
        } catch (error) {
            logger.error(`Failed to change provider to ${label} (${provider}):`, error);
            showFetchFailed(label);
        }
    }

    async function handleAlternativeFormat(provider: AlternativeProvider, identifiedTrack: string) {
        if (currentTrackId !== identifiedTrack) return;

        const currentProvider = store.lyricsInfo?.useLyric;
        const baseProvider = currentProvider && !Object.hasOwn(lyricsAlternativeFetchers, currentProvider)
            ? currentProvider
            : settings.store.LyricsProvider;

        const originalLyrics = store.lyricsInfo?.lyricsVersions[baseProvider]
            || getCustomProviders().map(p => store.lyricsInfo?.lyricsVersions[p.id]).find(Boolean);

        if (!originalLyrics) {
            showNotif("No lyrics", `No lyrics to ${alternativeTypeLabels[provider]}`);
            return;
        }

        const fetchResult = await lyricsAlternativeFetchers[provider](originalLyrics);
        if (!fetchResult) {
            showNotif("Lyrics fetch failed", `Failed to fetch ${alternativeTypeLabels[provider]}`);
            return;
        }

        if (currentTrackId !== identifiedTrack) return;

        setLyricsVersion(provider, fetchResult);
        store.emitChange();
        await updateLyrics(identifiedTrack, fetchResult, provider);
    }

    async function handleLyricsUpdate(newLyrics: SyncedLyric[], provider: string, track: Track) {
        const identifiedTrack = identifyTrack(track);

        if (currentTrackId !== identifiedTrack) return;

        setLyricsVersion(provider, newLyrics);
        store.emitChange();
        await updateLyrics(identifiedTrack, newLyrics, provider);
    }

    const store = new SpotifyLrcStore(FluxDispatcher, {
        async SPOTIFY_PLAYER_STATE(e: { track: Track | null; }) {
            if (!e.track) {
                currentTrackId = undefined;
                store.lyricsInfo = undefined;
                store.emitChange();
                return;
            }

            await handlePlayerStateChange(e.track);
        },

        // @ts-ignore
        async SPOTIFY_LYRICS_PROVIDER_CHANGE(e: SpotifyLyricsDispatchEvent) {
            if (!e.provider || e.provider === Provider.None) return;
            if (store.lyricsInfo?.useLyric === e.provider) return;

            await dispatchProviderChange(e.provider, e.providerLabel);
        },

        async SPOTIFY_LYRICS_UPDATE(e: SpotifyLyricsDispatchEvent) {
            const { track } = SpotifyStore;
            if (!track || !e.newLyrics || !e.provider) return;

            await handleLyricsUpdate(e.newLyrics, e.provider, track);
        }
    });

    return store;
});
