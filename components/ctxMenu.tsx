/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { copyWithToast } from "@utils/misc";
import { FluxDispatcher, Icons, Menu } from "@webpack/common";

import { Provider } from "../providers/types";
import { useLyrics } from "./util";

function ProviderMenuItem(toProvider: Provider, currentProvider?: Provider) {
    return (
        (!currentProvider || currentProvider !== toProvider) && (
            <Menu.MenuItem
                key={`switch-provider-${toProvider.toLowerCase()}`}
                id={`switch-provider-${toProvider.toLowerCase()}`}
                label={`Switch to ${toProvider}`}
                action={() => {
                    FluxDispatcher.dispatch({
                        // @ts-ignore
                        type: "SPOTIFY_LYRICS_PROVIDER_CHANGE",
                        provider: toProvider,
                    });
                }}
            />
        )
    );
}

export function LyricsContextMenu() {
    const { lyricsInfo, currentLyrics, currLrcIndex } = useLyrics();
    const hasAShowingLyric = currLrcIndex !== null && currLrcIndex >= 0;
    return (
        <Menu.Menu
            navId="spotify-lyrics-menu"
            onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
            aria-label="Spotify Lyrics Menu"
        >
            {hasAShowingLyric && (
                <Menu.MenuItem
                    key="copy-lyric"
                    id="copy-lyric"
                    label="Copy lyric"
                    action={() => {
                        copyWithToast(currentLyrics![currLrcIndex].text!, "Lyric copied!");
                    }}
                    icon={Icons.CopyIcon}
                />
            )}
            <Menu.MenuItem
                navId="spotify-lyrics-provider"
                id="spotify-lyrics-provider"
                label="Lyrics Provider"
            >
                {ProviderMenuItem(Provider.Spotify, lyricsInfo?.useLyric)}
                {ProviderMenuItem(Provider.Lrclib, lyricsInfo?.useLyric)}
                {ProviderMenuItem(Provider.Translated, lyricsInfo?.useLyric)}
                {ProviderMenuItem(Provider.Romanized, lyricsInfo?.useLyric)}
            </Menu.MenuItem>
        </Menu.Menu>
    );
}
