/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { LyricsData, Provider } from "../types";
import { PluginNative } from "@utils/types";

interface LyricsAPIResp {
    error: boolean;
    syncType: string;
    lines: Line[];
}

interface Line {
    startTimeMs: string;
    words: string;
    syllables: any[];
    endTimeMs: string;
}

const Native = VencordNative.pluginHelpers.vcSpotifylyricsMain as PluginNative<
    typeof import("../../native")
>;


export async function getLyricsSpotify(trackId: string): Promise<LyricsData | null> {
    let data: LyricsAPIResp | null = null;

    try {
        data = await Native.fetchSpotifyLyrics(trackId);
    } catch (e) {
        console.error("[vc-spotifylyrics] Native.fetchSpotifyLyrics failed:", e);
        return null;
    }

    if (!data) return null;

    const lyrics = data.lines;
    if (!lyrics?.length) return null;

    if (lyrics[0].startTimeMs === "0" && lyrics[lyrics.length - 1].startTimeMs === "0") return null;

    return {
        useLyric: Provider.Spotify,
        lyricsVersions: {
            Spotify: lyrics.map(line => {
                const trimmedText = line.words.trim();
                return {
                    time: Number(line.startTimeMs) / 1000,
                    text: (trimmedText === "" || trimmedText === "♪") ? null : trimmedText
                };
            })
        }
    };
}
