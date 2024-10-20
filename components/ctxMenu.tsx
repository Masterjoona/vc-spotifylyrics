/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { copyWithToast } from "@utils/misc";
import { FluxDispatcher, Icons, Menu } from "@webpack/common";

import { useLyrics } from "./util";

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
        </Menu.Menu>
    );
}
