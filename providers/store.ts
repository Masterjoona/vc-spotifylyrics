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

import { getLyrics, identifyTrack, providers, updateLyrics } from "../api";
import settings from "../settings";
import { LyricProviders } from ".";
import { getCustomProviders } from "./customProvider";
import { lyricsAlternativeFetchers } from "./translator";
import { LyricsData, Provider, SyncedLyric } from "./types";

export const lyricsAlternative = [Provider.Translated, Provider.Romanized];

const logger = new Logger("SpotifyLyrics");

interface SpotifyLyricsDispatchEvent {
    type: string;
    provider?: Provider;
    providerLabel?: string;
    newLyrics?: SyncedLyric[];
    track?: Track | null;
}

function showNotif(title: string, body: string) {
    if (settings.store.ShowFailedToasts) {
        showNotification({
            color: "#ee2902",
            title,
            body,
            noPersist: true
        });
    }
}

let lyricsInfo: LyricsData | undefined = void 0;

function setLyricsVersion(provider: Provider, lyrics: SyncedLyric[]) {
    if (!lyricsInfo) {
        lyricsInfo = {
            useLyric: provider,
            lyricsVersions: { [provider]: lyrics }
        };
        return;
    }

    lyricsInfo = {
        ...lyricsInfo,
        useLyric: provider,
        lyricsVersions: {
            ...lyricsInfo.lyricsVersions,
            [provider]: lyrics
        }
    };
}


function getAlternativeTypeLabel(provider: Provider): string {
    return provider === Provider.Translated ? "translate" : "romanize";
}

export const SpotifyLrcStore = proxyLazyWebpack(() => {
    let currentTrackId: string | undefined;
    const fetchingsTracks = new Map<string, Promise<void>>();

    class SpotifyLrcStore extends Flux.Store {
        init() { }

        get lyricsInfo() {
            return lyricsInfo;
        }

    }

    async function handlePlayerStateChange(track: Track) {
        const identifiedTrack = identifyTrack(track);

        if (currentTrackId === identifiedTrack && lyricsInfo) {
            return;
        }

        const existingFetch = fetchingsTracks.get(identifiedTrack);
        if (existingFetch) return existingFetch;

        if (currentTrackId !== identifiedTrack) {
            currentTrackId = identifiedTrack;
        }

        const fetchPromise = (async () => {
            try {
                const lyrics = await getLyrics(track);

                if (currentTrackId === identifiedTrack) {
                    lyricsInfo = lyrics;
                    store.emitChange();

                    const { LyricsConversion } = settings.store;
                    if (LyricsConversion !== Provider.None) {
                        await dispatchProviderChange(LyricsConversion);
                    }
                }
            } catch (error) {
                logger.error(`Failed to fetch lyrics for ${identifiedTrack}:`, error);
                if (currentTrackId === identifiedTrack) {
                    lyricsInfo = undefined;
                    store.emitChange();
                }
            } finally {
                fetchingsTracks.delete(identifiedTrack);
            }
        })();

        lyricsInfo = undefined;
        store.emitChange();
        fetchingsTracks.set(identifiedTrack, fetchPromise);
        return fetchPromise;
    }

    async function dispatchProviderChange(provider: Provider, providerLabel?: string) {
        const { track } = SpotifyStore;
        if (!track) return;

        const identifiedTrack = identifyTrack(track);

        if (currentTrackId !== identifiedTrack) return;
        const providerLabelToUse = providerLabel || provider;

        try {
            if (lyricsInfo?.lyricsVersions[provider]) {
                lyricsInfo = { ...lyricsInfo, useLyric: provider };
                await updateLyrics(identifiedTrack, lyricsInfo.lyricsVersions[provider]!, provider);
                store.emitChange();
                return;
            }

            if (lyricsAlternative.includes(provider)) {
                await handleAlternativeFormat(provider, identifiedTrack);
                return;
            }

            const newLyrics = await LyricProviders[provider](track);
            if (!newLyrics) {
                showNotif("Lyrics fetch failed", `Failed to fetch ${providerLabelToUse} lyrics`);
                return;
            }

            await handleLyricsUpdate(newLyrics, provider, track);
        } catch (error) {
            logger.error(`Failed to change provider to ${providerLabel}-${provider}:`, error);
            showNotif("Lyrics fetch failed", `Failed to fetch ${providerLabelToUse} lyrics`);
        }
    }


    async function handleAlternativeFormat(provider: Provider, identifiedTrack: string) {
        if (currentTrackId !== identifiedTrack) return;

        if (!lyricsInfo) {
            showNotif("No lyrics", `No lyrics to ${getAlternativeTypeLabel(provider)}`);
            return;
        }

        const customProviders = await getCustomProviders();

        const originalLyrics = lyricsInfo.lyricsVersions[settings.store.LyricsProvider]
            || [...providers, ...customProviders.map(c => c.id)].map(p => lyricsInfo?.lyricsVersions[p]).find(Boolean);

        if (!originalLyrics) {
            showNotif("No lyrics", `No lyrics to ${getAlternativeTypeLabel(provider)}`);
            return;
        }

        const fetchResult = await lyricsAlternativeFetchers[provider](originalLyrics);
        if (!fetchResult) {
            showNotif("Lyrics fetch failed", `Failed to fetch ${getAlternativeTypeLabel(provider)}`);
            return;
        }

        if (currentTrackId !== identifiedTrack) return;

        setLyricsVersion(provider, fetchResult);

        store.emitChange();
        await updateLyrics(identifiedTrack, fetchResult, provider);
    }

    async function handleLyricsUpdate(newLyrics: SyncedLyric[], provider: Provider, track: Track) {
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
                lyricsInfo = undefined;
                store.emitChange();
                return;
            }

            await handlePlayerStateChange(e.track);
        },

        // @ts-ignore
        async SPOTIFY_LYRICS_PROVIDER_CHANGE(e: SpotifyLyricsDispatchEvent) {
            if (!e.provider || e.provider === Provider.None) return;
            if (lyricsInfo?.useLyric === e.provider) return;

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


