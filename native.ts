/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcMainInvokeEvent } from "electron";

import { getLyrics } from "./SpotifyAPI";

export async function getLyricsSpotify(_: IpcMainInvokeEvent, trackId: string) {
    return await getLyrics(trackId);
}
