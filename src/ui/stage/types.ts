export interface Stage {
    id: string;
    type: StageType;
    props?: any;
}

export enum StageType {
    CHAT = 'chat',
    COMMAND_PALETTE = 'command_palette',
    SETTINGS = 'settings',
    HELP = 'help',
    MODAL = 'modal'
}

export interface StageManager {
    getCurrentStage(): Stage;
    pushStage(stage: Stage): void;
    popStage(): void;
    replaceStage(stage: Stage): void;
    clearStages(): void;
    getStageStack(): Stage[];
}

export interface ModalOptions {
    title: string;
    message?: string;
    options: ModalOption[];
}

export interface ModalOption {
    label: string;
    value: string;
    variant?: 'primary' | 'secondary' | 'danger';
}

export interface ModalResult {
    selected: string;
    cancelled: boolean;
}