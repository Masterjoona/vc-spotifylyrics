/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Paragraph } from "@components/Paragraph";
import { openModal } from "@utils/modal";
import { ContextMenuApi, React, Tooltip, useEffect, useState, useStateFromStores } from "@webpack/common";
import { SpotifyStore } from "plugins/spotifyControls/SpotifyStore";

import { SpotifyLrcStore } from "../providers/store";
import settings from "../settings";
import { LyricsContextMenu } from "./ctxMenu";
import { LyricsModal } from "./modal";
import { cl, NoteSvg, useLyrics } from "./util";

const prevCl = cl("prev");
const nextCl = cl("next");
const currentCl = cl("current");

function LyricsDisplay({ scroll = true }: { scroll?: boolean; }) {
    const { ShowMusicNoteOnNoLyrics } = settings.use(["ShowMusicNoteOnNoLyrics"]);
    const { lyricRefs, currLrcIndex, currentLyrics } = useLyrics({ scroll });

    const makeClassName = (index: number): string => {
        if (currLrcIndex == null) return prevCl;

        const diff = index - currLrcIndex;

        if (diff === 0) return currentCl;
        return diff > 0 ? nextCl : prevCl;
    };

    return (
        <div
            className="vc-spotify-lyrics"
            onClick={() => openModal(props => <LyricsModal props={props} />)}
            onContextMenu={e => ContextMenuApi.openContextMenu(e, () => <LyricsContextMenu />)}
        >
            {currentLyrics && lyricRefs ? currentLyrics.map((line, i) => (
                <div ref={lyricRefs[i]} key={i} className="vc-spotify-lyrics-line">
                    <Paragraph
                        size={currLrcIndex === i ? "sm" : "xs"}
                        className={makeClassName(i)}
                    >
                        {line.text || NoteSvg()}
                    </Paragraph>
                </div>
            )) : ShowMusicNoteOnNoLyrics ? (
                <Tooltip text="No synced lyrics found">
                    {tooltipProps =>
                        <div {...tooltipProps}>
                            <NoteSvg />
                        </div>
                    }
                </Tooltip>
            ) : null}
        </div>
    );
}

export function Lyrics({ scroll = true }: { scroll?: boolean; } = {}) {
    SpotifyLrcStore.init();

    const track = useStateFromStores(
        [SpotifyStore],
        () => SpotifyStore.track,
        null,
        (prev, next) => (prev?.id ? prev.id === next?.id : prev?.name === next?.name)
    );

    const device = useStateFromStores(
        [SpotifyStore],
        () => SpotifyStore.device,
        null,
        (prev, next) => prev?.id === next?.id
    );

    const isPlaying = useStateFromStores([SpotifyStore], () => SpotifyStore.isPlaying);
    const [shouldHide, setShouldHide] = useState(false);

    useEffect(() => {
        setShouldHide(false);
        if (!isPlaying) {
            const timeout = setTimeout(() => setShouldHide(true), 1000 * 60 * 5);
            return () => clearTimeout(timeout);
        }
    }, [isPlaying]);

    if (!track || !device?.is_active || shouldHide) return null;

    return <LyricsDisplay scroll={scroll} />;
}
