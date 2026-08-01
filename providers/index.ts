/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Track } from "@plugins/spotifyControls/SpotifyStore";

import getLrclib from "./lrclibAPI";
import getSpotifyVercel from "./spotify";
import { Provider, SyncedLyric } from "./types";

export const LyricProviders: Record<string, (id: Track) => Promise<SyncedLyric[] | null>> = {
    [Provider.LRCLIB]: getLrclib,
    [Provider.Spotify]: getSpotifyVercel,
};
