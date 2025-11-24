/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { openModal } from "@utils/modal";
import { useAwaiter, useIntersection } from "@utils/react";
import { OptionType } from "@utils/types";
import { showToast, Toasts, useMemo } from "@webpack/common";

import { clearLyricsCache, getLyricsCount, removeTranslations } from "./api";
import { Lyrics } from "./components/lyrics";
import { SearchModal } from "./components/search";
import { useLyrics } from "./components/util";
import languages from "./providers/translator/languages";
import { Provider } from "./providers/types";
import { Button, Paragraph } from "@components/index";

function Details() {
    const { lyricsInfo } = useLyrics({ scroll: false });

    const [count, error, loading] = useAwaiter(
        useMemo(() => getLyricsCount, []),
        {
            onError: e => console.error("Failed to get lyrics count", e),
            fallbackValue: null,
        }
    );

    return (
        <>
            <Paragraph>Current lyrics provider: {lyricsInfo?.useLyric || "None"}</Paragraph>
            {loading ? <Paragraph>Loading lyrics count...</Paragraph> : error ? <Paragraph>Failed to get lyrics count</Paragraph> : <Paragraph>Lyrics count: {count}</Paragraph>}
        </>
    );
}

const settings = definePluginSettings({
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
            { value: Provider.Spotify, label: "Spotify (Musixmatch)" },
            { value: Provider.LRCLIB, label: "LRCLIB", default: true },
        ],
    },
    FallbackProvider: {
        description: "When a lyrics provider fails, try other providers",
        type: OptionType.BOOLEAN,
        default: true,
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
    LyricsConversion: {
        description: "Automatically translate or romanize lyrics",
        type: OptionType.SELECT,
        options: [
            { value: Provider.None, label: "None", default: true },
            { value: Provider.Translated, label: "Translate" },
            { value: Provider.Romanized, label: "Romanize" },
        ]
    },
    ShowFailedToasts: {
        description: "Show toasts when lyrics fail to fetch",
        type: OptionType.BOOLEAN,
        default: true,
    },
    LyricDelay: {
        description: "",
        type: OptionType.NUMBER,
        default: 0,
    },
    Display: {
        description: "",
        type: OptionType.COMPONENT,
        component: () => {
            const [rootRef, isIntersecting] = useIntersection();
            return (
                <div ref={rootRef}>
                    <Lyrics scroll={isIntersecting} />
                </div>
            );
        }
    },
    Details: {
        description: "",
        type: OptionType.COMPONENT,
        component: () => <Details />,
    },
    SearchLyrics: {
        description: "",
        type: OptionType.COMPONENT,
        component: () => {
            return (
                <Button onClick={() => openModal(props => <SearchModal props={props} />)}>
                    Search from lrclib
                </Button>
            );
        }
    },
    PurgeLyricsCache: {
        description: "Purge the lyrics cache",
        type: OptionType.COMPONENT,
        component: () => (
            <Button
                variant="dangerPrimary"
                onClick={() => {
                    clearLyricsCache();
                    showToast("Lyrics cache purged", Toasts.Type.SUCCESS);
                }}
            >
                Purge Cache
            </Button>
        ),
    },
    TestingCache: {
        description: "Save songs to a testing cache instead",
        type: OptionType.BOOLEAN,
        default: false,
        hidden: true,
    }
});

export default settings;
