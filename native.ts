/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { RendererSettings } from "@main/settings";
import { IpcMainInvokeEvent } from "electron";

// @ts-ignore
import("@main/csp").then(({ CspPolicies, ConnectSrc }) => {
    const settings = RendererSettings.store.plugins?.SpotifyLyrics;
    if (settings?.enabled) {
        CspPolicies["lrclib.net"] = ConnectSrc;
        CspPolicies["spotify-lyrics-api-pi.vercel.app"] = ConnectSrc;
        CspPolicies["translate.googleapis.com"] = ConnectSrc;
    }
}).catch(() => { });


export function dummy(_: IpcMainInvokeEvent) { }
