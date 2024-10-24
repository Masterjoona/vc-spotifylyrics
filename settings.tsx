/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";
import { Button, showToast, Toasts } from "@webpack/common";

import { clearLyricsCache, removeTranslations } from "./api";
import languages from "./providers/translator/languages";
import { Provider } from "./providers/types";

export default definePluginSettings({
    ShowMusicNoteOnNoLyrics: {
        description: "Show a music note icon when no lyrics are found",
        type: OptionType.BOOLEAN,
        default: true,
    },
    LyricsPosition: {
        description: "Position of the lyrics",
        type: OptionType.SELECT,
        options: [
            { value: "above", label: "Above SpotifyControls" },
            { value: "below", label: "Below SpotifyControls", default: true },
        ],
    },
    LyricsProvider: {
        description: "Where lyrics are fetched from",
        type: OptionType.SELECT,
        options: [
            { value: Provider.Spotify, label: "Spotify (Musixmatch)", default: true },
            { value: Provider.Lrclib, label: "LRCLIB" },
        ],
    },
    TranslateTo: {
        description: "Translate lyrics to - Changing this will clear existing translations",
        type: OptionType.SELECT,
        options: languages,
        onChange: async () => {
            await removeTranslations();
            showToast("Translations cleared", Toasts.Type.SUCCESS);
        }

    },
    PurgeLyricsCache: {
        description: "Purge the lyrics cache",
        type: OptionType.COMPONENT,
        component: () => (
            <Button
                color={Button.Colors.RED}
                onClick={() => {
                    clearLyricsCache();
                    showToast("Lyrics cache purged", Toasts.Type.SUCCESS);
                }}
            >
                Purge Cache
            </Button>
        ),
    },
});
