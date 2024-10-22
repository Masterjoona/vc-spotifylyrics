/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface LyricsAPIResp {
    error: boolean;
    syncType: string;
    lines: Line[];
}

export interface Line {
    startTimeMs: string;
    words: string;
    syllables: any[];
    endTimeMs: string;
}
