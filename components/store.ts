/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { PluginNative } from "@utils/types";
import { proxyLazyWebpack } from "@webpack";
import { Flux, FluxDispatcher } from "@webpack/common";
import { Track } from "plugins/spotifyControls/SpotifyStore";

import { getLyrics, updateLyrics } from "../api";
import { getLyricsLrclib } from "../providers/lrclibAPI";
import { getLyricsSpotify } from "../providers/SpotifyAPI";
import { translateLyrics } from "../providers/translator";
import { LyricsData, Provider } from "../providers/types";

interface PlayerStateMin {
    track: Track | null;
    device?: Device;
    isPlaying: boolean,
    position: number,
}

interface Device {
    id: string;
    is_active: boolean;
}

const Native = VencordNative.pluginHelpers.SpotifyLyrics as PluginNative<typeof import("../native")>;

const lyricFetchers = {
    [Provider.Spotify]: (track: Track) => getLyricsSpotify(track.id),
    [Provider.Lrclib]: getLyricsLrclib,
};


// steal from spotifycontrols
export const SpotifyLrcStore = proxyLazyWebpack(() => {
    class SpotifyLrcStore extends Flux.Store {
        public mPosition = 0;
        private start = 0;

        public track: Track | null = null;
        public device: Device | null = null;
        public isPlaying = false;
        public lyricsInfo: LyricsData | null = null;

        public get position(): number {
            let pos = this.mPosition;
            if (this.isPlaying) {
                pos += Date.now() - this.start;
            }
            return pos;
        }

        public set position(p: number) {
            this.mPosition = p;
            this.start = Date.now();
        }
    }

    const store = new SpotifyLrcStore(FluxDispatcher, {
        async SPOTIFY_PLAYER_STATE(e: PlayerStateMin) {
            store.track = e.track;
            store.isPlaying = e.isPlaying ?? false;
            store.position = e.position ?? 0;
            store.device = e.device ?? null;
            store.lyricsInfo = await getLyrics(e.track);
        },

        SPOTIFY_SET_DEVICES({ devices }: { devices: Device[]; }) {
            store.device = devices.find(d => d.is_active) ?? devices[0] ?? null;
            store.emitChange();
        },

        // @ts-ignore
        async SPOTIFY_LYRICS_PROVIDER_CHANGE(e: { provider: Provider; }) {
            const currentInfo = await getLyrics(store.track);
            const { provider } = e;
            if (currentInfo?.useLyric === provider) return;

            if (currentInfo?.lyricsVersions[provider]) {
                store.lyricsInfo = { ...currentInfo, useLyric: provider };

                await updateLyrics(store.track!.id, currentInfo.lyricsVersions[provider]!, provider);
                store.emitChange();
                return;
            }

            if (provider === Provider.Translated || provider === Provider.Romanized) {
                if (!currentInfo?.useLyric) {
                    showNotification({
                        color: "#eed202",
                        title: "No lyrics",
                        body: "No lyrics to translate",
                        noPersist: true
                    });
                    return;
                }

                const [translated, romanized] = await translateLyrics(currentInfo.lyricsVersions[currentInfo?.useLyric]);

                if (!translated) {
                    console.error("Failed to translate lyrics");
                    showNotification({
                        color: "#eed202",
                        title: "Failed to translate lyrics",
                        body: "Failed to translate lyrics",
                        noPersist: true
                    });
                    return;
                }

                if (provider === Provider.Romanized && !romanized) {
                    console.error("Failed to romanize lyrics");
                    showNotification({
                        color: "#eed202",
                        title: "Failed to romanize lyrics",
                        body: "Failed to romanize lyrics",
                        noPersist: true
                    });
                    return;
                }

                store.lyricsInfo = {
                    ...currentInfo,
                    useLyric: e.provider,
                    lyricsVersions: {
                        ...currentInfo.lyricsVersions,
                        [e.provider]: e.provider === Provider.Translated ? translated : romanized
                    }
                };

                await updateLyrics(
                    store.track!.id,
                    translated,
                    e.provider,
                    Provider.Translated
                );

                if (romanized) {
                    await updateLyrics(
                        store.track!.id,
                        romanized,
                        e.provider,
                        Provider.Romanized
                    );
                }

                store.emitChange();
                return;
            }

            const newLyricsInfo = await lyricFetchers[e.provider](store.track!);
            if (!newLyricsInfo) {
                console.error("Failed to fetch lyrics with new provider");
                showNotification({
                    color: "#eed202",
                    title: "Failed to fetch lyrics",
                    body: "Failed to fetch lyrics with new provider",
                    noPersist: true
                });
                return;
            }

            store.lyricsInfo = newLyricsInfo;

            updateLyrics(
                store.track!.id,
                newLyricsInfo.lyricsVersions[e.provider]!,
                e.provider
            );

            store.emitChange();
        }
    });
    return store;
});


