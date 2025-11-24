/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { copyWithToast } from "@utils/discord";
import { openModal } from "@utils/modal";
import { findComponentByCodeLazy } from "@webpack";
import { FluxDispatcher, Menu } from "@webpack/common";

import { providers } from "../api";
import { lyricsAlternative } from "../providers/store";
import { SearchModal } from "./search";
import { useLyrics } from "./util";

const CopyIcon = findComponentByCodeLazy(" 1-.5.5H10a6");
const SearchIcon = findComponentByCodeLazy("1.42l-4.67-4.68ZM17", "children:(");

export function LyricsContextMenu() {
    const { track, lyricsInfo, currentLyrics, currLrcIndex } = useLyrics({ scroll: false });

    const currLyric = currentLyrics?.[currLrcIndex ?? NaN];
    const hasLyrics = providers.some(provider => lyricsInfo?.lyricsVersions[provider]?.length);

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
                {[...providers, ...lyricsAlternative].map(provider =>
                    <Menu.MenuRadioItem
                        key={`lyrics-provider-${provider}`}
                        id={`switch-provider-${provider.toLowerCase()}`}
                        group="vc-spotify-lyrics-switch-provider"
                        label={`${provider}${lyricsInfo?.lyricsVersions[provider] ? " (saved)" : ""}`}
                        checked={provider === lyricsInfo?.useLyric}
                        disabled={lyricsAlternative.includes(provider) && !hasLyrics}
                        action={() => {
                            FluxDispatcher.dispatch({
                                // @ts-ignore
                                type: "SPOTIFY_LYRICS_PROVIDER_CHANGE",
                                provider: provider,
                            });
                        }}
                    />
                )}
            </Menu.MenuItem>
        </Menu.Menu>
    );
}
