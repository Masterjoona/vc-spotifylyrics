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
    [Provider.Spotify]: Native.getLyricsSpotify,
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
            if (currentInfo?.useLyric === e.provider) return;

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


