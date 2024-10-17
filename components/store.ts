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

import { addLyrics, getLyrics } from "../api";
import { LyricsData, Provider, SyncedLyric } from "../types";


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

// Copy from spotifycontrols
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
        async SPOTIFY_LYRICS_PROVIDER(e: { provider: Provider; }) {
            if (!store.lyricsInfo) {
                store.lyricsInfo = {
                    lrclibLyrics: null,
                    musixmatchLyrics: null,
                    englishTranslation: null,
                    useLyric: e.provider,
                };
            }


            switch (e.provider) {
                case Provider.Musixmatch:
                    {
                        const newInfo = await handleMusixmatchLyrics(store.track!, store.lyricsInfo);
                        console.log(newInfo);
                        if (newInfo) {
                            store.lyricsInfo = newInfo;
                        } else {
                            showNotification({
                                title: "Lyrics not found",
                                body: "No lyrics found for this track",
                                color: "red",
                                noPersist: true,
                            });
                        }
                    }
                    break;
                case Provider.Translated:
                    {
                        const newInfo = await handleTranslatedLyrics(store.track!, store.lyricsInfo);
                        console.log(newInfo);
                        if (newInfo) store.lyricsInfo = newInfo;
                    }

                    break;
                case Provider.Lrclib:
                    store.lyricsInfo.useLyric = Provider.Lrclib;
                    break;
                default:
                    break;
            }
            console.log("New lyrics info:", store.lyricsInfo);
            store.emitChange();
        }
    });
    return store;
});

async function handleMusixmatchLyrics(track: Track, lyricsInfo: LyricsData): Promise<LyricsData | undefined> {
    if (lyricsInfo?.musixmatchLyrics) {
        lyricsInfo.useLyric = Provider.Musixmatch;
        await addLyrics(track, lyricsInfo);
        return lyricsInfo;
    }

    const resp = await Native.fetchLyrics(track!);
    if (!resp) return;

    const synced = await Native.getSyncedLyrics(resp);
    if (!synced) return;

    lyricsInfo.musixmatchLyrics = synced;
    lyricsInfo.useLyric = Provider.Musixmatch;
    lyricsInfo.musixmatchTrackId = resp?.["matcher.track.get"]?.message?.body?.track?.track_id;

    await addLyrics(track!, lyricsInfo!);
    return lyricsInfo;
}

async function handleTranslatedLyrics(track: Track, lyricsInfo: LyricsData): Promise<LyricsData | undefined> {
    if (lyricsInfo?.englishTranslation) {
        lyricsInfo.useLyric = Provider.Translated;
        await addLyrics(track, lyricsInfo);
        return lyricsInfo;
    }

    const translation = await Native.getTranslationLyrics(lyricsInfo?.musixmatchTrackId!);
    if (!translation) {
        lyricsInfo.englishTranslation = [];
        return;
    }

    const englishTranslations: SyncedLyric[] = lyricsInfo.musixmatchLyrics!.map(originalLyric => {
        const match = translation.find(t => t.matchedLine === originalLyric.text);
        return match ? {
            text: match.translation,
            time: originalLyric.time,
            lrcTime: originalLyric.lrcTime
        } : null;
    }).filter(Boolean) as SyncedLyric[];

    lyricsInfo.englishTranslation = englishTranslations;
    lyricsInfo.useLyric = Provider.Translated;

    await addLyrics(track, lyricsInfo);
    return lyricsInfo;
}
