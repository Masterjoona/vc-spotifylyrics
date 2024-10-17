/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface FindLyricsResp {
    message: {
        body: {
            macro_calls: {
                "track.lyrics.get": { message: Message; };
                "track.snippet.get": { message: Message; };
                "track.subtitles.get": { message: Message; };
                "userblob.get": Userblobget;
                "matcher.track.get": { message: Message; };
            };
        },
        header: Header;
    };
}

interface Track {
    track_id: number;
    track_mbid: string;
    track_isrc: string;
    commontrack_isrcs: string[][];
    track_spotify_id: string;
    commontrack_spotify_ids: string[];
    commontrack_itunes_ids: number[];
    track_soundcloud_id: number;
    track_xboxmusic_id: string;
    track_name: string;
    track_name_translation_list: any[];
    track_rating: number;
    track_length: number;
    commontrack_id: number;
    instrumental: number;
    explicit: number;
    has_lyrics: number;
    has_lyrics_crowd: number;
    has_subtitles: number;
    has_richsync: number;
    has_track_structure: number;
    num_favourite: number;
    lyrics_id: number;
    subtitle_id: number;
    album_id: number;
    album_name: string;
    album_vanity_id: string;
    artist_id: number;
    artist_mbid: string;
    artist_name: string;
    album_coverart_100x100: string;
    album_coverart_350x350: string;
    album_coverart_500x500: string;
    album_coverart_800x800: string;
    track_share_url: string;
    track_edit_url: string;
    commontrack_vanity_id: string;
    restricted: number;
    first_release_date: string;
    updated_time: string;
    primary_genres: Primarygenres;
    secondary_genres: Primarygenres;
}
interface Primarygenres {
    music_genre_list: { music_genre: Musicgenre; }[];
}

interface Musicgenre {
    music_genre_id: number;
    music_genre_parent_id: number;
    music_genre_name: string;
    music_genre_name_extended: string;
    music_genre_vanity: string;
}

interface Userblobget {
    message: Message;
    meta: {
        status_code: number;
        last_updated: string;
    };
}

interface Subtitle {
    subtitle_id: number;
    restricted: number;
    published_status: number;
    subtitle_body: string;
    subtitle_avg_count: number;
    lyrics_copyright: string;
    subtitle_length: number;
    subtitle_language: string;
    subtitle_language_description: string;
    script_tracking_url: string;
    pixel_tracking_url: string;
    html_tracking_url: string;
    writer_list: any[];
    publisher_list: any[];
    updated_time: string;
}

// subtitle_body is a JSON string

export interface SubtitleBodyString {
    text: string;
    time: {
        total: number;
        minutes: number;
        seconds: number;
        hundredths: number;
    };
}


interface Snippet {
    snippet_id: number;
    snippet_language: string;
    restricted: number;
    instrumental: number;
    snippet_body?: any;
    script_tracking_url: string;
    pixel_tracking_url: string;
    html_tracking_url: string;
    updated_time: string;
}

interface Lyrics {
    lyrics_id: number;
    can_edit: number;
    check_validation_overridable: number;
    locked: number;
    published_status: number;
    action_requested: string;
    verified: number;
    restricted: number;
    instrumental: number;
    explicit: number;
    lyrics_body: string;
    lyrics_language: string;
    lyrics_language_description: string;
    script_tracking_url: string;
    pixel_tracking_url: string;
    html_tracking_url: string;
    lyrics_copyright: string;
    writer_list: any[];
    publisher_list: any[];
    backlink_url: string;
    updated_time: string;
}

export interface Header {
    status_code: number;
    execute_time?: number;

    available?: number;
    instrumental?: number;

    confidence?: number;
    mode?: string;
    cached?: number;

    pid?: number;
    surrogate_key_list?: any[];
}


interface Message {
    header: Header;
    body?: Body;
}

interface Body {
    lyrics?: Lyrics;
    track?: Track;
    subtitle_list?: { subtitle: Subtitle; }[];
    snippet?: Snippet;
}
