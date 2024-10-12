/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { openImageModal } from "@utils/discord";
import { copyWithToast } from "@utils/misc";
import { ModalContent, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import { Forms, Text, TooltipContainer, useEffect, useState, useStateFromStores, React } from "@webpack/common";
import { SpotifyStore, Track } from "plugins/spotifyControls/SpotifyStore";

import { settings } from ".";
import { getLyrics, SyncedLyrics } from "./api";

const cl = classNameFactory("vc-spotify-lyrics-");

function NoteSvg(className: string) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 480 720" fill="currentColor" className={className}>
            <path d="m160,-240 q -66,0 -113,-47 -47,-47 -47,-113 0,-66 47,-113 47,-47 113,-47 23,0 42.5,5.5 19.5,5.5 37.5,16.5 v -422 h 240 v 160 H 320 v 400 q 0,66 -47,113 -47,47 -113,47 z" />
        </svg>
    );
}

function LyricsDisplay() {
    const track = SpotifyStore.track!;

    const { ShowMusicNoteOnNoLyrics, ShowSpinningCoverArt } = settings.use([
        "ShowMusicNoteOnNoLyrics",
        "ShowSpinningCoverArt",
    ]);
    const [lyrics, setLyrics] = useState<SyncedLyrics[] | null>(null);
    const [currentLyricIndex, setCurrentLyricIndex] = useState<number>(0);

    const [storePosition, isSettingPosition, isPlaying] = useStateFromStores(
        [SpotifyStore],
        () => [SpotifyStore.mPosition, SpotifyStore.isSettingPosition, SpotifyStore.isPlaying]
    );
    const [position, setPosition] = useState(storePosition);

    const lyricsContainerRef = React.useRef<HTMLDivElement>(null);
    const backgroundImageRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        getLyrics(track).then(setLyrics);
    }, [track]);

    useEffect(() => {
        if (lyrics && position !== null) {
            const currentIndex = lyrics.findIndex(
                (l, i) =>
                    position / 1000 >= l.time && (i === lyrics.length - 1 || position / 1000 < lyrics[i + 1].time)
            );
            setCurrentLyricIndex(currentIndex !== -1 ? currentIndex : null);
        }
    }, [lyrics, position]);

    useEffect(() => {
        if (isPlaying && !isSettingPosition) {
            setPosition(SpotifyStore.position);
            const interval = setInterval(() => {
                setPosition(p => p + 1000);
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [storePosition, isSettingPosition, isPlaying]);

    const lyricRefs = React.useRef<Array<React.RefObject<HTMLDivElement>>>([]);

    useEffect(() => {
        if (lyrics) {
            lyricRefs.current = lyrics.map(() => React.createRef<HTMLDivElement>());
        }
    }, [lyrics]);

    useEffect(() => {
        if (currentLyricIndex !== null && lyricRefs.current[currentLyricIndex]) {
            const currentLyricElement = lyricRefs.current[currentLyricIndex].current;
            currentLyricElement?.scrollIntoView({ behavior: "smooth", block: "center" });

            if (backgroundImageRef.current && currentLyricElement && lyricsContainerRef.current) {
                const containerRect = lyricsContainerRef.current.getBoundingClientRect();
                const lyricRect = currentLyricElement.getBoundingClientRect();
                const offset =
                    lyricRect.top - containerRect.top - lyricsContainerRef.current.clientHeight / 2 + lyricRect.height / 2;
                backgroundImageRef.current.style.top = `${offset}px`;
            }
        }
    }, [currentLyricIndex]);

    const openLyricsModal = () =>
        openModal((props) => <LyricsModal rootProps={props} track={track} lyrics={lyrics} />);

    if (!lyrics) {
        return ShowMusicNoteOnNoLyrics ? (
            <div className="vc-spotify-lyrics">
                {ShowSpinningCoverArt && track.album.image.url && (
                    <div
                        className="background-image"
                        style={{ backgroundImage: `url(${track.album.image.url})` }}
                        ref={backgroundImageRef}
                    />
                )}
                <TooltipContainer text="No synced lyrics found">
                    {NoteSvg(cl("music-note"))}
                </TooltipContainer>
                <Text variant="text-sm/normal" style={{ textAlign: "center", marginTop: "10px" }}>
                    Sorry, no lyrics found.
                    <br />
                    Have a cat instead:
                    <br />
                    【≽ܫ≼】
                </Text>
            </div>
        ) : null;
    }

    return (
        <div
            className="vc-spotify-lyrics"
            style={{ overflow: "hidden", cursor: "pointer", position: "relative" }}
            onClick={openLyricsModal}
        >
            {ShowSpinningCoverArt && track.album.image.url && (
                <div
                    className="background-image"
                    style={{ backgroundImage: `url(${track.album.image.url})` }}
                    ref={backgroundImageRef}
                />
            )}
            <div className={cl("lyrics-container")} ref={lyricsContainerRef}>
                {lyrics.map((line, i) => (
                    <Text
                        key={i}
                        variant={currentLyricIndex === i ? "text-md/semibold" : "text-sm/normal"}
                        className={currentLyricIndex === i ? cl("current") : cl("line")}
                        onContextMenu={() => copyWithToast(line.text!, "Lyric copied")}
                        ref={lyricRefs.current[i]}
                        style={{
                            opacity: currentLyricIndex === i ? 1 : 0.6,
                            margin: "4px 0",
                            textAlign: "center",
                        }}
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

    return <LyricsDisplay />;
}

function ModalHeaderContent({ track }: { track: Track }) {
    return (
        <ModalHeader>
            <Forms.FormTitle tag="h2">
                <div className={cl("header-content")}>
                    {track?.album?.image?.url && (
                        <img
                            src={track.album.image.url}
                            alt={track.album.name}
                            className={cl("album-image")}
                            onClick={() => openImageModal(track.album.image.url)}
                        />
                    )}
                    <div className={cl("track-info")}>
                        <Text variant="text-lg/bold">{track.name}</Text>
                        <Text variant="text-sm/normal" style={{ opacity: 0.8 }}>
                            {track.artists.map((a) => a.name).join(", ")}
                        </Text>
                    </div>
                </div>
            </Forms.FormTitle>
        </ModalHeader>
    );
}

export function LyricsModal({
    rootProps,
    track,
    lyrics,
}: {
    rootProps: ModalProps;
    track: Track;
    lyrics: SyncedLyrics[] | null;
}) {
    const [currentLyricIndex, setCurrentLyricIndex] = useState<number>(0);

    useEffect(() => {
        const updateCurrentLyric = () => {
            const position = SpotifyStore.position / 1000;
            if (lyrics) {
                const index = lyrics.findIndex((lyric, i) => {
                    const nextLyricTime = lyrics[i + 1]?.time ?? Infinity;
                    return position >= lyric.time && position < nextLyricTime;
                });
                setCurrentLyricIndex(index !== -1 ? index : lyrics.length - 1);
            }
        };

        const interval = setInterval(updateCurrentLyric, 500);
        return () => clearInterval(interval);
    }, [lyrics]);

    const lyricRefs = React.useRef<Array<React.RefObject<HTMLDivElement>>>([]);

    useEffect(() => {
        if (lyrics) {
            lyricRefs.current = lyrics.map(() => React.createRef<HTMLDivElement>());
        }
    }, [lyrics]);

    useEffect(() => {
        if (lyricRefs.current[currentLyricIndex]) {
            lyricRefs.current[currentLyricIndex].current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }, [currentLyricIndex]);

    if (!lyrics) {
        return (
            <ModalRoot {...rootProps}>
                <ModalHeaderContent track={track} />
                <ModalContent>
                    <Text variant="text-md/normal" style={{ textAlign: "center", marginTop: "1rem" }}>
                        Sorry, no lyrics found.
                        <br />
                        Have a cat instead:
                        <br />
                        【≽ܫ≼】
                    </Text>
                </ModalContent>
            </ModalRoot>
        );
    }

    return (
        <ModalRoot {...rootProps}>
            <ModalHeaderContent track={track} />
            <ModalContent>
                <div className={cl("lyrics-modal-container")} style={{ overflowY: "auto", maxHeight: "400px" }}>
                    {lyrics.map((line, i) => (
                        <Text
                            key={i}
                            variant={currentLyricIndex === i ? "text-md/semibold" : "text-sm/normal"}
                            selectable
                            className={currentLyricIndex === i ? cl("modal-line-current") : cl("modal-line")}
                            onClick={() => SpotifyStore.seek(line.time * 1000)}
                            onContextMenu={() => copyWithToast(line.text!, "Lyric copied")}
                            ref={lyricRefs.current[i]}
                            style={{
                                opacity: currentLyricIndex === i ? 1 : 0.6,
                                margin: "4px 0",
                                textAlign: "center",
                            }}
                        >
                            {seekTimestamp({ line })}
                            {line.text || NoteSvg(cl("modal-note"))}
                        </Text>
                    ))}
                </div>
            </ModalContent>
        </ModalRoot>
    );
}

function seekTimestamp({ line }: { line: SyncedLyrics }) {
    return (
        <span className={cl("modal-timestamp")} onClick={() => SpotifyStore.seek(line.time * 1000)}>
            {line.lrcTime}
        </span>
    );
}
