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

export interface LyricsData {
    lyricsVersions: Partial<Record<Provider, SyncedLyric[] | undefined>>;
    useLyric: Provider;
}
