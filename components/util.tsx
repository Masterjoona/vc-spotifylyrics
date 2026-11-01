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

export function useSpotifyTrack() {
    return useStateFromStores(
        [SpotifyStore],
        () => SpotifyStore.track,
        [],
        (prev, next) => (prev?.id ? prev.id === next?.id : prev?.name === next?.name)
    );
}

export function useLyricsInfo() {
    return useStateFromStores([SpotifyLrcStore], () => SpotifyLrcStore.lyricsInfo);
}

export function useCurrentLyrics(previewLyrics?: SyncedLyric[]) {
    const lyricsInfo = useLyricsInfo();

    return useMemo(() => {
        if (previewLyrics) return previewLyrics;
        return lyricsInfo?.lyricsVersions[lyricsInfo.useLyric];
    }, [lyricsInfo, previewLyrics]);
}

export function useLyricIndex(currentLyrics?: SyncedLyric[]) {
    const [storePosition, isPlaying] = useStateFromStores(
        [SpotifyStore],
        () => [SpotifyStore.mPosition, SpotifyStore.isPlaying],
        []
    );

    const { LyricDelay } = settings.use(["LyricDelay"]);

    const [currLrcIndex, setCurrLrcIndex] = useState<number | undefined>(void 0);
    const [nextLrcIndex, setNextLrcIndex] = useState<number | undefined>(void 0);
    const [position, setPosition] = useState(storePosition);

    useEffect(() => {
        if (!currentLyrics || !isNonNullish(position)) {
            setCurrLrcIndex(void 0);
            setNextLrcIndex(void 0);
            return;
        }

        const [currentIndex, nextIndex] = getIndexes(currentLyrics, position, LyricDelay);
        setCurrLrcIndex(prev => prev !== currentIndex ? currentIndex : prev);
        setNextLrcIndex(prev => prev !== nextIndex ? nextIndex : prev);
    }, [currentLyrics, position, LyricDelay]);

    useEffect(() => {
        if (!currentLyrics?.length) return;

        setPosition(SpotifyStore.position);
        if (!isPlaying) return;

        const interval = setInterval(() => setPosition(SpotifyStore.position), 1000);

        return () => clearInterval(interval);
    }, [storePosition, isPlaying, currentLyrics]);

    return { currLrcIndex, nextLrcIndex };
}

export function useLyricRefs({
    lyrics,
    currLrcIndex,
    nextLrcIndex,
    scroll = true,
}: {
    lyrics?: SyncedLyric[];
    currLrcIndex?: number;
    nextLrcIndex?: number;
    scroll?: boolean;
}) {
    const lyricRefs = useMemo(() => lyrics?.map(() => React.createRef<HTMLDivElement>()), [lyrics]);

    useEffect(() => {
        if (!scroll || !lyricRefs) return;

        const index = currLrcIndex ?? nextLrcIndex;
        if (!isNonNullish(index) || index < 0) return;

        lyricRefs[index]?.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, [currLrcIndex, nextLrcIndex, scroll, lyricRefs]);

    return lyricRefs;
}
