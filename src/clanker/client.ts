import OpenAI from "openai";
import type {ChatCompletionMessageParam, ChatCompletionChunk} from "openai/resources/chat";

export type GrokMessage = ChatCompletionMessageParam;

export interface GrokTool {
    type: "function";
    function: {
        name: string;
        description: string;
        parameters: {
            type: "object";
            properties: Record<string, unknown>;
            required: string[];
        };
    };
}

export interface GrokToolCall {
    id: string;
    type: "function";
    function: {
        name: string;
        arguments: string;
    };
}

export interface SearchParameters {
    mode?: "auto" | "on" | "off";
    // sources removed - let API use default sources to avoid format issues
}

export interface SearchOptions {
    search_parameters?: SearchParameters;
}

export interface GrokResponse {
    choices: Array<{
        message: {
            role: string;
            content: string | null;
            tool_calls?: GrokToolCall[];
        };
        finish_reason: string;
    }>;
}

export class GrokClient {
    private client: OpenAI;
    private currentModel: string = "grok-3-latest";

    constructor(apiKey: string, model?: string, baseURL?: string) {
        this.client = new OpenAI({
            apiKey,
            baseURL: baseURL || process.env.GROK_BASE_URL || "https://api.x.ai/v1",
            timeout: 360000,
        });
        if (model) {
            this.currentModel = model;
        }
    }

    setModel(model: string): void {
        this.currentModel = model;
    }

    getCurrentModel(): string {
        return this.currentModel;
    }

    async chat(
        messages: GrokMessage[],
        tools?: GrokTool[],
        model?: string,
        searchOptions?: SearchOptions
    ): Promise<GrokResponse> {
        try {
            const requestPayload: Record<string, unknown> = {
                model: model || this.currentModel,
                messages: messages as unknown[],
                temperature: 0.7,
                max_tokens: 4000,
            };

            if (tools && tools.length > 0) {
                requestPayload.tools = tools;
                requestPayload.tool_choice = "auto" as const;
            }

            // Add search parameters if specified
            if (searchOptions?.search_parameters) {
                (requestPayload as { search_parameters?: unknown }).search_parameters = searchOptions.search_parameters;
            }

            const response = await this.client.chat.completions.create(
                requestPayload as unknown as Parameters<typeof this.client.chat.completions.create>[0]
            );

            return response as GrokResponse;
        } catch (error) {
            throw new Error(`Grok API error: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async* chatStream(
        messages: GrokMessage[],
        tools?: GrokTool[],
        model?: string,
        searchOptions?: SearchOptions
    ): AsyncGenerator<ChatCompletionChunk, void, unknown> {
        try {
            const requestPayload: Record<string, unknown> = {
                model: model || this.currentModel,
                messages: messages as unknown[],
                temperature: 0.7,
                max_tokens: 4000,
                stream: true as const,
            };

            if (tools && tools.length > 0) {
                requestPayload.tools = tools;
                requestPayload.tool_choice = "auto" as const;
            }

            // Add search parameters if specified
            if (searchOptions?.search_parameters) {
                (requestPayload as { search_parameters?: unknown }).search_parameters = searchOptions.search_parameters;
            }

            // Log timing for debugging
            const stream = await this.client.chat.completions.create(
                requestPayload as unknown as Parameters<typeof this.client.chat.completions.create>[0]
            );

            let firstChunk = true;

            for await (const chunk of stream as AsyncIterable<ChatCompletionChunk>) {
                if (firstChunk) {
                    firstChunk = false;
                }
                yield chunk;
            }
        } catch (error) {
            throw new Error(`Grok API error: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async search(
        query: string,
        searchParameters?: SearchParameters
    ): Promise<GrokResponse> {
        const searchMessage: GrokMessage = {
            role: "user",
            content: query,
        };

        const searchOptions: SearchOptions = {
            search_parameters: searchParameters || {mode: "on"},
        };

        return this.chat([searchMessage], [], undefined, searchOptions);
    }
}
