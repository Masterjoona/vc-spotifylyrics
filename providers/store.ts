/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { proxyLazyWebpack } from "@webpack";
import { Flux, FluxDispatcher } from "@webpack/common";
import { SpotifyStore, type Track } from "plugins/spotifyControls/SpotifyStore";

import { getLyrics, identifyTrack, lyricFetchers, providers, updateLyrics } from "../api";
import settings from "../settings";
import { lyricsAlternativeFetchers } from "./translator";
import { LyricsData, Provider } from "./types";

export const lyricsAlternative = [Provider.Translated, Provider.Romanized];

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

export const SpotifyLrcStore = proxyLazyWebpack(() => {
    let lyricsInfo: LyricsData | undefined = void 0;
    const fetchingsTracks = new Set<string>();

    class SpotifyLrcStore extends Flux.Store {
        init() { }
        get lyricsInfo() {
            return lyricsInfo;
        }
    }

    const store = new SpotifyLrcStore(FluxDispatcher, {
        async SPOTIFY_PLAYER_STATE(e: { track: Track | null; }) {
            if (!e.track) return;

            const identifiedTrack = identifyTrack(e.track);
            if (fetchingsTracks.has(identifiedTrack)) return;

            fetchingsTracks.add(identifiedTrack);
            lyricsInfo = await getLyrics(e.track);

            const { LyricsConversion } = settings.store;
            if (LyricsConversion !== Provider.None) {
                FluxDispatcher.dispatch({
                    // @ts-ignore
                    type: "SPOTIFY_LYRICS_PROVIDER_CHANGE",
                    provider: LyricsConversion
                });
            }

            fetchingsTracks.delete(identifiedTrack);
        },

        // @ts-ignore
        async SPOTIFY_LYRICS_PROVIDER_CHANGE(e: { provider: Provider; }) {
            const { track } = SpotifyStore;
            if (!track) return;
            const currentInfo = await getLyrics(track);
            const { provider } = e;
            if (currentInfo?.useLyric === provider) return;

            const identifiedTrack = identifyTrack(track);

            if (currentInfo?.lyricsVersions[provider]) {
                lyricsInfo = { ...currentInfo, useLyric: provider };

                await updateLyrics(identifiedTrack, currentInfo.lyricsVersions[provider]!, provider);
                store.emitChange();
                return;
            }

            if (lyricsAlternative.includes(provider)) {
                const originalLyrics = currentInfo?.lyricsVersions[settings.store.LyricsProvider] || providers
                    .map(p => currentInfo?.lyricsVersions[p])
                    .find(Boolean);

                if (!originalLyrics || !currentInfo) {
                    showNotif("No lyrics", `No lyrics to ${provider === Provider.Translated ? "translate" : "romanize"}`);
                    return;
                }

                const fetchResult = await lyricsAlternativeFetchers[provider](originalLyrics);

                if (!fetchResult) {
                    showNotif("Lyrics fetch failed", `Failed to fetch ${provider === Provider.Translated ? "translation" : "romanization"}`);
                    return;
                }

                lyricsInfo = {
                    ...currentInfo,
                    useLyric: provider,
                    lyricsVersions: {
                        ...currentInfo.lyricsVersions,
                        [provider]: fetchResult
                    }
                };

                await updateLyrics(identifiedTrack, fetchResult, provider);

                store.emitChange();
                return;
            }

            const newLyricsInfo = await lyricFetchers[e.provider](track);
            if (!newLyricsInfo) {
                showNotif("Lyrics fetch failed", `Failed to fetch ${e.provider} lyrics`);
                return;
            }

            lyricsInfo = newLyricsInfo;

            await updateLyrics(identifiedTrack, newLyricsInfo.lyricsVersions[e.provider], e.provider);

            store.emitChange();
        },

        // @ts-ignore
        async SPOTIFY_LYRICS_UPDATE(e: { newLyrics: SyncedLyric[]; provider: Provider; }) {
            const { newLyrics, provider } = e;
            const { track } = SpotifyStore;
            if (!track) return;
            if (!lyricsInfo) {
                lyricsInfo = {
                    useLyric: provider,
                    lyricsVersions: {
                        [provider]: newLyrics
                    }
                };
            } else {
                lyricsInfo = {
                    ...lyricsInfo,
                    useLyric: provider,
                    lyricsVersions: {
                        ...lyricsInfo.lyricsVersions,
                        [provider]: newLyrics
                    }
                };
            }
            await updateLyrics(identifyTrack(track), newLyrics, provider);
            store.emitChange();
        }
    });

    return store;
});


