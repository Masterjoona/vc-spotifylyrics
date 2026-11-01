/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { Flex } from "@components/Flex";
import { FormSwitch } from "@components/FormSwitch";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { Switch } from "@components/Switch";
import { identity } from "@utils/misc";
import { promptToRestart } from "@utils/promptToRestart";
import { RenderModalProps } from "@vencord/discord-types";
import { Modal, openModal, Select, showToast, TextInput, useEffect, useState } from "@webpack/common";

import { addCustomProvider, fetchCustomLyrics, getCustomProviders, removeCustomProvider, updateCustomProvider } from "../providers/customProvider";
import { isProtectedProvider } from "../providers/defaults";
import { CustomProvider } from "../providers/types";

interface CustomProviderModalProps {
    modalProps: RenderModalProps;
    provider?: CustomProvider;
    onSaved: () => void;
}

const dummyTrack = {
    id: "5hM5arv9KDbCHS0k9uqwjr",
    name: "Borderline",
    artists: [{ name: "Tame Impala" }],
    album: { name: "Currents" },
    duration: 238000,
} as any;

function canParseProviderUrl(url: string) {
    return URL.canParse(
        url
            .replace("{artist}", "test")
            .replace("{track}", "test")
            .replace("{album}", "test")
            .replace("{id}", "test")
            .replace("{duration}", "1")
    );
}

function CustomProviderModal({ modalProps, provider, onSaved }: CustomProviderModalProps) {
    const [name, setName] = useState(provider?.name || "");
    const [rawUrl, setUrl] = useState(provider?.url || "");
    const [enabled, setEnabled] = useState(provider?.enabled ?? true);
    const [responseFormat, setResponseFormat] = useState(provider?.responseFormat || "spotify");
    const [responsePath, setResponsePath] = useState(provider?.responsePath || "");
    const [error, setError] = useState("");
    const [cspError, setCspError] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) {
            setError("Provider name is required");
            return;
        }
        if (!rawUrl.trim()) {
            setError("Provider URL is required");
            return;
        }
        if (!rawUrl.includes("{artist}") && !rawUrl.includes("{track}") && !rawUrl.includes("{id}")) {
            setError("URL must contain {artist}, {track}, or {id} placeholder");
            return;
        }

        if (!canParseProviderUrl(rawUrl)) {
            setError("URL is not valid");
            return;
        }

        const url = new URL(rawUrl);
        const origin = url.origin.toLocaleLowerCase();

        const isAllowed = await VencordNative.csp.isDomainAllowed(origin, ["connect-src"]);
        let cspChanged = false;

        if (!isAllowed) {
            const result = await VencordNative.csp.requestAddOverride(origin, ["connect-src"], "SpotifyLyrics");
            switch (result) {
                case "cancelled":
                case "unchecked":
                    setError("CSP override request wasn't approved.");
                    return;
                case "conflict":
                    setError("CSP override conflict. Another plugin may have already requested an override for this domain.");
                    return;
                case "invalid":
                    setError("Invalid domain. Please check the URL and try again.");
                    return;
                case "ok":
                    cspChanged = true;
                    break;
            }
        }

        const newProvider: CustomProvider = {
            id: provider?.id || Date.now().toString(),
            name: name.trim(),
            url: rawUrl.trim(),
            enabled,
            responseFormat: responseFormat as "spotify" | "lrc",
            responsePath: responsePath.trim() || undefined,
        };

        if (provider) {
            updateCustomProvider(provider.id, newProvider);
            showToast({ text: "Provider updated", variant: "success" });
        } else {
            addCustomProvider(newProvider);
            showToast({ text: "Provider added", variant: "success" });
        }

        onSaved();
        modalProps.onClose();

        if (cspChanged) {
            promptToRestart("relaunch", {
                subtitle: "A CSP override was added for this provider. Restart the app for it to take effect."
            });
        }
    };

    useEffect(() => {
        const handler = (event: SecurityPolicyViolationEvent) => {
            if (event.effectiveDirective !== "connect-src" || !event.blockedURI) return;
            setCspError(true);
        };

        document.addEventListener("securitypolicyviolation", handler);

        return () => {
            document.removeEventListener("securitypolicyviolation", handler);
        };
    }, []);

    const handleTest = async () => {
        setError("");
        if (!name.trim() || !rawUrl.trim()) {
            setError("Please fill in the required fields before testing.");
            return;
        }
        if (!canParseProviderUrl(rawUrl)) {
            setError("URL is not valid");
            return;
        }

        const testProvider: CustomProvider = {
            id: "test",
            name: name.trim(),
            url: rawUrl.trim(),
            enabled: true,
            responseFormat: responseFormat as "spotify" | "lrc",
            responsePath: responsePath.trim() || undefined,
        };

        const lyrics = await fetchCustomLyrics(testProvider, dummyTrack);
        if (lyrics?.length) {
            showToast({ text: "Test successful! Lyrics were fetched.", variant: "success" });
            return;
        }

        if (cspError) {
            setError("Test failed due to CSP restrictions. Please save and follow the instructions to add a CSP override for this provider.");
            setCspError(false);
            return;
        }

        setError("Test completed but no lyrics were returned. Please check the response format and path.");
    };

    return (
        <Modal
            {...modalProps}
            size="lg"
            title={provider ? "Edit Custom Provider" : "Add Custom Provider"}
            actions={[
                {
                    text: "Save",
                    variant: "primary",
                    onClick: handleSave
                },
                {
                    text: "Test",
                    variant: "secondary",
                    onClick: handleTest
                },
                {
                    text: "Cancel",
                    variant: "secondary",
                    onClick: modalProps.onClose
                }
            ]}
        >
            <Flex flexDirection="column" gap={12} style={{ padding: "4px 0" }}>
                <Heading tag="h3">Provider Name</Heading>
                <TextInput
                    type="text"
                    value={name}
                    onChange={v => {
                        setName(v);
                        setError("");
                    }}
                    placeholder="e.g., My Lyrics API"
                />
                <Heading tag="h3">API URL</Heading>
                <TextInput
                    type="text"
                    value={rawUrl}
                    onChange={v => {
                        setUrl(v);
                        setError("");
                    }}
                    placeholder="https://api.example.com/lyrics?artist={artist}&track={track}&album={album}&duration={duration}&id={id}"
                />
                <Paragraph>
                    Use {"{artist}"}, {"{track}"}, {"{album}"}, {"{duration}"} (seconds), or {"{id}"} as placeholders.
                </Paragraph>

                <Heading tag="h3">Response Format</Heading>
                <Select
                    options={[
                        { label: "Spotify", value: "spotify" },
                        { label: "LRC (LRC parser format)", value: "lrc" },
                    ]}
                    closeOnSelect={true}
                    select={v => setResponseFormat(v)}
                    isSelected={v => v === responseFormat}
                    serialize={identity}
                />

                <Heading>Response Path (Optional)</Heading>
                <TextInput
                    type="text"
                    value={responsePath}
                    onChange={setResponsePath}
                    placeholder="e.g., data.lyrics or result.lines"
                />
                <Paragraph>
                    Use dot notation to extract the lyrics value, for example: data.lyrics
                </Paragraph>

                <FormSwitch
                    title="Enabled"
                    value={enabled}
                    onChange={setEnabled}
                    hideBorder
                />

                {error && (
                    <Paragraph>
                        {error}
                    </Paragraph>
                )}
            </Flex>
        </Modal>
    );
}

