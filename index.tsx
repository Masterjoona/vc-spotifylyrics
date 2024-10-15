/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings, Settings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Button, showToast, Toasts } from "@webpack/common";
import { Player } from "plugins/spotifyControls/PlayerComponent";

import { clearLyricsCache } from "./api";
import { Lyrics } from "./lyrics";

export const settings = definePluginSettings({
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

export default definePlugin({
    name: "SpotifyLyrics",
    authors: [Devs.Joona],
    description: "Adds lyrics to SpotifyControls",
    dependencies: ["SpotifyControls"],
    patches: [
        {
            find: "this.isCopiedStreakGodlike",
            replacement: {
                match: /Vencord\.Plugins\.plugins\["SpotifyControls"]\.PanelWrapper/,
                replace: "$self.FakePanelWrapper",
            },
            predicate: () => Settings.plugins.SpotifyControls.enabled,
        },
    ],
    FakePanelWrapper({ VencordOriginal, ...props }) {
        const { LyricsPosition } = settings.use(["LyricsPosition"]);
        return (
            <>
                <ErrorBoundary
                    fallback={() => (
                        <div className="vc-spotify-fallback">
                            <p>Failed to render Spotify Lyrics Modal :(</p>
                            <p>Check the console for errors</p>
                        </div>
                    )}
                >
                    {LyricsPosition === "above" && <Lyrics />}
                    <Player />
                    {LyricsPosition === "below" && <Lyrics />}
                </ErrorBoundary>

                <VencordOriginal {...props} />
            </>
        );
    },
    settings,
});
