/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Line } from "../spotify/types";
import { SyncedLyric } from "../types";

export async function safeFetchJson<T>(url: string, options?: RequestInit): Promise<T | null> {
    try {
        const resp = await fetch(url, options);
        if (!resp.ok) return null;
        return await resp.json() as T;
    } catch {
        return null;
    }
}

export function cleanLyricText(text: string): string | null {
    const trimmed = text.trim();
    return (trimmed === "" || trimmed === "♪") ? null : trimmed;
}

export function mapSpotifyLyrics(lines: Line[]): SyncedLyric[] | null {
    if (lines[0]?.startTimeMs === "0" && lines.at(-1)?.startTimeMs === "0") return null;
    return lines.map(line => ({
        time: Number(line.startTimeMs) / 1000,
        text: cleanLyricText(line.words)
    }));
}

function lyricTimeToSeconds(time: string) {
    const [minutes, seconds] = time.slice(1, -1).split(":").map(Number);
    return minutes * 60 + seconds;
}

export function mapLrcLyrics(syncedLyrics: string): SyncedLyric[] {
    const lines = syncedLyrics.split("\n").filter(line => line.trim() !== "");
    return lines.map(line => {
        const [lrcTime, text] = line.split("]");
        const trimmedText = text.trim();
        return {
            time: lyricTimeToSeconds(lrcTime),
            text: (trimmedText === "" || trimmedText === "♪") ? null : trimmedText
        };
    });
}
