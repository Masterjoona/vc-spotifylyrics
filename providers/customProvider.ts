/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { Track } from "@plugins/spotifyControls/SpotifyStore";

import settings from "../settings";
import { mapLrcLyrics, mapSpotifyLyrics, safeFetchJson } from "./common";
import { getProviderHost, isProtectedProvider, LRCLIB_PROVIDER, LRCLIB_PROVIDER_ID } from "./defaults";
import { CustomProvider, SyncedLyric } from "./types";

const CUSTOM_PROVIDERS_KEY = "SpotifyLyricsCustomProviders";

const getValue = (obj: any, path: string): any => {
    return path.split(".").reduce((acc, key) => {
        return acc && acc[key] !== undefined ? acc[key] : undefined;
    }, obj);
};

export async function migrateCustomProviders(): Promise<void> {
    const legacyProviders = await DataStore.get<CustomProvider[] | undefined>(CUSTOM_PROVIDERS_KEY);
    if (legacyProviders !== undefined) {
        if (settings.plain?.CustomProviders === undefined) {
            saveCustomProviders(legacyProviders);
        }

        await DataStore.del(CUSTOM_PROVIDERS_KEY);
    }

    const providers = getCustomProviders();
    if (!providers.some(p => p.id === LRCLIB_PROVIDER_ID)) {
        saveCustomProviders([LRCLIB_PROVIDER, ...providers]);
    }
}

export function getCustomProviders(): CustomProvider[] {
    return settings.plain.CustomProviders ?? [];
}

export function saveCustomProviders(providers: CustomProvider[]): void {
    settings.store.CustomProviders = providers.map(p => ({ ...p }));
}

export function addCustomProvider(provider: CustomProvider): void {
    saveCustomProviders([...getCustomProviders(), provider]);
}

export async function removeCustomProvider(id: string): Promise<void> {
    const providers = getCustomProviders();
    const provider = providers.find(p => p.id === id);
    if (!provider || isProtectedProvider(provider)) return;

    const filtered = providers.filter(p => p.id !== id);
    const currentProvider = settings.store.LyricsProvider;
    if (currentProvider === id) {
        settings.store.LyricsProvider = filtered.find(p => p.enabled)?.id ?? "";
    }

    const host = getProviderHost(provider);
    if (host && !filtered.some(p => getProviderHost(p) === host)) {
        await VencordNative.csp.removeOverride(host);
    }

    saveCustomProviders(filtered);
}

export function updateCustomProvider(id: string, updates: Partial<CustomProvider>): void {
    const providers = getCustomProviders().map(p => p.id === id ? { ...p, ...updates } : p);
    saveCustomProviders(providers);

    if (updates.enabled === false && settings.store.LyricsProvider === id) {
        settings.store.LyricsProvider = providers.find(p => p.enabled)?.id ?? "";
    }
}

export async function fetchCustomLyrics(provider: CustomProvider, track: Track): Promise<SyncedLyric[] | null> {
    try {
        if (!provider.enabled || !provider.url) return null;

        const url = provider.url
            .replace("{artist}", encodeURIComponent(track.artists[0]?.name || ""))
            .replace("{track}", encodeURIComponent(track.name || ""))
            .replace("{album}", encodeURIComponent(track.album?.name || ""))
            .replace("{id}", encodeURIComponent(track.id || ""))
            .replace("{duration}", encodeURIComponent(track.duration / 1000));

        let data = await safeFetchJson<any>(url);
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
