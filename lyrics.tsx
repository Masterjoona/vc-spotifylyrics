/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { openImageModal } from "@utils/discord";
import { copyWithToast } from "@utils/misc";
import { ModalContent, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import { Forms, Text, TooltipContainer, useEffect, useState, useStateFromStores } from "@webpack/common";
import { SpotifyStore, Track } from "plugins/spotifyControls/SpotifyStore";

import { settings } from ".";
import { getLyrics, SyncedLyrics } from "./api";

const cl = classNameFactory("vc-spotify-lyrics-");

let currentLyricIndex: Number | null = null;
let setCurrentLyricIndex: Function;

function NoteSvg(className?: string | undefined) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 480 720" fill="currentColor" className={className}>
            <path d="m160,-240 q -66,0 -113,-47 -47,-47 -47,-113 0,-66 47,-113 47,-47 113,-47 23,0 42.5,5.5 19.5,5.5 37.5,16.5 v -422 h 240 v 160 H 320 v 400 q 0,66 -47,113 -47,47 -113,47 z" />
        </svg>
    );
}

function LyricsDisplay() {
    const track = SpotifyStore.track!;

    const { ShowMusicNoteOnNoLyrics } = settings.use(["ShowMusicNoteOnNoLyrics"]);
    const [lyrics, setLyrics] = useState<SyncedLyrics[] | null>(null);
    const [currentLyric, setCurrentLyric] = useState<SyncedLyrics | null>(null);
    const [previousLyric, setPreviousLyric] = useState<SyncedLyrics | null>(null);
    const [nextLyric, setNextLyric] = useState<SyncedLyrics | null>(null);

    const [storePosition, isSettingPosition, isPlaying] = useStateFromStores(
        [SpotifyStore],
        () => [SpotifyStore.mPosition, SpotifyStore.isSettingPosition, SpotifyStore.isPlaying]
    );
    const [position, setPosition] = useState(storePosition);

    useEffect(() => {
        getLyrics(track).then(setLyrics);
    }, [track]);

    useEffect(() => {
        if (lyrics && position !== null) {
            const currentIndex = lyrics.findIndex(l => l.time > position / 1000 && l.time < position / 1000 + 6) - 1;
            setCurrentLyric(lyrics[currentIndex] || null);
            setPreviousLyric(currentIndex > 0 ? lyrics[currentIndex - 1] : null);
            setNextLyric(currentIndex < lyrics.length - 1 ? lyrics[currentIndex + 1] : null);
            setCurrentLyricIndex?.(currentIndex);
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

    const openLyricsModal = () => openModal(props => (
        <LyricsModal
            rootProps={props}
            track={track}
            lyrics={lyrics}
        />
    ));

    if (!lyrics) {
        return ShowMusicNoteOnNoLyrics ? (
            <div className="vc-spotify-lyrics">
                <TooltipContainer text="No synced lyrics found">
                    {NoteSvg(cl("music-note"))}
                </TooltipContainer>
            </div>
        ) : null;
    }

    return (
        <div
            className="vc-spotify-lyrics"
            onClick={openLyricsModal}
        >
            {previousLyric && (
                <Text variant="text-xs/normal" className={cl("previous")}>
                    {previousLyric.text}
                </Text>
            )}
            {currentLyric ? (
                <Text
                    variant="text-sm/normal"
                    className={cl("current")}
                    onContextMenu={() => copyWithToast(currentLyric.text!, "Lyric copied")}
                >
                    {currentLyric.text}
                </Text>
            ) : (
                NoteSvg(cl("music-note"))
            )}
            {nextLyric && (
                <Text variant="text-xs/normal" className={cl("next")}>
                    {nextLyric.text}
                </Text>
            )}
        </div>
    );
}

export function Lyrics() {
    // Copy from SpotifyControls
    const track = useStateFromStores(
        [SpotifyStore],
        () => SpotifyStore.track,
        null,
        (prev, next) => prev?.id ? (prev.id === next?.id) : prev?.name === next?.name
    );

    const device = useStateFromStores(
        [SpotifyStore],
        () => SpotifyStore.device,
        null,
        (prev, next) => prev?.id === next?.id
    );

    const isPlaying = useStateFromStores([SpotifyStore], () => SpotifyStore.isPlaying);
    const [shouldHide, setShouldHide] = useState(false);

    // Hide player after 5 minutes of inactivity

    useEffect(() => {
        setShouldHide(false);
        if (!isPlaying) {
            const timeout = setTimeout(() => setShouldHide(true), 1000 * 60 * 5);
            return () => clearTimeout(timeout);
        }
    }, [isPlaying]);

    if (!track || !device?.is_active || shouldHide)
        return null;

    return <LyricsDisplay />;
}

function ModalHeaderContent({ track }: { track: Track; }) {
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
                    <span className={cl("track-info")}>
                        {track.name} - {track.artists.map(a => a.name).join(", ")}
                    </span>
                </div>
            </Forms.FormTitle>
        </ModalHeader>
    );
}

export function LyricsModal({ rootProps, track, lyrics }: { rootProps: ModalProps, track: Track, lyrics: SyncedLyrics[] | null; }) {
    [currentLyricIndex, setCurrentLyricIndex] = useState<number | null>(null);
    if (!lyrics) {
        return (
            <ModalRoot {...rootProps}>
                <ModalHeaderContent track={track} />
                <ModalContent>
                    <Text variant="text-md/normal" style={{ textAlign: "center", marginTop: "1rem" }}>
                        No synced lyrics found
                    </Text>
                </ModalContent>
            </ModalRoot>
        );
    }

    return (
        <ModalRoot {...rootProps}>
            <ModalHeaderContent track={track} />
            <ModalContent>
                <div>
                    {lyrics.map((line, i) => (
                        <Text
                            variant="text-sm/normal"
                            selectable
                            className={currentLyricIndex === i ? cl("modal-line-current") : cl("modal-line")}
                        >
                            <span className={cl("modal-timestamp")}>{line.lrcTime}</span>{line.text || NoteSvg(cl("modal-note"))}
                        </Text>
                    ))}
                </div>
            </ModalContent>
        </ModalRoot>
    );
}

