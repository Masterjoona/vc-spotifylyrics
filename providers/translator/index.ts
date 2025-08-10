/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import settings from "../../settings";
import { Provider, SyncedLyric } from "../types";
import { PluginNative } from "@utils/types";

// stolen from src\plugins\translate\utils.ts

const Native = VencordNative.pluginHelpers.vcSpotifylyricsMain as PluginNative<
    typeof import("../../native")
>;

interface GoogleData {
    src: string;
    sentences: {
        trans: string;
        orig: string;
        src_translit?: string;
    }[];
}

async function googleTranslate(text: string, targetLang: string, romanize: boolean): Promise<GoogleData | null> {
    return Native.googleTranslateNative(text, targetLang, romanize);
}

async function processLyrics(
    lyrics: SyncedLyric[],
    targetLang: string,
    romanize: boolean
): Promise<SyncedLyric[] | null> {
    if (!lyrics) return null;

    const nonDuplicatedLyrics = lyrics.filter((lyric, index, self) =>
        self.findIndex(l => l.text === lyric.text) === index
    );

    const processedLyricsResp = await Promise.all(
        nonDuplicatedLyrics.map(async lyric => {
            if (!lyric.text) return [lyric.text, null] as const;

            const translation = await googleTranslate(lyric.text, targetLang, romanize);
            if (!translation || !translation.sentences || translation.sentences.length === 0)
                return [lyric.text, null] as const;

            const out = romanize
                ? translation.sentences[0].src_translit
                : translation.sentences[0].trans;

            return [lyric.text, out ?? null] as const;
        })
    );

    if (processedLyricsResp.every(([, mapped]) => mapped === null)) return null;

    return lyrics.map(lyric => {
        const mapped = processedLyricsResp.find(([orig]) => orig === lyric.text)?.[1] ?? lyric.text;
        return { ...lyric, text: mapped };
    });
}

async function translateLyrics(lyrics: SyncedLyric[]) {
    return processLyrics(lyrics, settings.store.TranslateTo, false);
}

async function romanizeLyrics(lyrics: SyncedLyric[]) {
    return processLyrics(lyrics, "", true);
}

export const lyricsAlternativeFetchers = {
    [Provider.Translated]: translateLyrics,
    [Provider.Romanized]: romanizeLyrics
};
