/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface SyncedLyric {
    lrcTime: string;
    time: number;
    text: string | null;
}

export enum Provider {
    Lrclib = "lrclib",
    Musixmatch = "musixmatch",
    Translated = "translated"
}

export interface LyricsData {
    lrclibLyrics: SyncedLyric[] | null;
    musixmatchLyrics: SyncedLyric[] | null;
    englishTranslation: SyncedLyric[] | null;
    useLyric: Provider;
    musixmatchTrackId?: number;
}

export interface Translation {
    translation: string;
    matchedLine: string;
}
