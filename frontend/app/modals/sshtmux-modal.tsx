// Copyright 2026 Neil Manfred
// SPDX-License-Identifier: Apache-2.0

import { atoms } from "@/app/store/global";
import { WorkspaceService } from "@/app/store/services";
import { RpcApi } from "@/app/store/wshclientapi";
import { TabRpcClient } from "@/app/store/wshrpcutil";
import { fireAndForget, makeConnRoute } from "@/util/util";
import * as jotai from "jotai";
import { memo, useEffect, useRef, useState } from "react";

export type SshTmuxModalMode = "ssh" | "sshtmux";

interface SshTmuxModalProps {
    mode: SshTmuxModalMode;
    onClose: () => void;
}

type Step = "conn" | "tmux";

export const SshTmuxModal = memo(({ mode, onClose }: SshTmuxModalProps) => {
    const [step, setStep] = useState<Step>("conn");
    const [connList, setConnList] = useState<string[]>([]);
    const [connLoading, setConnLoading] = useState(true);
    const [selectedConn, setSelectedConn] = useState<string>(null);
    const [tmuxSessions, setTmuxSessions] = useState<string[]>([]);
    const [tmuxLoading, setTmuxLoading] = useState(false);
    const [filterText, setFilterText] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const workspaceId = jotai.useAtomValue(atoms.workspaceId);

    useEffect(() => {
        RpcApi.ConnListCommand(TabRpcClient, { timeout: 5000 })
            .then((list) => setConnList(list ?? []))
            .catch(() => setConnList([]))
            .finally(() => setConnLoading(false));
    }, []);

    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 50);
    }, [step]);

    async function handleConnSelect(conn: string) {
        if (mode === "ssh") {
            await openNewTab(conn, null);
            return;
        }
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

    async function openNewTab(conn: string, tmuxSession: string, newTmux = false) {
        onClose();
        const blockDef: BlockDef = {
            meta: {
                view: "term",
                controller: "shell",
                connection: conn,
            },
        };
        if (newTmux) {
            blockDef.meta["cmd:initscript"] = `exec tmux new-session`;
        } else if (tmuxSession != null) {
            blockDef.meta["cmd:initscript"] = `tmux attach-session -t ${JSON.stringify(tmuxSession)} 2>/dev/null || exec tmux new-session`;
        }
        const newTabId = await WorkspaceService.CreateTab(workspaceId, null, true);
        await RpcApi.CreateBlockCommand(
            TabRpcClient,
            { tabid: newTabId, blockdef: blockDef, focused: true },
            { timeout: 10000 }
        );
    }

    const filteredConns = connList.filter((c) => c.toLowerCase().includes(filterText.toLowerCase()));
    const filteredSessions = tmuxSessions.filter((s) => s.toLowerCase().includes(filterText.toLowerCase()));

    const title = step === "conn" ? (mode === "ssh" ? "New SSH Tab" : "New SSH + Tmux Tab") : `Tmux Sessions on ${selectedConn}`;
    const placeholder = step === "conn" ? "Filter connections..." : "Filter sessions...";

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className="bg-zinc-900 border border-zinc-600 rounded-lg shadow-2xl w-[420px] max-h-[500px] flex flex-col overflow-hidden"
                onKeyDown={(e) => {
                    if (e.key === "Escape") onClose();
                }}
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
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        placeholder={placeholder}
                        className="w-full bg-zinc-800 text-zinc-200 text-sm rounded px-3 py-1.5 outline-none placeholder-zinc-500 border border-zinc-700 focus:border-zinc-500"
                        onKeyDown={(e) => {
                            if (e.key === "Escape") onClose();
                        }}
                    />
                </div>

                <div className="flex-1 overflow-y-auto">
                    {step === "conn" && (
                        <>
                            {connLoading && (
                                <div className="px-4 py-3 text-sm text-zinc-500">Loading connections...</div>
                            )}
                            {!connLoading && filteredConns.length === 0 && (
                                <div className="px-4 py-3 text-sm text-zinc-500">
                                    {filterText ? "No matches" : "No SSH connections configured"}
                                </div>
                            )}
                            {filteredConns.map((conn) => (
                                <button
                                    key={conn}
                                    onClick={() => fireAndForget(() => handleConnSelect(conn))}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 cursor-pointer transition-colors text-left"
                                >
                                    <i className="fa fa-server text-zinc-500 w-4 text-center" />
                                    <span className="font-mono">{conn}</span>
                                </button>
                            ))}
                        </>
                    )}

                    {step === "tmux" && (
                        <>
                            {tmuxLoading && (
                                <div className="px-4 py-3 text-sm text-zinc-500">Connecting and listing sessions...</div>
                            )}
                            {!tmuxLoading && (
                                <>
                                    <button
                                        onClick={() => fireAndForget(() => openNewTab(selectedConn, null, true))}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 cursor-pointer transition-colors text-left border-b border-zinc-800"
                                    >
                                        <i className="fa fa-plus text-zinc-500 w-4 text-center" />
                                        <span>New tmux session</span>
                                    </button>
                                    {filteredSessions.length === 0 && !filterText && (
                                        <div className="px-4 py-3 text-sm text-zinc-500">No existing sessions</div>
                                    )}
                                    {filteredSessions.map((session) => (
                                        <button
                                            key={session}
                                            onClick={() => fireAndForget(() => openNewTab(selectedConn, session))}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 cursor-pointer transition-colors text-left"
                                        >
                                            <i className="fa fa-terminal text-zinc-500 w-4 text-center" />
                                            <span className="font-mono">{session}</span>
                                        </button>
                                    ))}
                                </>
                            )}
                            <button
                                onClick={() => {
                                    setStep("conn");
                                    setFilterText("");
                                    setSelectedConn(null);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 cursor-pointer transition-colors text-left border-t border-zinc-800 mt-1"
                            >
                                <i className="fa fa-arrow-left w-4 text-center" />
                                <span>Back to connections</span>
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
});

SshTmuxModal.displayName = "SshTmuxModal";
