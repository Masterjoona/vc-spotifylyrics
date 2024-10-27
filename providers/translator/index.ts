/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import settings from "../../settings";
import { LyricsData, Provider, SyncedLyric } from "../types";

// stolen from src\plugins\translate\utils.ts

interface GoogleData {
    src: string;
    sentences: {
        // 🏳️‍⚧️
        trans: string;
        orig: string;
        src_translit?: string;
    }[];
}

async function googleTranslate(text: string, targetLang: string, romanize: boolean): Promise<GoogleData | null> {
    const url = "https://translate.googleapis.com/translate_a/single?" + new URLSearchParams({
        // see https://stackoverflow.com/a/29537590 for more params
        // holy shidd nvidia
        client: "gtx",
        // source language
        sl: "auto",
        // target language
        tl: targetLang,
        // what to return, t = translation probably
        dt: romanize ? "rm" : "t",
        // Send json object response instead of weird array
        dj: "1",
        source: "input",
        // query, duh
        q: text
    });

    const res = await fetch(url);
    if (!res.ok)
        return null;

    return await res.json();
}

const removeNewLine = (text: string) => text.replace("\n", "");

async function processLyrics(
    lyrics: LyricsData["lyricsVersions"][Provider],
    processFn: (texts: string[]) => Promise<Map<string, string | null>>
): Promise<SyncedLyric[] | null> {
    const uniqueTexts = new Map<string, null>();
    lyrics!.forEach(lyric => {
        if (lyric.text && !uniqueTexts.has(lyric.text)) uniqueTexts.set(lyric.text, null);
    });

    const processedTexts = await processFn([...uniqueTexts.keys()]);

    if (!processedTexts || ![...processedTexts.values()].some(text => text !== null)) return null;

    return lyrics!.map(lyric => ({
        ...lyric,
        text: lyric.text === null ? null : processedTexts.get(lyric.text) ?? lyric.text
    }));
}

export async function translateLyrics(lyrics: LyricsData["lyricsVersions"][Provider]): Promise<SyncedLyric[] | null> {
    if (!lyrics) return null;
    const language = settings.store.TranslateTo;

    return processLyrics(lyrics, async texts => {
        const joinedText = texts.join("\n");
        const translation = await googleTranslate(joinedText, language, false);

        const lyricTransMap = new Map<string, string | null>();
        if (!translation || !translation.sentences) return texts.reduce((map, text) => map.set(text, null), lyricTransMap);

        translation.sentences.forEach(sentence => {
            lyricTransMap.set(removeNewLine(sentence.orig), removeNewLine(sentence.trans));
        });
        return lyricTransMap;
    });
}

export async function romanizeLyrics(lyrics: LyricsData["lyricsVersions"][Provider]): Promise<SyncedLyric[] | null> {
    if (!lyrics) return null;

    const nonDuplicatedLyrics = lyrics.filter((lyric, index, self) =>
        self.findIndex(l => l.text === lyric.text) === index
    );

    const romanizedLyricsResp = await Promise.all(
        nonDuplicatedLyrics.map(async lyric => {
            if (!lyric.text) return [lyric.text, null];

            const translation = await googleTranslate(lyric.text, "", true);

            if (!translation || !translation.sentences || translation.sentences.length === 0) return [lyric.text, null];

            return [lyric.text, translation.sentences[0].src_translit];
        })
    );

    if (romanizedLyricsResp[0][1] === null) return null;

    return lyrics.map(lyric => ({
        ...lyric,
        text: romanizedLyricsResp.find(mapping => mapping[0] === lyric.text)?.[1] ?? lyric.text
    }));
}
