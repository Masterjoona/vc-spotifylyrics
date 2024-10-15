/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { proxyLazyWebpack } from "@webpack";
import { Flux, FluxDispatcher } from "@webpack/common";
import { Track } from "plugins/spotifyControls/SpotifyStore";

import { getLyrics, SyncedLyrics } from "./api";


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

// Copy from spotifycontrols
export const SpotifyLrcStore = proxyLazyWebpack(() => {
    class SpotifyLrcStore extends Flux.Store {
        public mPosition = 0;
        private start = 0;

        public track: Track | null = null;
        public device: Device | null = null;
        public isPlaying = false;
        public lyrics: SyncedLyrics[] | null = null;

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
            store.lyrics = await getLyrics(e.track);
        },
        SPOTIFY_SET_DEVICES({ devices }: { devices: Device[]; }) {
            store.device = devices.find(d => d.is_active) ?? devices[0] ?? null;
            store.emitChange();
        }
    });

    return store;
});
