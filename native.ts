/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcMainInvokeEvent } from "electron";
import { Track } from "plugins/spotifyControls/SpotifyStore";

import { getLyrics } from "./providers/SpotifyAPI";

export async function getLyricsSpotify(_: IpcMainInvokeEvent, track: Track) {
    return await getLyrics(track.id);
}
