#!/usr/bin/env node

// React imports removed - not needed for registry version
import {program} from "commander";
import * as dotenv from "dotenv";
import {GrokAgent} from "./clanker/agent";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {ConfirmationService} from "./utils/confirmation-service";
import {setDebugMode, debug} from "./utils/debug-logger";
// Display functions no longer needed - using React components instead

// Load environment variables
dotenv.config({quiet: true});

// Display functions are now handled by React components

// Load API key from user settings if not in environment
function loadApiKey(): string | undefined {
    // First check environment variables - check both for backward compatibility
    let apiKey = process.env.CLANKER_API_KEY || process.env.GROK_API_KEY;

    if (!apiKey) {
        // Try to load from user settings file
        try {
            const homeDir = os.homedir();
            const settingsFile = path.join(homeDir, ".clanker", "user-settings.json");

            if (fs.existsSync(settingsFile)) {
                const settings = JSON.parse(fs.readFileSync(settingsFile, "utf8"));
                apiKey = settings.apiKey;
            }
        } catch {
            // Ignore errors, apiKey will remain undefined
        }
    }

    return apiKey;
}

// Load base URL from user settings if not in environment
function loadBaseURL(): string | undefined {
    // First check environment variables - check both for backward compatibility
    let baseURL = process.env.CLANKER_BASE_URL || process.env.GROK_BASE_URL;

    if (!baseURL) {
        // Try to load from user settings file
        try {
            const homeDir = os.homedir();
            const settingsFile = path.join(homeDir, ".clanker", "settings.json");

            if (fs.existsSync(settingsFile)) {
                const settings = JSON.parse(fs.readFileSync(settingsFile, "utf8"));
                // Support both old baseURL and new provider system
                if (settings.provider) {
                    // We'll handle provider lookup when we have the full module loaded
                    if (settings.provider === 'custom') {
                        baseURL = settings.customBaseURL;
                    } else {
                        // For now, just use a default for grok
                        baseURL = 'https://api.x.ai/v1';
                    }
                } else {
                    // Fall back to old baseURL if provider not set
                    baseURL = settings.baseURL;
                }
            }
        } catch {
            // Ignore errors, baseURL will remain undefined
        }
    }

    return baseURL;
}

