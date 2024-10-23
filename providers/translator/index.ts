/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { containsNonLatinChars } from "../../components/util";
import settings from "../../settings";
import { LyricsData, Provider, SyncedLyric } from "../types";

// stolen from src\plugins\translate\utils.ts

interface GoogleData {
    src: string;
    sentences: {
        // 🏳️‍⚧️
        trans: string;

        src_translit?: string;
    }[];
}

async function googleTranslate(text: string, targetLang: string): Promise<GoogleData | null> {
    const url = "https://translate.googleapis.com/translate_a/single?" + new URLSearchParams({
        // see https://stackoverflow.com/a/29537590 for more params
        // holy shidd nvidia
        client: "gtx",
        // source language
        sl: "auto",
        // target language
        tl: targetLang,
        // what to return, t = translation probably
        dt: "t",
        // Send json object response instead of weird array
        dj: "1",
        source: "input",
        // query, duh
        q: text
    }) + "&dt=rm";

    const res = await fetch(url);
    if (!res.ok)
        return null;

    return await res.json();
}

export async function translateLyrics(lyrics: LyricsData["lyricsVersions"][Provider]): Promise<SyncedLyric[][] | null[]> {
    if (!lyrics)
        return [null, null];

    const nonDuplicatedLyrics = lyrics.filter((lyric, index, self) => self.findIndex(l => l.text === lyric.text) === index);
    const language = settings.store.TranslateTo;

    const translatedLyricsWithRomanized = await Promise.all(
        nonDuplicatedLyrics.map(async lyric => {
            if (!lyric.text) return [lyric.text, null, null];

            if (!containsNonLatinChars(lyric.text))
                return [lyric.text, lyric.text, lyric.text];

            const translation = await googleTranslate(lyric.text, language);

            if (!translation || translation.sentences.length === 0)
                return [lyric.text, null, null];

            if (translation.sentences.length === 2)
                return [lyric.text, translation.sentences[0].trans, translation.sentences[1].src_translit];

            return [lyric.text, translation.sentences[0].trans, null];
        })
    );

    if (translatedLyricsWithRomanized[0][1] === null)
        return [null, null];

    const translated = lyrics.map(lyric => ({
        ...lyric,
        text: translatedLyricsWithRomanized.find(transes => transes[0] === lyric.text)?.[1] ?? lyric.text
    }));

    const romanized = lyrics.map(lyric => ({
        ...lyric,
        text: translatedLyricsWithRomanized.find(transes => transes[0] === lyric.text)?.[2] ?? lyric.text
    }));

    return [translated, romanized];
}

