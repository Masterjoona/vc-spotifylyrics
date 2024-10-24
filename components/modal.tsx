/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { openImageModal } from "@utils/discord";
import { ModalContent, ModalHeader, ModalProps, ModalRoot } from "@utils/modal";
import { React, Text } from "@webpack/common";
import { SpotifyStore, Track } from "plugins/spotifyControls/SpotifyStore";

import { cl, NoteSvg, scrollClasses, useLyrics } from "./util";

const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

function ModalHeaderContent({ track }: { track: Track; }) {
    return (
        <ModalHeader>
            <div className={cl("header-content")}>
                {track?.album?.image?.url && (
                    <img
                        src={track.album.image.url}
                        alt={track.album.name}
                        className={cl("album-image")}
                        onClick={() => openImageModal({
                            url: track.album.image.url,
                            width: track.album.image.width,
                            height: track.album.image.height,
                        })}
                    />
                )}
                <div>
                    <Text selectable variant="text-sm/semibold">{track.name}</Text>
                    <Text selectable variant="text-sm/normal">by {track.artists.map(a => a.name).join(", ")}</Text>
                    <Text selectable variant="text-sm/normal">on {track.album.name}</Text>
                </div>
            </div>
        </ModalHeader>
    );
}

export function LyricsModal({ rootProps }: { rootProps: ModalProps; }) {
    const { track, lyricsInfo, lyricRefs, currLrcIndex } = useLyrics();
    const currentLyrics = lyricsInfo?.lyricsVersions[lyricsInfo.useLyric] || null;

    return (
        <ModalRoot {...rootProps}>
            <ModalHeaderContent track={track} />
            <ModalContent>
                <div className={cl("lyrics-modal-container") + ` ${scrollClasses.auto}`}>
                    {currentLyrics ? (
                        currentLyrics.map((line, i) => (
                            <Text
                                variant={currLrcIndex === i ? "text-md/semibold" : "text-sm/normal"}
                                selectable
                                className={currLrcIndex === i ? cl("modal-line-current") : cl("modal-line")}
                                // @ts-ignore
                                ref={lyricRefs[i]}
                            >
                                <span className={cl("modal-timestamp")} onClick={() => SpotifyStore.seek(line.time * 1000)}>
                                    {formatTime(line.time)}
                                </span>
                                {line.text || NoteSvg(cl("modal-note"))}
                            </Text>
                        ))
                    ) : (
                        <Text variant="text-sm/normal" className={cl("modal-no-lyrics")}>
                            No lyrics available :(
                        </Text>
                    )}
                </div>
            </ModalContent>
        </ModalRoot>
    );
}
