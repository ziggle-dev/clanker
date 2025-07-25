/**
 * Repository manager for handling multiple tool registries
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { debug } from '../utils/debug-logger';

interface Repository {
    url: string;
    name: string;
    description?: string;
    enabled: boolean;
    addedAt: string;
}

interface RepositorySettings {
    repositories: Repository[];
    defaultRepository: string;
}

const DEFAULT_REPOSITORY: Repository = {
    url: 'https://github.com/ziggle-dev/clanker-tools',
    name: 'Official Clanker Tools',
    description: 'The official Clanker tool registry',
    enabled: true,
    addedAt: new Date().toISOString()
};

export class RepositoryManager {
    private settingsPath: string;
    private settings: RepositorySettings;
    
    constructor() {
        this.settingsPath = path.join(os.homedir(), '.clanker', 'settings.json');
    }
    
    private async loadSettings(): Promise<void> {
        try {
            const content = await fs.readFile(this.settingsPath, 'utf8');
            const allSettings = JSON.parse(content);
            
            // Initialize repositories if not present
            if (!allSettings.repositories) {
                allSettings.repositories = [DEFAULT_REPOSITORY];
                allSettings.defaultRepository = DEFAULT_REPOSITORY.url;
                await this.saveSettings(allSettings);
            }
            
            this.settings = {
                repositories: allSettings.repositories,
                defaultRepository: allSettings.defaultRepository || DEFAULT_REPOSITORY.url
            };
            
        } catch (error) {
            // Settings file doesn't exist, create with defaults
            debug.log('[RepositoryManager] Creating default settings');
            this.settings = {
                repositories: [DEFAULT_REPOSITORY],
                defaultRepository: DEFAULT_REPOSITORY.url
            };
            
            await this.ensureSettingsDir();
            await this.saveSettings({
                repositories: this.settings.repositories,
                defaultRepository: this.settings.defaultRepository
            });
        }
    }
    
    private async saveSettings(allSettings: any): Promise<void> {
        // Merge repository settings with existing settings
        const existingSettings = await this.loadExistingSettings();
        const mergedSettings = {
            ...existingSettings,
            repositories: allSettings.repositories || this.settings.repositories,
            defaultRepository: allSettings.defaultRepository || this.settings.defaultRepository
        };
        
        await fs.writeFile(this.settingsPath, JSON.stringify(mergedSettings, null, 2));
    }
    
    private async loadExistingSettings(): Promise<any> {
        try {
            const content = await fs.readFile(this.settingsPath, 'utf8');
            return JSON.parse(content);
        } catch {
            return {};
        }
    }
    
    private async ensureSettingsDir(): Promise<void> {
        const dir = path.dirname(this.settingsPath);
        await fs.mkdir(dir, { recursive: true });
    }
    
    async addRepository(repoUrl: string): Promise<void> {
        await this.loadSettings();
        
        // Normalize URL
        repoUrl = repoUrl.trim();
        if (!repoUrl.startsWith('http://') && !repoUrl.startsWith('https://')) {
            repoUrl = `https://github.com/${repoUrl}`;
        }
        
        // Check if already exists
        const existing = this.settings.repositories.find(r => r.url === repoUrl);
        if (existing) {
            console.log(`⚠️  Repository already exists: ${existing.name}`);
            return;
        }
        
        // Extract name from URL
        const urlParts = repoUrl.split('/');
        const repoName = urlParts[urlParts.length - 1] || 'Custom Repository';
        
        // Add new repository
        const newRepo: Repository = {
            url: repoUrl,
            name: repoName,
            description: `Custom repository: ${repoUrl}`,
            enabled: true,
            addedAt: new Date().toISOString()
        };
        
        this.settings.repositories.push(newRepo);
        
        const allSettings = await this.loadExistingSettings();
        allSettings.repositories = this.settings.repositories;
        allSettings.defaultRepository = this.settings.defaultRepository;
        
        await this.saveSettings(allSettings);
        
        console.log(`✅ Added repository: ${newRepo.name}`);
        console.log(`   URL: ${repoUrl}`);
        console.log(`\n💡 Note: Repository priority is determined by order in settings.json`);
        console.log(`   The official repository remains the highest priority by default.`);
    }
    
    async removeRepository(repoUrl: string): Promise<void> {
        await this.loadSettings();
        
        // Normalize URL
        repoUrl = repoUrl.trim();
        if (!repoUrl.startsWith('http://') && !repoUrl.startsWith('https://')) {
            repoUrl = `https://github.com/${repoUrl}`;
        }
        
        // Prevent removing default repository
        if (repoUrl === DEFAULT_REPOSITORY.url) {
            console.error('❌ Cannot remove the official Clanker repository');
            return;
        }
        
        // Find and remove
        const index = this.settings.repositories.findIndex(r => r.url === repoUrl);
        if (index === -1) {
            console.error('❌ Repository not found:', repoUrl);
            return;
        }
        
        const removed = this.settings.repositories.splice(index, 1)[0];
        
        const allSettings = await this.loadExistingSettings();
        allSettings.repositories = this.settings.repositories;
        
        await this.saveSettings(allSettings);
        
        console.log(`✅ Removed repository: ${removed.name}`);
    }
    
    async listRepositories(): Promise<void> {
        await this.loadSettings();
        
        console.log('📦 Configured Repositories:\n');
        
        this.settings.repositories.forEach((repo, index) => {
            const isDefault = repo.url === this.settings.defaultRepository;
            const priority = index + 1;
            
            console.log(`${priority}. ${repo.name}${isDefault ? ' (default)' : ''}`);
            console.log(`   URL: ${repo.url}`);
            if (repo.description) {
                console.log(`   Description: ${repo.description}`);
            }
            console.log(`   Status: ${repo.enabled ? '✅ Enabled' : '❌ Disabled'}`);
            console.log(`   Added: ${new Date(repo.addedAt).toLocaleDateString()}`);
            console.log();
        });
        
        console.log('💡 Tip: Repository search priority follows the order shown above.');
        console.log('   Edit ~/.clanker/settings.json to change the priority order.');
    }
    
    async getRepositories(): Promise<Repository[]> {
        await this.loadSettings();
        return this.settings.repositories.filter(r => r.enabled);
    }
    
    async getDefaultRepository(): Promise<string> {
        await this.loadSettings();
        return this.settings.defaultRepository;
    }
}