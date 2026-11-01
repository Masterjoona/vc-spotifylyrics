/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { copyWithToast } from "@utils/discord";
import { findComponentByCodeLazy } from "@webpack";
import { FluxDispatcher, Menu, openModal } from "@webpack/common";

import { getCustomProviders } from "../providers/customProvider";
import { lyricsAlternative } from "../providers/translator";
import { SearchModal } from "./search";
import { useCurrentLyrics, useLyricIndex, useLyricsInfo, useSpotifyTrack } from "./util";

const CopyIcon = findComponentByCodeLazy(" 1-.5.5H10a6");
const SearchIcon = findComponentByCodeLazy("1.42l-4.67-4.68ZM17", "children:(");

export function LyricsContextMenu() {
    const track = useSpotifyTrack();
    const lyricsInfo = useLyricsInfo();
    const currentLyrics = useCurrentLyrics();
    const { currLrcIndex } = useLyricIndex(currentLyrics);
    const customProviders = getCustomProviders();

    const currLyric = currentLyrics?.[currLrcIndex ?? NaN];
    const hasLyrics = customProviders.some(provider => lyricsInfo?.lyricsVersions[provider.id]?.length);

    const allProviders = customProviders.map(p => ({ name: p.name, id: p.id, enabled: p.enabled }))
        .concat(lyricsAlternative.map(p => ({ name: p, id: p, enabled: true })));

    return (
        <Menu.Menu
            navId="spotify-lyrics-menu"
            onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
            aria-label="Spotify Lyrics Menu"
        >

            <Menu.MenuItem
                key="copy-lyric"
                id="copy-lyric"
                label="Copy current lyric"
                disabled={!currLyric?.text}
                action={() => copyWithToast(currLyric!.text!, "Lyric copied!")}
                icon={CopyIcon}
            />

            {!hasLyrics && (
                <Menu.MenuItem
                    key="search-lyrics"
                    id="search-lyrics"
                    label="Search for lyrics"
                    action={() => openModal(props => <SearchModal props={props} searchFor={track?.name} />)}
                    icon={SearchIcon}
                />
            )}

            <Menu.MenuItem
                navId="spotify-lyrics-provider"
                id="spotify-lyrics-provider"
                label="Lyrics Provider"
            >
                {allProviders.map(provider =>
                    <Menu.MenuRadioItem
                        key={`lyrics-provider-${provider.id}`}
                        id={`switch-provider-${provider.id.toLowerCase()}`}
                        group="vc-spotify-lyrics-switch-provider"
                        label={`${provider.name}${lyricsInfo?.lyricsVersions[provider.id] ? " (saved)" : ""}`}
                        checked={provider.id === lyricsInfo?.useLyric}
                        disabled={!provider.enabled || (lyricsAlternative.includes(provider.id) && !hasLyrics)}
                        action={() => {
                            FluxDispatcher.dispatch({
                                type: "SPOTIFY_LYRICS_PROVIDER_CHANGE",
                                provider: provider.id,
                            });
                        }}
                    />
                )}
            </Menu.MenuItem>
        </Menu.Menu>
    );
}
