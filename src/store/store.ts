import { proxy } from 'valtio';
import * as crypto from 'crypto';
import { GrokAgent } from '../clanker/agent';
import { MessageRegistryMessage } from '../registry/messages';
import { ToolExecution } from '../registry/execution';
import { ConfirmationOptions } from '../utils/confirmation-service';
import { GrokToolCall } from '../clanker/client';
import { debug } from '../utils/debug-logger';
import { Stage, StageType } from '../ui/stage/types';

// File tracker types
interface FileInfo {
    hash: string;
    lastRead: Date;
    lineCount: number;
}

// Define the complete store state
export interface AppState {
    // Agent slice
    agent: GrokAgent | null;
    isInitializing: boolean;
    initError: string | null;
    
    // Messages slice
    messages: MessageRegistryMessage[];
    messageCount: number;
    
    // Executions slice
    executions: Map<string, ToolExecution>;
    activeExecutions: string[];
    
    // File tracker slice
    trackedFiles: Map<string, FileInfo>;
    
    // UI slice
    isProcessing: boolean;
    isStreaming: boolean;
    tokenCount: number;
    processingTime: number;
    inputValue: string;
    cursorPosition: number;
    inputHistory: string[];
    historyIndex: number;
    showHelp: boolean;
    showModelSelector: boolean;
    exitConfirmation: boolean;
    showCommandSuggestions: boolean;
    selectedCommandIndex: number;
    commandSuggestions: string[];
    showModelSelection: boolean;
    selectedModelIndex: number;
    availableModels: string[];
    showCommandForm: boolean;
    
    // Stage management
    stageStack: Stage[];
    
    // Settings slice
    autoEditEnabled: boolean;
    vsCodeOpenEnabled: boolean;
    confirmationSettings: {
        alwaysEdit: boolean;
        alwaysBash: boolean;
        alwaysSearch: boolean;
    };
    theme: 'light' | 'dark' | 'auto';
    model: string;
    
    // Confirmation slice
    confirmationOptions: ConfirmationOptions | null;
    confirmationResolver: ((result: ConfirmationResult) => void) | null;
}

export interface ConfirmationResult {
    confirmed: boolean;
    dontAskAgain?: boolean;
    feedback?: string;
}

// Create the proxy store with initial state
export const store = proxy<AppState>({
    // Agent slice
    agent: null,
    isInitializing: false,
    initError: null,
    
    // Messages slice
    messages: [],
    messageCount: 0,
    
    // Executions slice
    executions: new Map(),
    activeExecutions: [],
    
    // File tracker slice
    trackedFiles: new Map(),
    
    // UI slice
    isProcessing: false,
    isStreaming: false,
    tokenCount: 0,
    processingTime: 0,
    inputValue: '',
    cursorPosition: 0,
    inputHistory: [],
    historyIndex: -1,
    showHelp: false,
    showModelSelector: false,
    exitConfirmation: false,
    showCommandSuggestions: false,
    selectedCommandIndex: 0,
    commandSuggestions: [],
    showModelSelection: false,
    selectedModelIndex: 0,
    availableModels: ['grok-4-latest', 'grok-3-latest', 'grok-4', 'grok-3', 'grok-beta'],
    showCommandForm: false,
    
    // Stage management
    stageStack: [{ id: 'main', type: StageType.CHAT }],
    
    // Settings slice
    autoEditEnabled: false,
    vsCodeOpenEnabled: false,
    confirmationSettings: {
        alwaysEdit: false,
        alwaysBash: false,
        alwaysSearch: false,
    },
    theme: 'auto',
    model: 'grok-beta',
    
    // Confirmation slice
    confirmationOptions: null,
    confirmationResolver: null,
});

