/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ConnectSrc, CspPolicies } from "@main/csp";
import { RendererSettings } from "@main/settings";
import { app, session } from "electron";

const SAFE_LYRIC_DOMAINS = [
    "lrclib.net",
    // "spotify-lyrics-api-pi.vercel.app",
    "lyrics.joona.moe"
];

const TRANSLATION_DOMAINS = [
    "translate.googleapis.com",
];

if (RendererSettings.store.plugins?.SpotifyLyrics?.enabled) {
    for (const domain of [...SAFE_LYRIC_DOMAINS, ...TRANSLATION_DOMAINS]) {
        CspPolicies[domain] = ConnectSrc;
    }
}

app.whenReady().then(() => {
    session.defaultSession.webRequest.onBeforeSendHeaders(
        { urls: SAFE_LYRIC_DOMAINS.map(domain => `https://${domain}/*`) },
        (details, callback) => {
            details.requestHeaders["User-Agent"] = "SpotifyLyrics for Vencord (https://github.com/Masterjoona/vc-spotifylyrics)";
            callback({ requestHeaders: details.requestHeaders });
        }
    );
});
