// Copyright 2026 Neil Manfred
// SPDX-License-Identifier: Apache-2.0

import { cn, fireAndForget } from "@/util/util";
import { WaveAIModel } from "./waveai-model";

interface TelemetryRequiredMessageProps {
    className?: string;
}

const TelemetryRequiredMessage = ({ className }: TelemetryRequiredMessageProps) => {
    const handleConfigure = () => {
        fireAndForget(() => WaveAIModel.getInstance().openWaveAIConfig());
    };

    return (
        <div className={cn("flex flex-col h-full", className)}>
            <div className="flex-grow"></div>
            <div className="flex items-center justify-center p-8 text-center">
                <div className="max-w-md space-y-6">
                    <div className="space-y-4">
                        <i className="fa fa-sparkles text-accent text-5xl"></i>
                        <h2 className="text-2xl font-semibold text-foreground">Hatterm AI</h2>
                        <p className="text-secondary leading-relaxed">
                            Hatterm AI provides integrated AI chat that can interact with your widgets, help you with
                            code, analyze files, and assist with your terminal workflows.
                        </p>
                    </div>

                    <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <i className="fa fa-key text-blue-400 text-lg mt-0.5"></i>
                            <div className="text-left">
                                <div className="text-blue-400 font-medium mb-1">Configure an AI Provider</div>
                                <div className="text-secondary text-sm mb-3">
                                    <p className="mb-2">
                                        Hatterm AI supports bring-your-own-key (BYOK) with OpenAI, Google Gemini,
                                        Azure, and OpenRouter, plus local models via Ollama, LM Studio, and other
                                        OpenAI-compatible providers.
                                    </p>
                                    <p>
                                        Open the AI configuration to add your first provider and start chatting.
                                    </p>
                                </div>
                                <button
                                    onClick={handleConfigure}
                                    className="bg-accent/80 hover:bg-accent text-background px-4 py-2 rounded-lg font-medium cursor-pointer transition-colors"
                                >
                                    Configure AI Provider
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex-grow-[2]"></div>
        </div>
    );
};

TelemetryRequiredMessage.displayName = "TelemetryRequiredMessage";

export { TelemetryRequiredMessage };
