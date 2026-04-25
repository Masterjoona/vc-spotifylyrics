/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface VercelLyricsAPIResp {
    error: boolean;
    syncType: string;
    lines: Line[];
}

export interface SpotifyColorLyrics {
    colors: Colors;
    hasVocalRemoval: boolean;
    lyrics: Lyrics;
}

export interface Colors {
    background: number;
    highlightText: number;
    text: number;
}

export interface Lyrics {
    alternatives: any[];
    capStatus: string;
    isDenseTypeface: boolean;
    isRtlLanguage: boolean;
    language: string;
    lines: Line[];
    previewLines: Line[];
    provider: string;
    providerDisplayName: string;
    providerLyricsId: string;
    syncLyricsUri: string;
    syncType: string;
}

export interface Line {
    endTimeMs: string;
    startTimeMs: string;
    syllables: any[];
    transliteratedWords: string;
    words: string;
}
