/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface SpotifyLyricsResp {
    lyrics: Lyrics;
    colors: Colors;
    hasVocalRemoval: boolean;
}

export interface Lyrics {
    syncType: string;
    lines: Line[];
    provider: string;
    providerLyricsId: string;
    providerDisplayName: string;
    syncLyricsUri: string;
    isDenseTypeface: boolean;
    alternatives: any[];
    language: string;
    isRtlLanguage: boolean;
    showUpsell: boolean;
    capStatus: string;
    isSnippet: boolean;
}

export interface Line {
    startTimeMs: string;
    words: string;
    syllables: any[];
    endTimeMs: string;
}

interface Colors {
    background: number;
    text: number;
    highlightText: number;
}

export interface SpotifyTokenResp {
    clientId: string;
    accessToken: string;
    accessTokenExpirationTimestampMs: number;
    isAnonymous: boolean;
}
