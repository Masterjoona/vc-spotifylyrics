/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { CustomProvider } from "./types";

export const LRCLIB_PROVIDER_ID = "LRCLIB";

export const LRCLIB_PROVIDER: CustomProvider = {
    id: LRCLIB_PROVIDER_ID,
    name: "LRCLIB",
    url: "https://lrclib.net/api/get?track_name={track}&artist_name={artist}&album_name={album}&duration={duration}",
    enabled: true,
    responseFormat: "lrc",
    responsePath: "syncedLyrics",
};

export function getProviderHost(provider: CustomProvider): string | undefined {
    try {
        return new URL(provider.url).host;
    } catch {
        return undefined;
    }
}

const PROTECTED_PROVIDER_HOSTS = ["lrclib.net", "lyrics.joona.moe"];

export function isProtectedProvider(provider: CustomProvider): boolean {
    const host = getProviderHost(provider);
    return provider.id === LRCLIB_PROVIDER_ID || (host !== undefined && PROTECTED_PROVIDER_HOSTS.includes(host));
}

export const DEFAULT_CUSTOM_PROVIDERS: CustomProvider[] = [
    LRCLIB_PROVIDER,
    {
        id: "1777131916282",
        name: "Joona Spotify",
        url: "https://lyrics.joona.moe/spotify/{id}",
        enabled: false,
        responseFormat: "spotify",
    },
    {
        id: "1777132247887",
        name: "Joona Musixmatch",
        url: "https://lyrics.joona.moe/mxm/lyrics?track={track}&artist={artist}",
        enabled: false,
        responseFormat: "lrc",
        responsePath: "subtitle_body",
    },
];
