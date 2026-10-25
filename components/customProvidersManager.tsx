/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { Flex } from "@components/Flex";
import { FormSwitch } from "@components/FormSwitch";
import { HeadingSecondary } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { Switch } from "@components/Switch";
import { identity } from "@utils/misc";
import { RenderModalProps } from "@vencord/discord-types";
import { Modal, openModal, Select, showToast, TextInput, useEffect, useState } from "@webpack/common";

import { addCustomProvider, fetchCustomLyrics, getCustomProviders, removeCustomProvider, updateCustomProvider } from "../providers/customProvider";
import { CustomProvider } from "../providers/types";

interface CustomProviderModalProps {
    modalProps: RenderModalProps;
    provider?: CustomProvider;
    onSaved: () => Promise<void>;
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

        const canBeParsed = URL.canParse(rawUrl.replace("{artist}", "test").replace("{track}", "test").replace("{id}", "test"));
        if (!canBeParsed) {
            setError("URL is not valid");
            return;
        }

        const url = new URL(rawUrl);
        const origin = url.origin.toLocaleLowerCase();

        const isAllowed = await VencordNative.csp.isDomainAllowed(origin, ["connect-src"]);

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
                    showToast({ text: "CSP override added. You can now save this provider.", variant: "success" });
                    break;
            }
        }

        try {
            const newProvider: CustomProvider = {
                id: provider?.id || Date.now().toString(),
                name: name.trim(),
                url: rawUrl.trim(),
                enabled,
                responseFormat: responseFormat as "spotify" | "lrc",
                responsePath: responsePath.trim() || undefined,
            };

            if (provider) {
                await updateCustomProvider(provider.id, newProvider);
                showToast({ text: "Provider updated", variant: "success" });
            } else {
                await addCustomProvider(newProvider);
                showToast({ text: "Provider added", variant: "success" });
            }

            await onSaved();
            modalProps.onClose();
        } catch (e) {
            setError(`Failed to save provider: ${e}`);
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

        try {
            const testProvider: CustomProvider = {
                id: "test",
                name: name.trim(),
                url: rawUrl.trim(),
                enabled,
                responseFormat: responseFormat as "spotify" | "lrc",
                responsePath: responsePath.trim() || undefined,
            };

            const dummyTrack = {
                id: "5hM5arv9KDbCHS0k9uqwjr",
                name: "Borderline",
                artists: [{ name: "Tame Impala" }],
            } as any;

            const lyrics = await fetchCustomLyrics(testProvider, dummyTrack);
            if (lyrics && lyrics.length > 0) {
                showToast({ text: "Test successful! Lyrics were fetched.", variant: "success" });
            } else {
                if (cspError) {
                    setError("Test failed due to CSP restrictions. Please save and follow the instructions to add a CSP override for this provider.");
                    setCspError(false);
                    return;
                }
                setError("Test completed but no lyrics were returned. Please check the response format and path.");
            }
        } catch (e) {
            setError(`Test failed: ${e}`);
        }
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
                <HeadingSecondary>Provider Name</HeadingSecondary>
                <TextInput
                    type="text"
                    value={name}
                    onChange={v => {
                        setName(v);
                        setError("");
                    }}
                    placeholder="e.g., My Lyrics API"
                />
                <HeadingSecondary>API URL</HeadingSecondary>
                <TextInput
                    type="text"
                    value={rawUrl}
                    onChange={v => {
                        setUrl(v);
                        setError("");
                    }}
                    placeholder="https://api.example.com/lyrics?artist={artist}&track={track}&id={id}"
                />
                <Paragraph>
                    Use {"{artist}"}, {"{track}"}, or {"{id}"} as placeholders.
                </Paragraph>

                <HeadingSecondary>Response Format</HeadingSecondary>
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

                {responseFormat === "lrc" ?
                    <>
                        <HeadingSecondary>Response Path (Optional)</HeadingSecondary>
                        <TextInput
                            type="text"
                            value={responsePath}
                            onChange={setResponsePath}
                            placeholder="e.g., data.lyrics or result.lines"
                        />
                        <Paragraph>
                            Use dot notation to extract nested arrays, for example: data.lyrics
                        </Paragraph>
                    </>
                    : null}

                <FormSwitch
                    title="Enabled"
                    description="Use this provider in fallback order"
                    value={enabled}
                    onChange={setEnabled}
                    hideBorder
                />

                {!!error && (
                    <Paragraph>
                        {error}
                    </Paragraph>
                )}
            </Flex>
        </Modal>
    );
}

export function CustomProvidersManager() {
    const [providers, setProviders] = useState<CustomProvider[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadProviders();
    }, []);

    const loadProviders = async () => {
        try {
            const data = await getCustomProviders();
            setProviders(data);
        } catch (e) {
            console.error("Failed to load custom providers:", e);
            showToast({ text: "Failed to load providers", variant: "critical" });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await removeCustomProvider(id);
            setProviders(providers.filter(p => p.id !== id));
            showToast({ text: "Provider deleted", variant: "success" });
        } catch (e) {
            showToast({ text: "Failed to delete provider", variant: "critical" });
        }
    };

    const handleToggle = async (provider: CustomProvider) => {
        try {
            await updateCustomProvider(provider.id, { enabled: !provider.enabled });
            setProviders(
                providers.map(p =>
                    p.id === provider.id ? { ...p, enabled: !p.enabled } : p
                )
            );
        } catch (e) {
            showToast({ text: "Failed to update provider", variant: "critical" });
        }
    };

    const handleAdd = () => {
        openModal(props => (
            <CustomProviderModal
                modalProps={props}
                onSaved={loadProviders}
            />
        ));
    };

    const handleEdit = (provider: CustomProvider) => {
        openModal(props => (
            <CustomProviderModal
                modalProps={props}
                provider={provider}
                onSaved={loadProviders}
            />
        ));
    };

    if (loading) {
        return <Paragraph>Loading custom providers...</Paragraph>;
    }

    return (
        <Flex flexDirection="column" gap={12} style={{ marginTop: "16px" }}>
            <section>
                <HeadingSecondary>Custom Lyrics Providers</HeadingSecondary>
                <Paragraph>
                    Add custom lyrics provider endpoints. API response should return lyrics as JSON.
                </Paragraph>
            </section>

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
                                <Paragraph
                                    style={{
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {provider.url}
                                </Paragraph>
                                {provider.responsePath && (
                                    <Paragraph
                                        style={{
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        Path: {provider.responsePath}
                                    </Paragraph>
                                )}
                            </Flex>
                            <Flex gap={8}>
                                <Button
                                    size="small"
                                    onClick={() => handleEdit(provider)}
                                >
                                    Edit
                                </Button>
                                <Button
                                    size="small"
                                    variant="dangerPrimary"
                                    onClick={() => handleDelete(provider.id)}
                                >
                                    Delete
                                </Button>
                            </Flex>
                        </Flex>
                    ))}
                </Flex>
            )}

            <Button onClick={handleAdd} variant="primary">
                Add Custom Provider
            </Button>
        </Flex>
    );
}
