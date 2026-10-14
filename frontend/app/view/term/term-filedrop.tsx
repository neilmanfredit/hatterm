// Copyright 2026 Neil Manfred
// SPDX-License-Identifier: Apache-2.0

import { RpcApi } from "@/app/store/wshclientapi";
import { TabRpcClient } from "@/app/store/wshrpcutil";
import { formatRemoteUri } from "@/util/waveutil";
import * as React from "react";
import { useDrop } from "react-dnd";

interface TermFileDropProps {
    blockId: string;
    connection: string;
    cwd: string;
    children: React.ReactNode;
}

interface TermFileDropState {
    active: boolean;
    status: string | null;
    error: string | null;
}

async function copyFilesToTerminal(
    srcUris: string[],
    connection: string,
    cwd: string,
    onStatus: (s: string) => void,
    onError: (s: string) => void
) {
    const conn = connection || "local";
    for (const srcUri of srcUris) {
        const fileName = srcUri.split("/").pop() ?? "file";
        const destUri = formatRemoteUri(`${cwd}/${fileName}`, conn);
        onStatus(`Copying ${fileName}…`);
        try {
            await RpcApi.FileCopyCommand(
                TabRpcClient,
                { srcuri: srcUri, desturi: destUri, opts: { timeout: 31536000000 } },
                { timeout: 31536000000 }
            );
        } catch (e) {
            const msg = `${e}`;
            // attempt overwrite on conflict
            if (msg.includes("exists") || msg.includes("overwrite")) {
                try {
                    await RpcApi.FileCopyCommand(
                        TabRpcClient,
                        {
                            srcuri: srcUri,
                            desturi: destUri,
                            opts: { timeout: 31536000000, overwrite: true },
                        },
                        { timeout: 31536000000 }
                    );
                } catch (e2) {
                    onError(`Failed to copy ${fileName}: ${e2}`);
                    return;
                }
            } else {
                onError(`Failed to copy ${fileName}: ${e}`);
                return;
            }
        }
    }
    onStatus(null);
}

const TermFileDrop = ({ blockId, connection, cwd, children }: TermFileDropProps) => {
    const [dropState, setDropState] = React.useState<TermFileDropState>({
        active: false,
        status: null,
        error: null,
    });
    const nativeDragActive = React.useRef(false);

    const onStatus = React.useCallback((s: string | null) => {
        setDropState((prev) => ({ ...prev, status: s, active: false }));
        if (s == null) {
            setTimeout(() => setDropState({ active: false, status: null, error: null }), 800);
        }
    }, []);
    const onError = React.useCallback((s: string) => {
        setDropState({ active: false, status: null, error: s });
    }, []);

    // react-dnd drop: accepts FILE_ITEM from wave file browser
    const [{ isOver }, dropRef] = useDrop(
        () => ({
            accept: "FILE_ITEM",
            collect: (monitor) => ({ isOver: monitor.isOver() }),
            drop: (item: { uri: string; name: string }, monitor) => {
                if (monitor.didDrop()) return;
                if (!cwd) return;
                setDropState({ active: true, status: "Copying…", error: null });
                void copyFilesToTerminal([item.uri], connection, cwd, onStatus, onError);
            },
        }),
        [connection, cwd]
    );

    // Native OS file drag (e.g. from Dolphin/Finder)
    const handleDragOver = React.useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            if (e.dataTransfer.types.includes("Files")) {
                e.preventDefault();
                e.stopPropagation();
                if (!nativeDragActive.current) {
                    nativeDragActive.current = true;
                    setDropState((prev) => ({ ...prev, active: true }));
                }
            }
        },
        []
    );

    const handleDragLeave = React.useCallback((e: React.DragEvent<HTMLDivElement>) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        if (
            e.clientX < rect.left ||
            e.clientX > rect.right ||
            e.clientY < rect.top ||
            e.clientY > rect.bottom
        ) {
            nativeDragActive.current = false;
            setDropState((prev) => ({ ...prev, active: false }));
        }
    }, []);

    const handleDrop = React.useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            nativeDragActive.current = false;
            if (!e.dataTransfer.files.length) return;
            if (!cwd) {
                setDropState({ active: false, status: null, error: "Cannot drop: terminal CWD unknown" });
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            // Electron exposes File.path for native files
            const srcUris: string[] = [];
            for (let i = 0; i < e.dataTransfer.files.length; i++) {
                const f = e.dataTransfer.files[i] as File & { path?: string };
                if (f.path) {
                    srcUris.push(formatRemoteUri(f.path, "local"));
                }
            }
            if (!srcUris.length) return;
            setDropState({ active: true, status: `Copying ${srcUris.length} file(s)…`, error: null });
            void copyFilesToTerminal(srcUris, connection, cwd, onStatus, onError);
        },
        [connection, cwd, onStatus, onError]
    );

    const isActive = dropState.active || isOver;

    return (
        <div
            ref={dropRef}
            className="relative w-full h-full"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {children}
            {(isActive || dropState.status || dropState.error) && (
                <div
                    className={`absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none
                        ${isActive ? "bg-black/50 border-2 border-accent/80 border-dashed rounded" : ""}
                        ${dropState.error ? "bg-black/70" : ""}
                    `}
                >
                    {isActive && !dropState.status && (
                        <div className="text-primary text-sm font-medium px-4 py-2 bg-black/60 rounded">
                            Drop to copy here
                        </div>
                    )}
                    {dropState.status && (
                        <div className="text-primary text-sm font-medium px-4 py-2 bg-black/60 rounded">
                            {dropState.status}
                        </div>
                    )}
                    {dropState.error && (
                        <div className="text-red-400 text-sm font-medium px-4 py-2 bg-black/60 rounded max-w-xs text-center">
                            {dropState.error}
                            <button
                                className="pointer-events-auto block mx-auto mt-2 text-xs text-primary underline cursor-pointer"
                                onClick={() => setDropState({ active: false, status: null, error: null })}
                            >
                                Dismiss
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

TermFileDrop.displayName = "TermFileDrop";

export { TermFileDrop };
