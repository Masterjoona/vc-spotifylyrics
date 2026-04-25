/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Track } from "@plugins/spotifyControls/SpotifyStore";

import { mapSpotifyLyrics, safeFetchJson } from "../common";
import { SyncedLyric } from "../types";
import { VercelLyricsAPIResp } from "./types";

export default async (track: Track): Promise<SyncedLyric[] | null> => {
    const data = await safeFetchJson<VercelLyricsAPIResp>(
        `https://spotify-lyrics-api-pi.vercel.app/?trackid=${track.id}`
    );
    return data ? mapSpotifyLyrics(data.lines) : null;
};
