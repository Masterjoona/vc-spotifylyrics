/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Track } from "plugins/spotifyControls/SpotifyStore";
import { PluginNative } from "@utils/types";
import { LyricsData, Provider } from "../types";

const Native = VencordNative.pluginHelpers.vcSpotifylyricsMain as PluginNative<
    typeof import("../../native")
>;

function lyricTimeToSeconds(time: string) {
    const [minutes, seconds] = time.slice(1, -1).split(":").map(Number);
    return minutes * 60 + seconds;
}

export async function getLyricsLrclib(track: Track): Promise<LyricsData | null> {
    const info = {
        track_name: track.name,
        artist_name: track.artists?.[0]?.name ?? "",
        album_name: track.album?.name ?? "",
        duration: String(Math.round(track.duration / 1000))
    };

    const data = await Native.fetchLrclibLyrics(info);
    if (!data?.syncedLyrics) return null;

    const lines = data.syncedLyrics
        .split("\n")
        .filter(line => line.trim() !== "");

    return {
        useLyric: Provider.Lrclib,
        lyricsVersions: {
            LRCLIB: lines.map(line => {
                const [lrcTime, text = ""] = line.split("]");
                const trimmedText = text.trim();
                return {
                    time: lyricTimeToSeconds(lrcTime),
                    text: (trimmedText === "" || trimmedText === "♪") ? null : trimmedText
                };
            })
        }
    };
}
