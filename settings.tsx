/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { BaseText } from "@components/BaseText";
import { Flex } from "@components/Flex";
import { Button, Paragraph } from "@components/index";
import { openModal } from "@utils/modal";
import { useAwaiter } from "@utils/react";
import { OptionType } from "@utils/types";
import { Select, showToast, Toasts, useMemo } from "@webpack/common";

import { clearLyricsCache, getLyricsCount, removeTranslations } from "./api";
import { CustomProvidersManager } from "./components/customProvidersManager";
import { SearchModal } from "./components/search";
import { useLyrics } from "./components/util";
import { getCustomProviders } from "./providers/customProvider";
import languages from "./providers/translator/languages";
import { Provider } from "./providers/types";

function Details() {
    const { lyricsInfo } = useLyrics();

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

function LyricsProviderSetting() {
    const [customProviders, error, loading] = useAwaiter(getCustomProviders, {
        fallbackValue: [],
    });

    const providerOptions = [
        { value: Provider.Spotify, label: "Spotify (Musixmatch)" },
        { value: Provider.LRCLIB, label: "LRCLIB", default: true },
        ...customProviders.map(provider => ({
            value: provider.id,
            label: provider.enabled ? provider.name : `${provider.name} (disabled)`,
        })),
    ];

    if (!settings.store.LyricsProvider) {
        settings.store.LyricsProvider = Provider.LRCLIB;
    }

    return (
        <Flex flexDirection="column" gap={8}>
            <BaseText size="md" weight="semibold">Where lyrics are fetched from</BaseText>
            {loading ? (
                <Paragraph>Loading custom providers...</Paragraph>
            ) : error ? (
                <Paragraph style={{ color: "var(--text-danger)" }}>
                    Failed to load custom providers. Built-in providers are still available.
                </Paragraph>
            ) : null}
            <Select
                placeholder="Select provider"
                options={providerOptions}
                maxVisibleItems={5}
                closeOnSelect={true}
                select={v => settings.store.LyricsProvider = v}
                isSelected={v => v === settings.store.LyricsProvider}
                serialize={v => String(v)}
            />
        </Flex>
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
        type: OptionType.COMPONENT,
        component: () => <LyricsProviderSetting />,
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
    CustomProviders: {
        description: "",
        type: OptionType.COMPONENT,
        component: () => <CustomProvidersManager />,
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
