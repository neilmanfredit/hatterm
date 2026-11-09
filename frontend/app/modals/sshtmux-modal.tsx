// Copyright 2026 Neil Manfred
// SPDX-License-Identifier: Apache-2.0

import { atoms, setActiveTab } from "@/app/store/global";
import { WorkspaceService } from "@/app/store/services";
import { RpcApi } from "@/app/store/wshclientapi";
import { TabRpcClient } from "@/app/store/wshrpcutil";
import { fireAndForget, makeConnRoute } from "@/util/util";
import * as jotai from "jotai";
import { memo, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type SshTmuxModalMode = "ssh" | "sshtmux" | "localtmux";

interface SshTmuxModalProps {
    mode: SshTmuxModalMode;
    onClose: () => void;
}

type Step = "conn" | "tmux" | "newtmux";

function clamp(val: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, val));
}

export const SshTmuxModal = memo(({ mode, onClose }: SshTmuxModalProps) => {
    const isLocal = mode === "localtmux";
    const initialStep: Step = isLocal ? "tmux" : "conn";

    const [step, setStep] = useState<Step>(initialStep);
    const [connList, setConnList] = useState<string[]>([]);
    const [connLoading, setConnLoading] = useState(!isLocal);
    const [selectedConn, setSelectedConn] = useState<string>(null);
    const [tmuxSessions, setTmuxSessions] = useState<string[]>([]);
    const [tmuxLoading, setTmuxLoading] = useState(isLocal);
    const [filterText, setFilterText] = useState("");
    const [newSessionName, setNewSessionName] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const workspaceId = jotai.useAtomValue(atoms.workspaceId);

    useEffect(() => {
        if (isLocal) {
            const route = makeConnRoute(null);
            RpcApi.RemoteTmuxListSessionsCommand(TabRpcClient, { route, timeout: 5000 })
                .then((sessions) => setTmuxSessions(sessions ?? []))
                .catch(() => setTmuxSessions([]))
                .finally(() => setTmuxLoading(false));
            return;
        }
        RpcApi.ConnListCommand(TabRpcClient, { timeout: 5000 })
            .then((list) => setConnList(list ?? []))
            .catch(() => setConnList([]))
            .finally(() => setConnLoading(false));
    }, []);

    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 50);
        setActiveIndex(0);
    }, [step]);

    // scroll active item into view
    useEffect(() => {
        const el = listRef.current?.querySelector(`[data-idx="${activeIndex}"]`) as HTMLElement;
        el?.scrollIntoView({ block: "nearest" });
    }, [activeIndex]);

    const filteredConns = connList.filter((c) => c.toLowerCase().includes(filterText.toLowerCase()));
    const isNewConn = filterText.trim() !== "" && !connList.includes(filterText.trim());

    // conn step items: [new-conn-item-if-applicable, ...filtered existing conns]
    const connItems: Array<{ label: string; value: string; isNew?: boolean }> = [
        ...(isNewConn ? [{ label: `${filterText.trim()} (new connection)`, value: filterText.trim(), isNew: true }] : []),
        ...filteredConns.map((c) => ({ label: c, value: c })),
    ];

    const filteredSessions = tmuxSessions.filter((s) => s.toLowerCase().includes(filterText.toLowerCase()));
    // tmux step items: [New tmux session, ...existing sessions]
    const tmuxItems: Array<{ label: string; value: string; isNew?: boolean }> = [
        { label: "New tmux session", value: "__new__", isNew: true },
        ...filteredSessions.map((s) => ({ label: s, value: s })),
    ];

    async function goToTmuxStep(conn: string) {
        setSelectedConn(conn);
        setStep("tmux");
        setFilterText("");
        setTmuxLoading(true);
        const route = makeConnRoute(conn);
        try {
            await RpcApi.ConnEnsureCommand(TabRpcClient, { connname: conn }, { timeout: 30000 });
            const sessions = await RpcApi.RemoteTmuxListSessionsCommand(TabRpcClient, { route, timeout: 5000 });
            setTmuxSessions(sessions ?? []);
        } catch {
            setTmuxSessions([]);
        } finally {
            setTmuxLoading(false);
        }
    }

    async function handleConnSelect(conn: string) {
        if (mode === "ssh") {
            await openNewTab(conn, null);
            return;
        }
        await goToTmuxStep(conn);
    }

    function handleTmuxSelect(value: string) {
        if (value === "__new__") {
            setStep("newtmux");
            setNewSessionName("");
            return;
        }
        fireAndForget(() => openNewTab(selectedConn, value));
    }

    async function openNewTab(conn: string, tmuxSession: string, sessionName?: string) {
        onClose();
        const blockDef: BlockDef = {
            meta: {
                view: "term",
                controller: "shell",
            },
        };
        if (conn != null) {
            blockDef.meta.connection = conn;
        }
        if (sessionName != null && sessionName.trim() !== "") {
            blockDef.meta["cmd:initscript"] = `tmux new-session -s ${JSON.stringify(sessionName.trim())}`;
        } else if (tmuxSession === "__new__" || (tmuxSession == null && sessionName != null)) {
            blockDef.meta["cmd:initscript"] = `tmux new-session`;
        } else if (tmuxSession != null) {
            blockDef.meta["cmd:initscript"] = `tmux attach-session -t ${JSON.stringify(tmuxSession)} 2>/dev/null || tmux new-session`;
        }
        const newTabId = await WorkspaceService.CreateTab(workspaceId, null, true);
        setActiveTab(newTabId);
        await RpcApi.CreateBlockCommand(
            TabRpcClient,
            { tabid: newTabId, blockdef: blockDef, focused: true },
            { timeout: 10000 }
        );
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === "Escape") {
            onClose();
            return;
        }

        if (step === "conn") {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => clamp(i + 1, 0, connItems.length - 1));
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) => clamp(i - 1, 0, connItems.length - 1));
            } else if (e.key === "Enter" && connItems.length > 0) {
                e.preventDefault();
                fireAndForget(() => handleConnSelect(connItems[activeIndex].value));
            }
        } else if (step === "tmux") {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => clamp(i + 1, 0, tmuxItems.length - 1));
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) => clamp(i - 1, 0, tmuxItems.length - 1));
            } else if (e.key === "Enter" && !tmuxLoading) {
                e.preventDefault();
                handleTmuxSelect(tmuxItems[activeIndex]?.value ?? "__new__");
            }
        } else if (step === "newtmux") {
            if (e.key === "Enter") {
                e.preventDefault();
                fireAndForget(() => openNewTab(selectedConn, "__new__", newSessionName));
            }
        }
    }

    const connLabel = selectedConn ?? "localhost";
    let title: string;
    if (step === "conn") {
        title = mode === "ssh" ? "New SSH Tab" : "New SSH + Tmux Tab";
    } else if (step === "tmux") {
        title = `Tmux Sessions — ${connLabel}`;
    } else {
        title = `New Tmux Session — ${connLabel}`;
    }

    const placeholder =
        step === "conn"
            ? "Filter or enter user@host..."
            : step === "tmux"
              ? "Filter sessions..."
              : "Session name (optional)";

    const tmuxLoadingLabel = isLocal ? "Listing local sessions..." : "Connecting and listing sessions...";

    return createPortal(
        <div
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 9999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0,0,0,0.5)",
                WebkitAppRegion: "no-drag",
            } as React.CSSProperties}
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className="bg-zinc-900 border border-zinc-600 rounded-lg shadow-2xl w-[420px] max-h-[500px] flex flex-col overflow-hidden"
                style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
                onKeyDown={handleKeyDown}
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
                    <span className="text-sm font-medium text-zinc-200">{title}</span>
                    <button
                        onClick={onClose}
                        className="text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                        aria-label="Close"
                    >
                        <i className="fa fa-xmark" />
                    </button>
                </div>

                <div className="px-3 py-2 border-b border-zinc-700">
                    <input
                        ref={inputRef}
                        type="text"
                        value={step === "newtmux" ? newSessionName : filterText}
                        onChange={(e) => {
                            if (step === "newtmux") {
                                setNewSessionName(e.target.value);
                            } else {
                                setFilterText(e.target.value);
                                setActiveIndex(0);
                            }
                        }}
                        placeholder={placeholder}
                        className="w-full bg-zinc-800 text-zinc-200 text-sm rounded px-3 py-1.5 outline-none placeholder-zinc-500 border border-zinc-700 focus:border-zinc-500"
                    />
                </div>

                <div ref={listRef} className="flex-1 overflow-y-auto">
                    {step === "conn" && (
                        <>
                            {connLoading && (
                                <div className="px-4 py-3 text-sm text-zinc-500">Loading connections...</div>
                            )}
                            {!connLoading && connItems.length === 0 && (
                                <div className="px-4 py-3 text-sm text-zinc-500">
                                    No SSH connections — type user@host to connect
                                </div>
                            )}
                            {connItems.map((item, idx) => (
                                <button
                                    key={item.value}
                                    data-idx={idx}
                                    onClick={() => fireAndForget(() => handleConnSelect(item.value))}
                                    onMouseEnter={() => setActiveIndex(idx)}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm cursor-pointer transition-colors text-left ${
                                        idx === activeIndex
                                            ? "bg-zinc-700 text-zinc-100"
                                            : "text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                                    }`}
                                >
                                    <i
                                        className={`${item.isNew ? "fa fa-plus" : "fa fa-server"} text-zinc-500 w-4 text-center`}
                                    />
                                    <span className={item.isNew ? "" : "font-mono"}>{item.label}</span>
                                </button>
                            ))}
                        </>
                    )}

                    {step === "tmux" && (
                        <>
                            {tmuxLoading && (
                                <div className="px-4 py-3 text-sm text-zinc-500">{tmuxLoadingLabel}</div>
                            )}
                            {!tmuxLoading &&
                                tmuxItems.map((item, idx) => (
                                    <button
                                        key={item.value}
                                        data-idx={idx}
                                        onClick={() => handleTmuxSelect(item.value)}
                                        onMouseEnter={() => setActiveIndex(idx)}
                                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm cursor-pointer transition-colors text-left ${
                                            idx === activeIndex
                                                ? "bg-zinc-700 text-zinc-100"
                                                : "text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                                        } ${idx === 0 ? "border-b border-zinc-800" : ""}`}
                                    >
                                        <i
                                            className={`${item.isNew ? "fa fa-plus" : "fa fa-terminal"} text-zinc-500 w-4 text-center`}
                                        />
                                        <span className={item.isNew ? "" : "font-mono"}>{item.label}</span>
                                    </button>
                                ))}
                            {!tmuxLoading && filteredSessions.length === 0 && !filterText && (
                                <div className="px-4 py-3 text-sm text-zinc-500">No existing sessions</div>
                            )}
                            {!isLocal && (
                                <button
                                    onClick={() => {
                                        setStep("conn");
                                        setFilterText("");
                                        setSelectedConn(null);
                                        setTmuxSessions([]);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 cursor-pointer transition-colors text-left border-t border-zinc-800 mt-1"
                                >
                                    <i className="fa fa-arrow-left w-4 text-center" />
                                    <span>Back to connections</span>
                                </button>
                            )}
                        </>
                    )}

                    {step === "newtmux" && (
                        <div className="px-4 py-4 flex flex-col gap-4">
                            <p className="text-xs text-zinc-500">
                                Leave blank for an auto-named session, or enter a name to reuse with{" "}
                                <span className="font-mono">tmux attach</span>.
                            </p>
                            <button
                                onClick={() => fireAndForget(() => openNewTab(selectedConn, "__new__", newSessionName))}
                                className="bg-accent/80 hover:bg-accent text-primary rounded px-4 py-2 text-sm font-medium cursor-pointer transition-colors self-start"
                            >
                                {newSessionName.trim() ? `Create session "${newSessionName.trim()}"` : "Create session"}
                            </button>
                            <button
                                onClick={() => {
                                    setStep("tmux");
                                    setFilterText("");
                                }}
                                className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer transition-colors self-start"
                            >
                                <i className="fa fa-arrow-left" />
                                Back
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
});

SshTmuxModal.displayName = "SshTmuxModal";
