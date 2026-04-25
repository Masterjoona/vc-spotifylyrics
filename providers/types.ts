/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface SyncedLyric {
    time: number;
    text: string | null;
}

export enum Provider {
    LRCLIB = "LRCLIB",
    Spotify = "Spotify",
    Translated = "Translated",
    Romanized = "Romanized",
    None = "None",
}

export interface CustomProvider {
    id: string;
    name: string;
    url: string;
    enabled: boolean;
    responseFormat?: "spotify" | "lrc";
    responsePath?: string;
}

export interface LyricsData {
    lyricsVersions: Partial<Record<Provider | string, SyncedLyric[] | undefined>>;
    useLyric: Provider | string;
}
