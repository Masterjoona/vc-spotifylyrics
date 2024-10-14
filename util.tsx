/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { debounce } from "@shared/debounce";
import { findByPropsLazy } from "@webpack";
import { React, useCallback, useEffect, useState, useStateFromStores } from "@webpack/common";

import { SyncedLyrics } from "./api";
import { SpotifyLrcStore } from "./store";

export const scrollClasses = findByPropsLazy("auto", "customTheme");

export const cl = classNameFactory("vc-spotify-lyrics-");

export function NoteSvg(className: string) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 480 720" fill="currentColor" className={className} >
            <path d="m160,-240 q -66,0 -113,-47 -47,-47 -47,-113 0,-66 47,-113 47,-47 113,-47 23,0 42.5,5.5 19.5,5.5 37.5,16.5 v -422 h 240 v 160 H 320 v 400 q 0,66 -47,113 -47,47 -113,47 z" />
        </svg>
    );
}

const calculateIndexes = (lyrics: SyncedLyrics[], position: number) => {
    const inSeconds = position / 1000;
    const currentIndex = lyrics.findIndex(l => l.time > inSeconds && l.time < inSeconds + 8) - 1;
    const nextLyric = lyrics.findIndex(l => l.time >= inSeconds);
    return [currentIndex, nextLyric];
};

export function useLyrics() {
    const [track, storePosition, isPlaying, lyrics] = useStateFromStores(
        [SpotifyLrcStore],
        () => [
            SpotifyLrcStore.track!,
            SpotifyLrcStore.mPosition,
            SpotifyLrcStore.isPlaying,
            SpotifyLrcStore.lyrics,
        ]
    );

    const [currLrcIndex, setCurrLrcIndex] = useState<number | null>(null);
    const [nextLyric, setNextLyric] = useState<number | null>(null);
    const [position, setPosition] = useState(storePosition);
    const [lyricRefs, setLyricRefs] = useState<React.RefObject<HTMLDivElement>[]>([]);

    useEffect(() => {
        if (lyrics) {
            setLyricRefs(lyrics.map(() => React.createRef()));
        }
    }, [lyrics]);

    useEffect(() => {
        if (lyrics && position) {
            const [currentIndex, noLimitIndex] = calculateIndexes(lyrics, position);
            setCurrLrcIndex(currentIndex);
            setNextLyric(noLimitIndex);
        }
    }, [lyrics, position]);

    const scrollIntoView = useCallback(debounce((index: number) => {
        if (lyricRefs[index]?.current) {
            lyricRefs[index].current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }, 100), [lyricRefs]);

    useEffect(() => {
        if (currLrcIndex !== null) {
            if (currLrcIndex >= 0) {
                scrollIntoView(currLrcIndex);
            }
            if (currLrcIndex < 0 && nextLyric !== null) {
                lyricRefs[nextLyric]?.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        }
    }, [currLrcIndex, nextLyric, scrollIntoView]);

    useEffect(() => {
        if (isPlaying) {
            setPosition(SpotifyLrcStore.position);
            const interval = setInterval(() => {
                setPosition(p => p + 500);
            }, 500);

            return () => clearInterval(interval);
        }
    }, [storePosition, isPlaying]);

    return { track, lyrics, lyricRefs, currLrcIndex, nextLyric };
}
