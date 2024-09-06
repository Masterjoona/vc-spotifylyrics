/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings, Settings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType, } from "@utils/types";
import { Player } from "plugins/spotifyControls/PlayerComponent";

import { Lyrics } from "./lyrics";


export const settings = definePluginSettings({
    ShowMusicNoteOnNoLyrics: {
        description: "Show a music note icon when no lyrics are found",
        type: OptionType.BOOLEAN,
        default: true,
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
                replace: "$self.FakePanelWrapper"
            },
            predicate: () => Settings.plugins.SpotifyControls.enabled
        },
    ],
    FakePanelWrapper({ VencordOriginal, ...props }) {
        return (
            <>
                <ErrorBoundary
                    fallback={() => (
                        <div className="vc-spotify-fallback">
                            <p>Failed to render Spotify Lyrics Modal :(</p>
                            <p >Check the console for errors</p>
                        </div>
                    )}
                >
                    <Player />
                    <Lyrics />
                </ErrorBoundary>

                <VencordOriginal {...props} />
            </>
        );
    },
    settings,
});
