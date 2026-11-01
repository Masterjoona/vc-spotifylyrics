/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button, Flex, Paragraph } from "@components/index";
import { isNonNullish } from "@utils/guards";
import { RenderModalProps } from "@vencord/discord-types";
import { FluxDispatcher, Modal, openModal, TextInput, useEffect, useState } from "@webpack/common";

import { mapLrcLyrics } from "../providers/common";
import { LRCLIB_PROVIDER_ID } from "../providers/defaults";
import { LyricsModal } from "./modal";
import { cl, formatTime } from "./util";

interface LRCLIBTrack {
    name: string;
    artistName: string;
    albumName: string;
    duration: number;
    syncedLyrics: string | null;
}

const clSearchResult = cl("search-result");
const clSearchResultTitle = cl("search-result-title");
const clSearchResultArtist = cl("search-result-artist");

const handleSelect = (track: LRCLIBTrack) => {
    FluxDispatcher.dispatch({
        type: "SPOTIFY_LYRICS_UPDATE",
        newLyrics: mapLrcLyrics(track.syncedLyrics!),
        provider: LRCLIB_PROVIDER_ID,
    });
};

export function SearchModal({ props, searchFor = "" }: { props: RenderModalProps, searchFor?: string | undefined; }) {
    const [query, setQuery] = useState(searchFor);
    const [results, setResults] = useState<LRCLIBTrack[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        const controller = new AbortController();
        const handler = setTimeout(async () => {
            setError(null);

            try {
                const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
                if (!res.ok) throw new Error(`Search failed with status ${res.status}`);

                const data = await res.json();

                setResults(data.filter(track => isNonNullish(track.syncedLyrics) && track.syncedLyrics.trim() !== ""));
            } catch (err) {
                if (controller.signal.aborted) return;
                console.error("failed to search for lyrics", err);
                setError("uh oh, something went wrong!!");
            }
        }, 350);

        return () => {
            clearTimeout(handler);
            controller.abort();
        };
    }, [query]);

    return (
        <Modal
            {...props}
            title={"Search Lyrics"}
        >
            <div className={cl("search-modal")}>
                <Paragraph>Selecting lyrics from here will write over the existing lrclib lyrics, if any.</Paragraph>
                <Paragraph>You must be listening to the song when you select one</Paragraph>
                <TextInput
                    value={query}
                    onChange={setQuery}
                    placeholder="search"
                />

                {error && <Paragraph>{error}</Paragraph>}

                <div className="vc-spotify-lyrics-search-results">
                    {results.length ? results.map((track, i) => (
                        <div key={i} className={clSearchResult}>
                            <SearchResult
                                track={track}
                                onClose={props.onClose}
                            />
                        </div>
                    )) : (
                        <Paragraph>No results</Paragraph>
                    )}
                </div>
            </div>
        </Modal >
    );
}


function SearchResult({ track, onClose }: { track: LRCLIBTrack; onClose: () => void; }) {
    return (
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
                    onClick={() => openModal(props => <LyricsModal
                        props={props}
                        previewLyrics={mapLrcLyrics(track.syncedLyrics!)} />
                    )}
                    size={"small"}
                >
                    Preview
                </Button>
                <Button
                    onClick={() => {
                        onClose();
                        handleSelect(track);
                    }}
                    size={"small"}
                >
                    Select
                </Button>
            </div>
        </Flex>
    );
}
