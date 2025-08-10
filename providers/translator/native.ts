import { CspPolicies, ConnectSrc } from "@main/csp";

CspPolicies["https://translate.googleapis.com"] = ConnectSrc;

export interface GoogleData {
    src: string;
    sentences: {
        trans: string;
        orig: string;
        src_translit?: string;
    }[];
}

function buildTranslateUrl(text: string, targetLang: string, romanize: boolean) {
    const params = new URLSearchParams({
		// see https://stackoverflow.com/a/29537590 for more params
        // holy shidd nvidia
        client: "gtx",
		// source language
        sl: "auto",
		// target language
        tl: targetLang,
		// what to return, t = translation probably
        dt: romanize ? "rm" : "t",
		// Send json object response instead of weird array
        dj: "1",
        source: "input",
		// query, duh
        q: text
    });
    return `https://translate.googleapis.com/translate_a/single?${params.toString()}`;
}

export async function googleTranslateNative(
    text: string,
    targetLang: string,
    romanize: boolean
): Promise<GoogleData | null> {
    try {
        const url = buildTranslateUrl(text, targetLang, romanize);
        const res = await fetch(url);
        if (!res.ok) return null;
        const json = (await res.json()) as GoogleData;
        if (!json?.sentences?.length) return null;
        return json;
    } catch (err) {
        console.error("[vc-spotifylyrics native.ts] googleTranslateNative error:", err);
        return null;
    }
}
