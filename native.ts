/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcMainInvokeEvent } from "electron";
import { Track } from "plugins/spotifyControls/SpotifyStore";

import { findLyrics, getSynced, getTranslation } from "./musixmatch";
import { FindLyricsResp } from "./musixmatch/types/body";

export async function fetchLyrics(_: IpcMainInvokeEvent, track: Track) {
    return await findLyrics(track);
}

export async function getSyncedLyrics(_: IpcMainInvokeEvent, body: FindLyricsResp["message"]["body"]["macro_calls"]) {
    return getSynced(body);
}

export async function getTranslationLyrics(_: IpcMainInvokeEvent, trackId: number) {
    return await getTranslation(trackId);
}
