/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Header } from "./body";

export interface TranslationResp {
    message: {
        header: Header;
        body: {
            translations_list: {
                translation: Translation;
            }[];
        };
    };
}

interface Translation {
    type_id: string;
    artist_id: number;
    language_from: string;
    user_id: string;
    app_id: string;
    user_languages: any[];
    snippet: string;
    description: string;
    selected_language: string;
    position: number;
    num_keypressed: number;
    do_not_detect_language: boolean;
    language: string;
    wantkey: boolean;
    _validated: boolean;
    create_timestamp: number;
    role: string[];
    type_id_weight: number;
    moderator: number;
    effectiveness: number;
    days_in_chart: number;
    last_updated: string;
    key: string;
    published_status_macro: number;
    matched_line: string;
    subtitle_matched_line: string;
    confidence: number;
    image_id: number;
    video_id: number;
    lyrics_id: number;
    subtitle_id: number;
    created_date: string;
    commontrack_id: number;
    is_expired: number;
    group_key: string;
    can_delete: number;
    is_mine: number;
    can_approve: number;
    can_translate: number;
}
