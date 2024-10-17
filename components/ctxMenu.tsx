/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { copyWithToast } from "@utils/misc";
import { FluxDispatcher, Icons, Menu } from "@webpack/common";

import { Provider } from "../types";
import { useLyrics } from "./util";


export function LyricsContextMenu() {
    const { lyricsInfo, currentLyrics, currLrcIndex } = useLyrics();
    const hasAShowingLyric = currLrcIndex !== null && currLrcIndex >= 0;
    const doesntHaveTrans = lyricsInfo?.englishTranslation?.length === 0;
    const isUsingMusixmatch = lyricsInfo?.useLyric === Provider.Musixmatch;
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
                key="switch-provider-lrc"
                id="switch-provider-lrc"
                label={`Switch to ${isUsingMusixmatch ? "Lrclib" : "Musixmatch"}`}
                action={() => {
                    FluxDispatcher.dispatch({
                        // @ts-ignore
                        type: "SPOTIFY_LYRICS_PROVIDER",
                        provider: isUsingMusixmatch ? Provider.Lrclib : Provider.Musixmatch
                    });
                }}
            />
            {lyricsInfo?.useLyric !== Provider.Lrclib && (
                <Menu.MenuCheckboxItem
                    id="musixmatch-eng-translation"
                    label={isUsingMusixmatch ? "Show English translation" : "Hide English translation"}
                    checked={lyricsInfo?.useLyric === Provider.Translated}
                    action={() => {
                        FluxDispatcher.dispatch({
                            // @ts-ignore
                            type: "SPOTIFY_LYRICS_PROVIDER",
                            provider: isUsingMusixmatch ? Provider.Translated : Provider.Musixmatch
                        });
                    }}
                />
            )}
        </Menu.Menu>
    );
}
