/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { copyWithToast } from "@utils/discord";
import { openModal } from "@utils/modal";
import { useAwaiter } from "@utils/react";
import { findComponentByCodeLazy } from "@webpack";
import { FluxDispatcher, Menu } from "@webpack/common";

import { providers } from "../api";
import { getCustomProviders } from "../providers/customProvider";
import { lyricsAlternative } from "../providers/store";
import { Provider } from "../providers/types";
import { SearchModal } from "./search";
import { useLyrics } from "./util";

const CopyIcon = findComponentByCodeLazy(" 1-.5.5H10a6");
const SearchIcon = findComponentByCodeLazy("1.42l-4.67-4.68ZM17", "children:(");

export function LyricsContextMenu() {
    const { track, lyricsInfo, currentLyrics, currLrcIndex } = useLyrics({ scroll: false });
    const [customProviders] = useAwaiter(getCustomProviders, {
        fallbackValue: [],
    });

    const currLyric = currentLyrics?.[currLrcIndex ?? NaN];
    const hasLyrics = [...providers, ...customProviders.map(p => p.id)].some(provider => lyricsInfo?.lyricsVersions[provider]?.length);

    const allProviders = ([...providers, ...lyricsAlternative] as string[]).map(p => ({ name: p, id: p })).concat(customProviders.map(p => ({ name: p.name, id: p.id })));

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
                        disabled={lyricsAlternative.includes(provider.id as Provider) && !hasLyrics}
                        action={() => {
                            FluxDispatcher.dispatch({
                                // @ts-ignore
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
