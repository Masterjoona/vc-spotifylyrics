/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Track } from "@plugins/spotifyControls/SpotifyStore";

import { mapLrcLyrics, safeFetchJson } from "../common";

const baseUrlLrclib = "https://lrclib.net/api/get";

export interface LRCLIBTrack {
    id: number;
    name: string;
    trackName: string;
    artistName: string;
    albumName: string;
    duration: number;
    instrumental: boolean;
    plainLyrics: string | null;
    syncedLyrics: string | null;
}


export default async function getLyricsLrclib(track: Track) {
    const info = {
        track_name: track.name,
        artist_name: track.artists[0].name,
        album_name: track.album.name,
        duration: String(track.duration / 1000)
    };

    const params = new URLSearchParams(info);
    const url = `${baseUrlLrclib}?${params.toString()}`;

    const data = await safeFetchJson<LRCLIBTrack>(url, {
        headers: {
            "User-Agent": "SpotifyLyrics for Vencord (https://github.com/Masterjoona/vc-spotifylyrics)"
        }
    });

    if (!data) return null;

    if (!data.syncedLyrics) return null;

    const lyrics = mapLrcLyrics(data.syncedLyrics);
    if (lyrics.length === 0) return null;

    return lyrics;
}
