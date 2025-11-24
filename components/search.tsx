/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button, Divider, Flex, Paragraph } from "@components/index";
import { ModalContent, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import { FluxDispatcher, TextInput, useEffect, useState } from "@webpack/common";

import { lrcFormatToSyncedLyrics, type LRCLIBTrack } from "../providers/lrclibAPI";
import { Provider } from "../providers/types";
import { LyricsModal } from "./modal";
import { cl, formatTime } from "./util";

const clSearchResult = cl("search-result");
const clSearchResultTitle = cl("search-result-title");
const clSearchResultArtist = cl("search-result-artist");

export function SearchModal({ props, searchFor = "" }: { props: ModalProps, searchFor?: string | undefined; }) {
    const [query, setQuery] = useState(searchFor);
    const [results, setResults] = useState<LRCLIBTrack[]>([]);
    const [error, setError] = useState<string | null>(null);

    const searchLyrics = async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            setResults([]);
            return;
        }

        setError(null);

        try {
            const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(searchQuery)}`, {
                headers: {
                    "User-Agent": "SpotifyLyrics for Vencord (https://github.com/Masterjoona/vc-spotifylyrics)"
                }
            });
            const data: LRCLIBTrack[] = await res.json();
            setResults(data.filter(track => track.syncedLyrics != null && track.syncedLyrics.trim() !== ""));
        } catch (err) {
            console.error("failed to search for lyrics", err);
            setError("uh oh");
        }
    };

    useEffect(() => {
        const handler = setTimeout(() => {
            searchLyrics(query);
        }, 350);

        return () => clearTimeout(handler);
    }, [query]);


    const handleSelect = async (track: LRCLIBTrack) => {
        FluxDispatcher.dispatch({
            // @ts-ignore
            type: "SPOTIFY_LYRICS_UPDATE",
            newLyrics: lrcFormatToSyncedLyrics(track.syncedLyrics!),
            provider: Provider.LRCLIB,
        });
    };

    return (
        <ModalRoot {...props}>
            <ModalHeader>
                <Paragraph>Search Lyrics</Paragraph>
            </ModalHeader>
            <ModalContent>
                <div className={cl("search-modal")}>
                    <TextInput
                        value={query}
                        onChange={setQuery}
                        placeholder="search"
                    />
                    <Paragraph>Selecting lyrics from here will write over the existing lrclib lyrics, if any.</Paragraph>
                    <Paragraph>You must be listening to the song when you select one</Paragraph>

                    {error && <Paragraph>{error}</Paragraph>}

                    <div className="vc-spotify-lyrics-search-results">
                        {results.length ? results.map((track, i) => (
                            <div key={i} className={clSearchResult}>
                                <Flex style={{ justifyContent: "space-between" }}>
                                    <div>
                                        <Paragraph className={clSearchResultTitle}>
                                            {track.name} - {formatTime(track.duration)}
                                        </Paragraph>
                                        <Paragraph className={clSearchResultArtist}>
                                            {track.artistName}{track.albumName ? ` - ${track.albumName}` : ""}
                                        </Paragraph>
                                    </div>
                                    <div className="vc-spotify-lyrics-search-buttons">
                                        <Button
                                            onClick={() => openModal(props => <LyricsModal props={props} previewLyrics={lrcFormatToSyncedLyrics(track.syncedLyrics!)} />)}
                                            size={"small"}
                                        >
                                            Preview
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                props.onClose();
                                                handleSelect(track);
                                            }}
                                            size={"small"}
                                        >
                                            Select
                                        </Button>
                                    </div>
                                </Flex>
                                <Divider />
                            </div>
                        )) : (
                            <Paragraph>No results</Paragraph>
                        )}
                    </div>
                </div>
            </ModalContent>
        </ModalRoot >
    );
}