// Store actions as separate functions
export const actions = {
    // Agent actions
    setAgent(agent: GrokAgent) {
        store.agent = agent;
        store.initError = null;
    },
    
    async initializeAgent(options: {
        apiKey: string;
        baseURL?: string;
        model?: string;
        maxToolRounds?: number;
        systemPrompt?: string;
        loadDynamicTools?: boolean;
        dynamicToolsPath?: string;
    }) {
        store.isInitializing = true;
        store.initError = null;
        
        try {
            const { GrokAgent } = await import('../clanker/agent');
            const agent = new GrokAgent(options);
            store.agent = agent;
            store.isInitializing = false;
        } catch (error) {
            store.isInitializing = false;
            store.initError = error instanceof Error ? error.message : 'Unknown error';
            throw error;
        }
    },
    
    clearAgent() {
        store.agent = null;
        store.initError = null;
    },
    
    setInitializing(isInitializing: boolean) {
        store.isInitializing = isInitializing;
    },
    
    setInitError(error: string | null) {
        store.initError = error;
    },
    
    // Message actions
    addMessage(message: Omit<MessageRegistryMessage, 'id' | 'timestamp'>) {
        const id = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const newMessage: MessageRegistryMessage = {
            ...message,
            id,
            timestamp: new Date(),
        };
        
        store.messages.push(newMessage);
        store.messageCount = store.messages.length;
    },
    
    updateMessage(id: string, updates: Partial<MessageRegistryMessage>) {
        const index = store.messages.findIndex(msg => msg.id === id);
        if (index !== -1) {
            Object.assign(store.messages[index], updates);
        }
    },
    
    clearMessages() {
        store.messages = [];
        store.messageCount = 0;
    },
    
    setMessages(messages: MessageRegistryMessage[]) {
        store.messages = messages;
        store.messageCount = messages.length;
    },
    
    startStreaming(messageId: string) {
        const message = store.messages.find(msg => msg.id === messageId);
        if (message) {
            if (!message.metadata) message.metadata = {};
            message.metadata.isStreaming = true;
        }
    },
    
    appendToMessage(messageId: string, content: string) {
        const message = store.messages.find(msg => msg.id === messageId);
        if (message) {
            message.content += content;
        }
    },
    
    finishStreaming(messageId: string, metadata?: MessageRegistryMessage['metadata']) {
        const message = store.messages.find(msg => msg.id === messageId);
        if (message) {
            if (!message.metadata) message.metadata = {};
            Object.assign(message.metadata, metadata);
            message.metadata.isStreaming = false;
        }
    },
    
    addToolCalls(messageId: string, toolCalls: GrokToolCall[]) {
        const message = store.messages.find(msg => msg.id === messageId);
        if (message) {
            message.toolCalls = toolCalls;
        }
    },
    
    // Execution actions
    addExecution(execution: Omit<ToolExecution, 'id' | 'startTime' | 'status'>): string {
        const id = `exec-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const newExecution: ToolExecution = {
            ...execution,
            id,
            status: 'executing',
            startTime: new Date(),
        };
        
        store.executions.set(id, newExecution);
        store.activeExecutions.push(id);
        
        return id;
    },
    
    updateExecution(id: string, updates: Partial<ToolExecution>) {
        const execution = store.executions.get(id);
        if (execution) {
            Object.assign(execution, updates);
            store.executions.set(id, execution);
        }
    },
    
    completeExecution(id: string, result: ToolExecution['result']) {
        const execution = store.executions.get(id);
        if (execution) {
            execution.status = 'completed';
            execution.result = result;
            execution.endTime = new Date();
            store.executions.set(id, execution);
            store.activeExecutions = store.activeExecutions.filter(execId => execId !== id);
        }
    },
    
    failExecution(id: string, error: string) {
        const execution = store.executions.get(id);
        if (execution) {
            execution.status = 'failed';
            execution.result = {
                success: false,
                error
            };
            execution.endTime = new Date();
            store.executions.set(id, execution);
            store.activeExecutions = store.activeExecutions.filter(execId => execId !== id);
        }
    },
    
    getExecution(id: string): ToolExecution | undefined {
        return store.executions.get(id);
    },
    
    clearExecutions() {
        store.executions = new Map();
        store.activeExecutions = [];
    },
    
    // UI actions
    setProcessing(isProcessing: boolean) {
        store.isProcessing = isProcessing;
    },
    
    setStreaming(isStreaming: boolean) {
        store.isStreaming = isStreaming;
    },
    
    updateTokenCount(count: number) {
        store.tokenCount = count;
    },
    
    updateProcessingTime(time: number) {
        store.processingTime = time;
    },
    
    setInputValue(value: string) {
        store.inputValue = value;
    },
    
    getInputValue(): string {
        return store.inputValue;
    },
    
    setCursorPosition(position: number) {
        store.cursorPosition = position;
    },
    
    addToHistory(input: string) {
        if (!input.trim()) return;
        
        // Remove duplicate if it exists
        const filtered = store.inputHistory.filter(item => item !== input);
        // Add to the end
        const newHistory = [...filtered, input];
        // Limit history size
        store.inputHistory = newHistory.length > 100 
            ? newHistory.slice(-100) 
            : newHistory;
        store.historyIndex = -1;
    },
    
    navigateHistory(direction: 'up' | 'down') {
        if (direction === 'up') {
            const newIndex = store.historyIndex === -1
                ? store.inputHistory.length - 1
                : Math.max(0, store.historyIndex - 1);
            
            if (newIndex >= 0 && newIndex < store.inputHistory.length) {
                store.historyIndex = newIndex;
                store.inputValue = store.inputHistory[newIndex];
                store.cursorPosition = store.inputHistory[newIndex].length;
            }
        } else { // down
            if (store.historyIndex === -1) return;
            
            const newIndex = store.historyIndex + 1;
            
            if (newIndex >= store.inputHistory.length) {
                store.historyIndex = -1;
                store.inputValue = '';
                store.cursorPosition = 0;
            } else {
                store.historyIndex = newIndex;
                store.inputValue = store.inputHistory[newIndex];
                store.cursorPosition = store.inputHistory[newIndex].length;
            }
        }
    },
    
    toggleHelp() {
        store.showHelp = !store.showHelp;
    },
    
    toggleModelSelector() {
        store.showModelSelector = !store.showModelSelector;
    },
    
    setExitConfirmation(show: boolean) {
        store.exitConfirmation = show;
    },
    
    // Settings actions
    setAutoEdit(enabled: boolean) {
        store.autoEditEnabled = enabled;
        actions.saveSettings();
    },
    
    setVSCodeOpen(enabled: boolean) {
        store.vsCodeOpenEnabled = enabled;
        actions.saveSettings();
    },
    
    updateConfirmationSettings(settings: Partial<AppState['confirmationSettings']>) {
        Object.assign(store.confirmationSettings, settings);
        actions.saveSettings();
    },
    
    setTheme(theme: AppState['theme']) {
        store.theme = theme;
        actions.saveSettings();
    },
    
    setModel(model: string) {
        store.model = model;
        actions.saveSettings();
    },
    
    // Command form actions
    setShowCommandForm(show: boolean) {
        store.showCommandForm = show;
    },
    
    // UI actions
    setShowHelp(show: boolean) {
        store.showHelp = show;
    },
    
    async loadSettings() {
        try {
            // This would typically load from a file or localStorage
            // For now, just use defaults
            const savedSettings = {};
            Object.assign(store, savedSettings);
        } catch (error) {
            debug.error('Failed to load settings:', error);
        }
    },
    
    async saveSettings() {
        try {
            const settingsToSave = {
                autoEditEnabled: store.autoEditEnabled,
                vsCodeOpenEnabled: store.vsCodeOpenEnabled,
                confirmationSettings: store.confirmationSettings,
                theme: store.theme,
                model: store.model,
            };
            
            // debug.log('Saving settings:', settingsToSave);
        } catch (error) {
            debug.error('Failed to save settings:', error);
        }
    },
    
    // Confirmation actions
    requestConfirmation(options: ConfirmationOptions): Promise<ConfirmationResult> {
        return new Promise<ConfirmationResult>((resolve) => {
            store.confirmationOptions = options;
            store.confirmationResolver = resolve;
        });
    },
    
    respondToConfirmation(result: ConfirmationResult) {
        if (store.confirmationResolver) {
            store.confirmationResolver(result);
            store.confirmationOptions = null;
            store.confirmationResolver = null;
        }
    },
    
    cancelConfirmation() {
        if (store.confirmationResolver) {
            store.confirmationResolver({ confirmed: false });
            store.confirmationOptions = null;
            store.confirmationResolver = null;
        }
    },
    
    // File tracker actions
    updateFile(filePath: string, content: string) {
        const hash = crypto.createHash('sha256').update(content).digest('hex');
        const lineCount = content.split('\n').length;
        
        store.trackedFiles.set(filePath, {
            hash,
            lastRead: new Date(),
            lineCount
        });
    },
    
    hasFile(filePath: string): boolean {
        return store.trackedFiles.has(filePath);
    },
    
    getFileInfo(filePath: string): FileInfo | undefined {
        return store.trackedFiles.get(filePath);
    },
    
    verifyFileHash(filePath: string, content: string): boolean {
        const fileInfo = store.trackedFiles.get(filePath);
        if (!fileInfo) return false;
        
        const currentHash = crypto.createHash('sha256').update(content).digest('hex');
        return fileInfo.hash === currentHash;
    },
    
    clearFile(filePath: string) {
        store.trackedFiles.delete(filePath);
    },
    
    clearAllFiles() {
        store.trackedFiles.clear();
    },
    
    // Stage management actions
    getCurrentStage(): Stage {
        return store.stageStack[store.stageStack.length - 1];
    },
    
    pushStage(stage: Stage) {
        store.stageStack.push(stage);
    },
    
    popStage() {
        if (store.stageStack.length > 1) {
            store.stageStack.pop();
        }
    },
    
    replaceStage(stage: Stage) {
        if (store.stageStack.length > 0) {
            store.stageStack[store.stageStack.length - 1] = stage;
        }
    },
    
    clearStages() {
        store.stageStack = [{ id: 'main', type: StageType.CHAT }];
    },
    
    getStageStack(): Stage[] {
        return store.stageStack;
    },
};

// Export file tracker actions separately for convenience
export const fileTrackerActions = {
    updateFile: actions.updateFile,
    hasFile: actions.hasFile,
    getFileInfo: actions.getFileInfo,
    verifyFileHash: actions.verifyFileHash,
    clearFile: actions.clearFile,
    clearAllFiles: actions.clearAllFiles,
};