export function CustomProvidersManager() {
    const [providers, setProviders] = useState(getCustomProviders);

    const handleDelete = async (id: string) => {
        try {
            await removeCustomProvider(id);
            setProviders(getCustomProviders());
            showToast({ text: "Provider deleted", variant: "success" });
        } catch (e) {
            console.error(e);
            showToast({ text: "Failed to delete provider", variant: "critical" });
        }
    };

    const handleToggle = (provider: CustomProvider) => {
        updateCustomProvider(provider.id, { enabled: !provider.enabled });
        setProviders(getCustomProviders());
    };

    const handleModelOpen = (provider?: CustomProvider) => {
        openModal(props => (
            <CustomProviderModal
                modalProps={props}
                provider={provider}
                onSaved={() => setProviders(getCustomProviders())}
            />
        ));
    };

    return (
        <Flex flexDirection="column" gap={12} style={{ marginTop: "16px" }}>
            <Heading>Custom Lyrics Providers</Heading>
            <Paragraph>
                Add custom lyrics provider endpoints. API response should return lyrics as JSON.
            </Paragraph>

            {providers.length === 0 ? (
                <Paragraph>
                    No custom providers added yet.
                </Paragraph>
            ) : (
                <Flex flexDirection="column" gap={8} style={{ maxHeight: "300px", overflowY: "auto" }}>
                    {providers.map(provider => (
                        <Flex
                            key={provider.id}
                            style={{
                                padding: "8px 12px",
                                borderRadius: "4px",
                                background: "var(--background-tertiary)",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: "8px"
                            }}
                        >
                            <Flex flexDirection="column" gap={4} style={{ flex: 1, minWidth: 0 }}>
                                <Flex alignItems="center" gap={8}>
                                    <Switch
                                        checked={provider.enabled}
                                        onChange={() => handleToggle(provider)}
                                    />
                                    <Paragraph size="md" weight="medium" style={{ opacity: provider.enabled ? 1 : 0.6 }}>
                                        {provider.name}
                                    </Paragraph>
                                    {provider.responseFormat && (
                                        <Paragraph
                                            size="sm"
                                            weight="medium"
                                            style={{
                                                background: "var(--background-secondary)",
                                                padding: "2px 6px",
                                                borderRadius: "3px",
                                            }}
                                        >
                                            {provider.responseFormat}
                                        </Paragraph>
                                    )}
                                </Flex>
                                <Paragraph>{provider.url}</Paragraph>
                                {provider.responsePath &&
                                    (<Paragraph>
                                        Path: {provider.responsePath}
                                    </Paragraph>)}
                            </Flex>
                            <Flex gap={8}>
                                <Button
                                    size="small"
                                    onClick={() => handleModelOpen(provider)}
                                >
                                    Edit
                                </Button>
                                <Button
                                    size="small"
                                    variant="dangerPrimary"
                                    disabled={isProtectedProvider(provider)}
                                    title={isProtectedProvider(provider) ? "Bundled providers cannot be deleted" : undefined}
                                    onClick={() => handleDelete(provider.id)}
                                >
                                    Delete
                                </Button>
                            </Flex>
                        </Flex>
                    ))}
                </Flex>
            )}

            <Button onClick={() => handleModelOpen()} variant="primary">
                Add Custom Provider
            </Button>
        </Flex>
    );
}
