/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ConnectSrc, CspPolicies } from "@main/csp";
import { RendererSettings } from "@main/settings";

if (RendererSettings.store.plugins?.SpotifyLyrics?.enabled) {
    CspPolicies["lrclib.net"] = ConnectSrc;
    CspPolicies["spotify-lyrics-api-pi.vercel.app"] = ConnectSrc;
    CspPolicies["translate.googleapis.com"] = ConnectSrc;
}
