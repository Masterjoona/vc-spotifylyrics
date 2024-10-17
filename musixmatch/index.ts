/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Track } from "plugins/spotifyControls/SpotifyStore";

import { SyncedLyric } from "../types";
import { FindLyricsResp, SubtitleBodyString } from "./types/body";
import { TranslationResp } from "./types/translation";

// This code contains code from https://github.com/spicetify/cli/
// Spicetify/cli is licensed under GNU Lesser General Public License v2.1
// https://github.com/spicetify/cli/blob/bb767a9059143fe183c1c577acff335dc6a462b7/LICENSE
// Vencord and Spicetify licenses are compatible
// https://www.gnu.org/licenses/gpl-faq.html#AllCompatibility

const headers = {
    authority: "apic-desktop.musixmatch.com",
    cookie: "x-mxm-token-guid=",
};

// see https://spicetify.app/docs/faq#sometimes-popup-lyrics-andor-lyrics-plus-seem-to-not-work
// This is the token which spicetify uses
const userToken = "200501593b603a3fdc5c9b4a696389f6589dd988e5a1cf02dfdce1";

const findURL =
    "https://apic-desktop.musixmatch.com/ws/1.1/macro.subtitles.get?format=json&namespace=lyrics_richsynched&subtitle_format=mxm&app_id=web-desktop-app-v1.0&";

const translationURL =
    "https://apic-desktop.musixmatch.com/ws/1.1/crowd.track.translations.get?translation_fields_set=minimal&selected_language=en&comment_format=text&format=json&app_id=web-desktop-app-v1.0&";

function generateTimeString(time: { total: number; minutes: number; seconds: number; hundredths: number; }): string {
    const minutes = time.minutes.toString().padStart(2, "0");
    const seconds = time.seconds.toString().padStart(2, "0");
    const hundredths = time.hundredths.toString().padStart(2, "0");

    return `${minutes}:${seconds}.${hundredths}`;
}


export async function findLyrics(track: Track): Promise<FindLyricsResp["message"]["body"]["macro_calls"] | null> {
    const durr = track.duration / 1000;

    const params = {
        q_album: track.album,
        q_artist: track.artists[0].name,
        q_artists: track.artists,
        q_track: track.name,
        track_spotify_id: `spotify:track:${track.id}`,
        q_duration: durr,
        f_subtitle_length: Math.floor(durr),
        usertoken: userToken,
    };

    const urlParams = new URLSearchParams(params as any);
    const finalURL = `${findURL}${urlParams.toString()}`;

    console.log(finalURL);

    const resp = await fetch(finalURL, { headers });
    if (!resp.ok) return null;

    const respBody = await resp.json() as FindLyricsResp;
    const macroCalls = respBody.message.body.macro_calls;

    if (macroCalls["matcher.track.get"].message.header.status_code !== 200) return null;
    if (macroCalls["track.lyrics.get"]?.message?.body?.lyrics?.restricted) return null;

    return macroCalls;
}

export function getSynced(body: FindLyricsResp["message"]["body"]["macro_calls"]): SyncedLyric[] | null {
    const meta = body?.["matcher.track.get"]?.message?.body;
    if (!meta) return null;

    const hasSynced = meta?.track?.has_subtitles;

    const isInstrumental = meta?.track?.instrumental;

    if (isInstrumental) return null;

    if (!hasSynced) return null;

    const subtitle =
        body["track.subtitles.get"]?.message?.body?.subtitle_list?.[0]
            ?.subtitle;
    if (!subtitle) return null;

    return (JSON.parse(subtitle.subtitle_body) as SubtitleBodyString[]).map(line => ({
        text: line.text || null,
        time: line.time.total,
        lrcTime: generateTimeString(line.time),
    }));
}

export async function getTranslation(trackId: number) {
    const params = new URLSearchParams({
        track_id: trackId,
        usertoken: userToken,
    } as any);

    const finalURL = `${translationURL}${params.toString()}`;

    console.log(finalURL);

    const resp = await fetch(finalURL, { headers });
    if (!resp.ok) return null;

    const respBody = await resp.json() as TranslationResp;

    if (respBody.message.header.status_code !== 200) return null;

    const transBody = respBody.message.body;

    if (!transBody.translations_list?.length) return null;

    return transBody.translations_list.map(({ translation }) => ({
        translation: translation.description,
        matchedLine: translation.matched_line,
    }));
}


