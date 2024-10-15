/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { copyWithToast } from "@utils/misc";
import { openModal } from "@utils/modal";
import { React, Text, TooltipContainer, useEffect, useState, useStateFromStores } from "@webpack/common";

import { settings } from ".";
import { LyricsModal } from "./modal";
import { SpotifyLrcStore } from "./store";
import { cl, NoteSvg, useLyrics } from "./util";


function LyricsDisplay() {
    const { ShowMusicNoteOnNoLyrics } = settings.use(["ShowMusicNoteOnNoLyrics"]);
    const { lyrics, lyricRefs, currLrcIndex } = useLyrics();

    const openLyricsModal = () => openModal(props => <LyricsModal rootProps={props} />);

    const makeClassName = (index: number): string => {
        if (currLrcIndex === null) return "";

        const diff = index - currLrcIndex;

        if (diff === 0) return cl("current");
        return cl(diff > 0 ? "next" : "prev");
    };


    if (!lyrics) {
        return ShowMusicNoteOnNoLyrics && (
            <div className="vc-spotify-lyrics">
                <TooltipContainer text="No synced lyrics found">
                    {NoteSvg(cl("music-note"))}
                </TooltipContainer>
            </div>
        );
    }

    return (
        <div
            className="vc-spotify-lyrics vc-spotify-lyrics-pointer"
            onClick={openLyricsModal}
        >
            <div>
                {lyrics.map((line, i) => (
                    <Text
                        key={i}
                        variant={currLrcIndex === i ? "text-sm/normal" : "text-xs/normal"}
                        className={makeClassName(i)}
                        onContextMenu={() => copyWithToast(line.text!, "Lyric copied")}
                        // @ts-ignore
                        ref={lyricRefs[i]}
                    >
                        {line.text || NoteSvg(cl("music-note"))}
                    </Text>
                ))}
            </div>
        </div>
    );
}

export function Lyrics() {
    const track = useStateFromStores(
        [SpotifyLrcStore],
        () => SpotifyLrcStore.track,
        null,
        (prev, next) => (prev?.id ? prev.id === next?.id : prev?.name === next?.name)
    );

    const device = useStateFromStores(
        [SpotifyLrcStore],
        () => SpotifyLrcStore.device,
        null,
        (prev, next) => prev?.id === next?.id
    );

    const isPlaying = useStateFromStores([SpotifyLrcStore], () => SpotifyLrcStore.isPlaying);
    const [shouldHide, setShouldHide] = useState(false);

    useEffect(() => {
        setShouldHide(false);
        if (!isPlaying) {
            const timeout = setTimeout(() => setShouldHide(true), 1000 * 60 * 5);
            return () => clearTimeout(timeout);
        }
    }, [isPlaying]);

    if (!track || !device?.is_active || shouldHide) return null;

    return <LyricsDisplay />;
}
