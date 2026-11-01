/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Paragraph } from "@components/index";
import { SpotifyStore, Track } from "@plugins/spotifyControls/SpotifyStore";
import { openImageModal } from "@utils/discord";
import { RenderModalProps } from "@vencord/discord-types";
import { Modal, React } from "@webpack/common";

import { SyncedLyric } from "../providers/types";
import { cl, formatTime, NoteSvg, scrollClasses, useCurrentLyrics, useLyricIndex, useSpotifyTrack } from "./util";

function ModalHeaderContent({ track }: { track: Track | null; }) {
    if (!track) {
        return (
            <div className={cl("header-content")}>
                <Paragraph size="sm">No track playing</Paragraph>
            </div>
        );
    }
    return (
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
                <Paragraph unselectable="off" size="sm" weight="semibold">{track.name}</Paragraph>
                <Paragraph unselectable="off" size="sm">by {track.artists.map(a => a.name).join(", ")}</Paragraph>
                <Paragraph unselectable="off" size="sm">on {track.album.name}</Paragraph>
            </div>
        </div>
    );
}

const modalCurrentLine = cl("modal-line-current");
const modalLine = cl("modal-line");
const modalLineTime = cl("modal-timestamp");

export function LyricsModal({ props, previewLyrics = void 0 }: { props: RenderModalProps, previewLyrics?: SyncedLyric[] | undefined; }) {
    const track = useSpotifyTrack();
    const currentLyrics = useCurrentLyrics(previewLyrics);
    const { currLrcIndex } = useLyricIndex(currentLyrics);

    return (
        <Modal
            title={<ModalHeaderContent track={track} />}
            {...props}
        >

            <div className={`${cl("lyrics-modal-container")} ${scrollClasses.auto}`}>
                {currentLyrics ? (
                    currentLyrics.map((line, i) => (
                        <Paragraph
                            key={i}
                            size={currLrcIndex === i ? "md" : "sm"}
                            weight={currLrcIndex === i ? "semibold" : "normal"}
                            className={currLrcIndex === i ? modalCurrentLine : modalLine}
                        >
                            <div className={modalLineTime} onClick={() => SpotifyStore.seek(line.time * 1000)}>
                                {formatTime(line.time)}
                            </div>
                            <div>{line.text || NoteSvg()}</div>
                        </Paragraph>
                    ))
                ) : (
                    <Paragraph size="sm" className={cl("modal-no-lyrics")}>
                        No lyrics available :&#40;
                    </Paragraph>
                )}
            </div>
        </Modal>
    );
}
