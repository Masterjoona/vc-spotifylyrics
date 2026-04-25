/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { Track } from "@plugins/spotifyControls/SpotifyStore";

import settings from "../settings";
import { mapLrcLyrics, mapSpotifyLyrics, safeFetchJson } from "./common";
import { CustomProvider, Provider, SyncedLyric } from "./types";

const CUSTOM_PROVIDERS_KEY = "SpotifyLyricsCustomProviders";

const getValue = (obj: any, path: string): any => {
    return path.split(".").reduce((acc, key) => {
        return acc && acc[key] !== undefined ? acc[key] : undefined;
    }, obj);
};

export async function getCustomProviders(): Promise<CustomProvider[]> {
    const providers = await DataStore.get<CustomProvider[] | undefined>(CUSTOM_PROVIDERS_KEY);
    return providers ?? [
        {
            "id": "1777131916282",
            "name": "Joona Spotify",
            "url": "https://lyrics.joona.moe/spotify/{id}",
            "enabled": false,
            "responseFormat": "spotify"
        },
        {
            "id": "1777132247887",
            "name": "Joona Musixmatch",
            "url": "https://lyrics.joona.moe/mxm/lyrics?track={track}&artist={artist}",
            "enabled": false,
            "responseFormat": "lrc",
            "responsePath": "subtitle_body"
        }
    ];
}

export async function saveCustomProviders(providers: CustomProvider[]): Promise<void> {
    await DataStore.set(CUSTOM_PROVIDERS_KEY, providers);
}

export async function addCustomProvider(provider: CustomProvider): Promise<void> {
    const providers = await getCustomProviders();
    providers.push(provider);
    await saveCustomProviders(providers);
}

export async function removeCustomProvider(id: string): Promise<void> {
    const providers = await getCustomProviders();
    const filtered = providers.filter(p => p.id !== id);
    const currentProvider = settings.store.LyricsProvider;
    if (currentProvider === id) {
        settings.store.LyricsProvider = Provider.LRCLIB;
    }
    const url = new URL(providers.find(p => p.id === id)?.url || "");
    const origin = url.origin.toLocaleLowerCase();
    await VencordNative.csp.removeOverride(origin);
    await saveCustomProviders(filtered);
}

export async function updateCustomProvider(id: string, updates: Partial<CustomProvider>): Promise<void> {
    const providers = await getCustomProviders();
    const index = providers.findIndex(p => p.id === id);
    if (index !== -1) {
        providers[index] = { ...providers[index], ...updates };
        await saveCustomProviders(providers);
    }
}

export async function fetchCustomLyrics(provider: CustomProvider, track: Track): Promise<SyncedLyric[] | null> {
    try {
        if (!provider.enabled || !provider.url) return null;

        const url = provider.url
            .replace("{artist}", encodeURIComponent(track.artists[0]?.name || ""))
            .replace("{track}", encodeURIComponent(track.name || ""))
            .replace("{id}", encodeURIComponent(track.id || ""));

        let data = await safeFetchJson<any>(url, {
            headers: {
                "User-Agent": "SpotifyLyrics for Vencord (https://github.com/Masterjoona/vc-spotifylyrics)"
            }
        });
        if (!data) return null;

        if (provider.responsePath) {
            data = getValue(data, provider.responsePath);
        }

        if (!data) return null;

        switch (provider.responseFormat) {
            case "spotify":
                return mapSpotifyLyrics(data?.lyrics?.lines);
            case "lrc":
                return mapLrcLyrics(data);
            default:
                console.warn(`Unknown response format for provider ${provider.name}`);
        }

        return null;

    } catch (e) {
        console.error(`Failed to fetch lyrics from custom provider ${provider.name}:`, e);
        return null;
    }
}