// Headless mode processing function
async function processPromptHeadless(
    prompt: string,
    apiKey: string,
    baseURL?: string,
    model?: string,
    loadDynamicTools?: boolean,
    dynamicToolsPath?: string
): Promise<void> {
    try {
        const agent = new GrokAgent({
            apiKey,
            baseURL,
            model: model || process.env.GROK_MODEL || "grok-3-latest",
            loadDynamicTools,
            dynamicToolsPath
        });

        // Wait for tools to load
        await agent.waitForToolsToLoad();

        // Configure confirmation service for headless mode (auto-approve all operations)
        const confirmationService = ConfirmationService.getInstance();
        confirmationService.setSessionFlag("allOperations", true);

        debug.log("Processing prompt with new registry system...\n");

        // Show loaded tools
        const registry = agent.getRegistry();
        const tools = registry.list();
        debug.log(`Loaded ${tools.length} tools: ${tools.map(t => t.id).join(', ')}\n`);

        // Process the message
        const response = await agent.chat([
            {role: "user", content: prompt}
        ], undefined, false) as string;

        console.log(response);

        // Show tool statistics if any tools were used
        const stats = agent.getToolStats();
        if (stats && Object.keys(stats).length > 0) {
            debug.log("\nTool Usage Statistics:");
            Object.entries(stats).forEach(([toolId, toolStats]) => {
                if ((toolStats as { executionCount: number }).executionCount > 0) {
                    const typedStats = toolStats as { executionCount: number; totalDuration: number };
                    const durationInSeconds = (typedStats.totalDuration / 1000).toFixed(2);
                    debug.log(`  - ${toolId}: ${typedStats.executionCount} calls, ${durationInSeconds}s total`);
                }
            });
        }
    } catch (error) {
        console.error("❌ Error processing prompt:", error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}

program
    .name("grok-registry")
    .description(
        "Test the new dynamic tool registry system for Grok CLI"
    )
    .version("0.1.0")
    .option("-d, --directory <dir>", "set working directory", process.cwd())
    .option("-k, --api-key <key>", "API key (or set CLANKER_API_KEY env var)")
    .option(
        "-u, --base-url <url>",
        "API base URL (or set CLANKER_BASE_URL env var)"
    )
    .option(
        "-m, --model <model>",
        "AI model to use (e.g., grok-beta)"
    )
    .option(
        "-p, --prompt <prompt>",
        "process a single prompt and exit (headless mode)"
    )
    .option(
        "--debug",
        "enable debug logging"
    )
    .option(
        "--load-dynamic-tools",
        "load dynamic tools from .clanker/tools directory"
    )
    .option(
        "--tools-path <path>",
        "custom path for dynamic tools (default: .clanker/tools)"
    )
    .option(
        "--list-tools",
        "list all available tools and exit"
    )
    .action(async (options) => {
        // Set debug mode if flag is present
        if (options.debug) {
            setDebugMode(true);
            debug.log('Debug mode enabled');
        }
        
        if (options.directory) {
            try {
                process.chdir(options.directory);
            } catch (error) {
                console.error(
                    `Error changing directory to ${options.directory}:`,
                    error instanceof Error ? error.message : String(error)
                );
                process.exit(1);
            }
        }

        try {
            // Get API key from options, environment, or user settings
            const apiKey = options.apiKey || loadApiKey();
            const baseURL = options.baseUrl || loadBaseURL();
            const model = options.model;

            if (!apiKey) {
                console.error(
                    "❌ Error: API key required. Set CLANKER_API_KEY environment variable, use --api-key flag, or save to ~/.clanker/user-settings.json"
                );
                process.exit(1);
            }

            // List tools mode
            if (options.listTools) {
                const agent = new GrokAgent({
                    apiKey,
                    baseURL,
                    model,
                    loadDynamicTools: options.loadDynamicTools,
                    dynamicToolsPath: options.toolsPath
                });

                // Wait for tools to load
                await agent.waitForToolsToLoad();

                const registry = agent.getRegistry();
                const tools = registry.list();

                console.log("📦 Available Tools:\n");
                tools.forEach(tool => {
                    console.log(`${tool.id} - ${tool.description}`);
                    if (tool.arguments && tool.arguments.length > 0) {
                        console.log("  Arguments:");
                        tool.arguments.forEach(arg => {
                            const required = arg.required ? " (required)" : "";
                            console.log(`    - ${arg.name}: ${arg.type}${required} - ${arg.description}`);
                        });
                    }
                    console.log();
                });
                return;
            }

            // Headless mode: process prompt and exit
            if (options.prompt) {
                await processPromptHeadless(
                    options.prompt,
                    apiKey,
                    baseURL,
                    model,
                    options.loadDynamicTools,
                    options.toolsPath
                );
                return;
            }

            // Interactive mode: launch UI
            const {render} = await import("ink");
            const React = await import("react");

            // Check if we can use raw mode
            const isRawModeSupported = process.stdin.isTTY;

            if (!isRawModeSupported) {
                console.error("❌ Error: Interactive mode requires a TTY. Use --prompt flag for non-interactive usage.");
                process.exit(1);
            }

            // Handle SIGINT (Ctrl+C) to prevent default termination
            // Import store actions for proper integration
            const { actions, store } = await import("./store");
            
            process.on('SIGINT', () => {
                // Use the store to manage exit confirmation state
                const state = store;
                const now = Date.now();
                
                if (state.exitConfirmation && state.exitConfirmationTime && (now - state.exitConfirmationTime) < 3000) {
                    // Second Ctrl+C within 3 seconds - exit
                    process.exit(0);
                } else {
                    // First Ctrl+C or after timeout
                    // Clear input when Ctrl+C is pressed
                    if (state.inputValue.trim()) {
                        actions.setInputValue("");
                    }
                    actions.setExitConfirmation(true);
                    setTimeout(() => actions.setExitConfirmation(false), 3000);
                }
            });

            // Check if we have settings or need to show settings screen
            const {SettingsManager, ProviderModels} = await import("./utils/settings-manager");
            const settingsManager = SettingsManager.getInstance();
            const {settings, isValid} = settingsManager.loadSettings();
            
            let agent: GrokAgent | undefined;
            
            // Try to create agent if we have valid settings
            if (isValid && settings.apiKey) {
                try {
                    // Get the base URL from provider configuration
                    let configuredBaseURL: string | undefined;
                    if (settings.provider === 'custom') {
                        configuredBaseURL = settings.customBaseURL;
                    } else {
                        const providerConfig = ProviderModels[settings.provider || 'grok'];
                        configuredBaseURL = providerConfig.baseURL;
                    }
                    
                    agent = new GrokAgent({
                        apiKey: settings.apiKey,
                        baseURL: configuredBaseURL || baseURL,
                        model: model || settings.model || ProviderModels.grok.defaultModel,
                        loadDynamicTools: options.loadDynamicTools,
                        dynamicToolsPath: options.toolsPath
                    });
                } catch (error) {
                    console.error('Failed to create agent with saved settings:', error);
                }
            }
            
            // Always render AppContainer - it will handle showing settings if needed
            const {AppContainer} = await import("./ui/containers/AppContainer");
            const app = render(React.createElement(AppContainer, {agent}));
            
            // Ensure we exit cleanly on unmount
            app.waitUntilExit().then(() => {
                process.exit(0);
            });
        } catch (error) {
            console.error("❌ Error initializing Grok CLI:", error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    });

program.parse();