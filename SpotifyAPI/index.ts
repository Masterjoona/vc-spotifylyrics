/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { SyncedLyric } from "../types";
import { SpotifyLyricsResp, SpotifyTokenResp } from "./types";

const accessTokenUrl = "https://open.spotify.com/get_access_token?reason=transport&productType=web_player";
const lyricsUrl = "https://spclient.wg.spotify.com/color-lyrics/v2/track/";
const lyricsParams = "?format=json&vocalRemoval=false&market=from_token";
const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

let accessToken: string | null = null;
let accessTokenExpiration = 0;


async function getAccessToken(): Promise<string | null> {
    if (accessToken && Date.now() < accessTokenExpiration) return accessToken;

    const resp = await fetch(accessTokenUrl, {
        headers: {
            "user-agent": userAgent,
        },
    });

    if (!resp.ok) return null;

    const data = await resp.json() as SpotifyTokenResp;
    accessToken = data.accessToken;
    accessTokenExpiration = data.accessTokenExpirationTimestampMs;

    return accessToken;
}

export async function getLyrics(trackId: string): Promise<SyncedLyric[] | null> {
    const token = await getAccessToken();
    if (!token) return null;

    const resp = await fetch(lyricsUrl + trackId + lyricsParams, {
        headers: {
            "user-agent": userAgent,
            "authorization": `Bearer ${token}`,
            "app-platform": "WebPlayer",
        },
    });

    const data = await resp.json() as SpotifyLyricsResp;
    const lyrics = data.lyrics.lines;
    return lyrics.map((line, i) => ({
        lrcTime: `${Number(line.startTimeMs) / 1000}`,
        time: i,
        text: line.words,
    }));
}
