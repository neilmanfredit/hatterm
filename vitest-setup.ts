// Copyright 2026 Neil Manfred
// SPDX-License-Identifier: Apache-2.0

// Mock the electron package so tests can run outside of an Electron process.
import { vi } from "vitest";

vi.mock("electron", () => {
    const noop = vi.fn();
    const BaseWindow = class { on = noop; once = noop; loadURL = noop; close = noop; };
    const BrowserWindow = class extends BaseWindow { webContents = { send: noop }; };
    return {
        app: { getPath: vi.fn(() => "/tmp"), getVersion: vi.fn(() => "0.0.0"), isReady: vi.fn(() => true), on: noop, quit: noop },
        shell: { openExternal: vi.fn(), openPath: vi.fn() },
        ipcMain: { on: noop, handle: noop, removeHandler: noop, removeAllListeners: noop },
        ipcRenderer: { on: noop, send: noop, invoke: vi.fn(() => Promise.resolve()), removeListener: noop },
        nativeTheme: { shouldUseDarkColors: true, on: noop },
        dialog: { showOpenDialog: vi.fn(), showSaveDialog: vi.fn() },
        globalShortcut: { register: noop, unregister: noop },
        safeStorage: { isEncryptionAvailable: vi.fn(() => false), encryptString: vi.fn((s: string) => Buffer.from(s)), decryptString: vi.fn((b: Buffer) => b.toString()) },
        screen: { getPrimaryDisplay: vi.fn(() => ({ workAreaSize: { width: 1920, height: 1080 } })) },
        net: { request: vi.fn(), fetch: vi.fn() },
        webUtils: { getPathForFile: vi.fn() },
        contextBridge: { exposeInMainWorld: noop },
        webContents: { getAllWebContents: vi.fn(() => []) },
        Notification: class { show = noop; on = noop; },
        BaseWindow,
        BrowserWindow,
        WebContentsView: class { webContents = { loadURL: noop, on: noop }; setBounds = noop; },
        WebviewTag: class {},
        default: {},
    };
});
