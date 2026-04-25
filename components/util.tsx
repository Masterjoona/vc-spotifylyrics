/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { SpotifyStore } from "@plugins/spotifyControls/SpotifyStore";
import { classNameFactory } from "@utils/css";
import { isNonNullish } from "@utils/guards";
import { findCssClassesLazy } from "@webpack";
import { React, useEffect, useMemo, useState, useStateFromStores } from "@webpack/common";

import { SpotifyLrcStore } from "../providers/store";
import { SyncedLyric } from "../providers/types";
import settings from "../settings";

export const scrollClasses = findCssClassesLazy("auto", "managedReactiveScroller", "customTheme");

export const cl = classNameFactory("vc-spotify-lyrics-");

export function NoteSvg() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 480 720" fill="currentColor" className={cl("music-note")}>
            <path d="m160,-240 q -66,0 -113,-47 -47,-47 -47,-113 0,-66 47,-113 47,-47 113,-47 23,0 42.5,5.5 19.5,5.5 37.5,16.5 v -422 h 240 v 160 H 320 v 400 q 0,66 -47,113 -47,47 -113,47 z" />
        </svg>
    );
}


export const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};


const getIndexes = (lyrics: SyncedLyric[], position: number, delay: number) => {
    const posInSec = (position + delay - 300) / 1000;

    let left = 0, right = lyrics.length - 1;
    let currentIndex: number | undefined = void 0;

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const curr = lyrics[mid];
        const next = lyrics[mid + 1];

        if (curr.time <= posInSec && (!next || next.time > posInSec)) {
            currentIndex = mid;
            break;
        }

        if (curr.time > posInSec) {
            right = mid - 1;
        } else {
            left = mid + 1;
        }
    }

    const currIdxNonull = isNonNullish(currentIndex);

    const nextIdx = currIdxNonull ? currentIndex! + 1 : left;
    const nextLyricIdx = nextIdx < lyrics.length ? nextIdx : undefined;

    if (currIdxNonull && posInSec - lyrics[currentIndex!].time > 8) {
        return [undefined, nextLyricIdx];
    }

    return [currentIndex, nextLyricIdx];
};

export function useLyrics({ scroll = true, previewLyrics = void 0 }: { scroll?: boolean, previewLyrics?: SyncedLyric[]; } = {}) {
    const [track, storePosition, isPlaying] = useStateFromStores(
        [SpotifyStore], () => [
            SpotifyStore.track,
            SpotifyStore.mPosition,
            SpotifyStore.isPlaying,
        ], []);

    const lyricsInfo = useStateFromStores([SpotifyLrcStore], () => SpotifyLrcStore.lyricsInfo);

    const { LyricDelay } = settings.use(["LyricDelay"]);

    const [currLrcIndex, setCurrLrcIndex] = useState<number | undefined>(void 0);
    const [position, setPosition] = useState(storePosition);

    const currentLyrics = useMemo(() => {
        if (previewLyrics) return previewLyrics;
        return lyricsInfo?.lyricsVersions[lyricsInfo.useLyric];
    }, [lyricsInfo, previewLyrics]);

    const lyricRefs = useMemo(() => currentLyrics?.map(() => React.createRef<HTMLDivElement>()), [currentLyrics]);

    useEffect(() => {
        if (currentLyrics && isNonNullish(position)) {
            const [currentIndex] = getIndexes(currentLyrics, position, LyricDelay);
            setCurrLrcIndex(prev => prev !== currentIndex ? currentIndex : prev);
            return;
        }

        isNonNullish(currLrcIndex) && setCurrLrcIndex(void 0);
    }, [currentLyrics, position, LyricDelay]);


    useEffect(() => {
        if (!scroll || !isNonNullish(currLrcIndex) || !lyricRefs || currLrcIndex < 0) return;

        lyricRefs[currLrcIndex].current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, [currLrcIndex, scroll, lyricRefs]);

    useEffect(() => {
        if (!scroll || !currentLyrics || !lyricRefs) return;
        const [, nextLyricIndex] = getIndexes(currentLyrics, storePosition, LyricDelay);

        isNonNullish(nextLyricIndex) && !isNonNullish(currLrcIndex) && lyricRefs[nextLyricIndex].current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, [storePosition, lyricRefs, currentLyrics, LyricDelay]);

    useEffect(() => {
        setPosition(SpotifyStore.position);
        if (!isPlaying) return;

        const interval = setInterval(() => setPosition(p => p + 1000), 1000);

        return () => clearInterval(interval);
    }, [storePosition, isPlaying]);

    return { track, currentLyrics, lyricRefs, lyricsInfo, currLrcIndex };
}
