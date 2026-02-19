import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '@automaker/utils';

const logger = createLogger('AIMemoryService');

export interface MemoryEntry {
    id: string;
    timestamp: string;
    category: string;
    content: string;
    importance: 'low' | 'medium' | 'high';
    tags: string[];
}

export interface ProjectKnowledge {
    projectStructure: string;
    keyFiles: string[];
    recentActions: string[];
    userPreferences: Record<string, string>;
}

/**
 * AIMemoryService - Hafıza ve öğrenme sistemi
 * AI asistanının öğrendiği bilgileri saklar ve geri çağırır
 */
export class AIMemoryService {
    private memoryDir: string;
    private memories: MemoryEntry[] = [];
    private projectKnowledge: ProjectKnowledge;
    private initialized: boolean = false;

    constructor(dataDir: string) {
        this.memoryDir = path.join(dataDir, 'ai-memory');
        this.projectKnowledge = {
            projectStructure: '',
            keyFiles: [],
            recentActions: [],
            userPreferences: {}
        };
    }

    async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            // Hafıza dizinini oluştur
            await fs.mkdir(this.memoryDir, { recursive: true });

            // Mevcut hafızayı yükle
            await this.loadMemories();
            await this.loadProjectKnowledge();

            this.initialized = true;
            logger.info('AIMemoryService initialized with', this.memories.length, 'memories');
        } catch (error) {
            logger.error('Failed to initialize AIMemoryService:', error);
        }
    }

    private async loadMemories(): Promise<void> {
        try {
            const memoriesPath = path.join(this.memoryDir, 'memories.json');
            const data = await fs.readFile(memoriesPath, 'utf-8');
            this.memories = JSON.parse(data);
        } catch (error) {
            // Dosya yoksa boş başla
            this.memories = [];
        }
    }

    private async loadProjectKnowledge(): Promise<void> {
        try {
            const knowledgePath = path.join(this.memoryDir, 'project-knowledge.json');
            const data = await fs.readFile(knowledgePath, 'utf-8');
            this.projectKnowledge = JSON.parse(data);
        } catch (error) {
            // Dosya yoksa varsayılan kullan
        }
    }

    async saveMemories(): Promise<void> {
        try {
            const memoriesPath = path.join(this.memoryDir, 'memories.json');
            await fs.writeFile(memoriesPath, JSON.stringify(this.memories, null, 2), 'utf-8');
        } catch (error) {
            logger.error('Failed to save memories:', error);
        }
    }

    async saveProjectKnowledge(): Promise<void> {
        try {
            const knowledgePath = path.join(this.memoryDir, 'project-knowledge.json');
            await fs.writeFile(knowledgePath, JSON.stringify(this.projectKnowledge, null, 2), 'utf-8');
        } catch (error) {
            logger.error('Failed to save project knowledge:', error);
        }
    }

    /**
     * Yeni bir hafıza ekle
     */
    async addMemory(category: string, content: string, importance: 'low' | 'medium' | 'high' = 'medium', tags: string[] = []): Promise<MemoryEntry> {
        const memory: MemoryEntry = {
            id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            category,
            content,
            importance,
            tags
        };

        this.memories.push(memory);
        await this.saveMemories();

        logger.info('Added memory:', memory.id, category);
        return memory;
    }

    /**
     * Hafızaları ara ve getir
     */
    async searchMemories(query: string, category?: string, limit: number = 10): Promise<MemoryEntry[]> {
        const queryLower = query.toLowerCase();

        return this.memories
            .filter(m => {
                if (category && m.category !== category) return false;
                return m.content.toLowerCase().includes(queryLower) ||
                    m.tags.some(t => t.toLowerCase().includes(queryLower));
            })
            .sort((a, b) => {
                // Önem ve zaman sırası
                const importanceOrder = { high: 3, medium: 2, low: 1 };
                if (importanceOrder[a.importance] !== importanceOrder[b.importance]) {
                    return importanceOrder[b.importance] - importanceOrder[a.importance];
                }
                return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
            })
            .slice(0, limit);
    }

    /**
     * Son hafızaları getir
     */
    async getRecentMemories(limit: number = 10): Promise<MemoryEntry[]> {
        return this.memories
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, limit);
    }

    /**
     * Kullanıcı tercihini kaydet
     */
    async setUserPreference(key: string, value: string): Promise<void> {
        this.projectKnowledge.userPreferences[key] = value;
        await this.saveProjectKnowledge();
    }

    /**
     * Kullanıcı tercihini getir
     */
    getUserPreference(key: string): string | undefined {
        return this.projectKnowledge.userPreferences[key];
    }

    /**
     * Son yapılan işlemi kaydet
     */
    async recordAction(action: string): Promise<void> {
        this.projectKnowledge.recentActions.unshift(action);
        // Son 50 işlemi tut
        if (this.projectKnowledge.recentActions.length > 50) {
            this.projectKnowledge.recentActions = this.projectKnowledge.recentActions.slice(0, 50);
        }
        await this.saveProjectKnowledge();
    }

    /**
     * Proje yapısını güncelle
     */
    async updateProjectStructure(structure: string): Promise<void> {
        this.projectKnowledge.projectStructure = structure;
        await this.saveProjectKnowledge();
    }

    /**
     * Önemli dosyaları ekle
     */
    async addKeyFile(filePath: string): Promise<void> {
        if (!this.projectKnowledge.keyFiles.includes(filePath)) {
            this.projectKnowledge.keyFiles.push(filePath);
            await this.saveProjectKnowledge();
        }
    }

    /**
     * Proje bilgisini getir (sistem prompt'u için)
     */
    getProjectKnowledgeSummary(): string {
        const recentActions = this.projectKnowledge.recentActions.slice(0, 5).join('\n- ');
        const keyFiles = this.projectKnowledge.keyFiles.slice(0, 10).join('\n- ');
        const preferences = Object.entries(this.projectKnowledge.userPreferences)
            .map(([k, v]) => `${k}: ${v}`)
            .join('\n- ');

        return `
## Proje Bilgisi

### Son İşlemler
${recentActions ? `- ${recentActions}` : 'Henüz işlem yok'}

### Önemli Dosyalar
${keyFiles ? `- ${keyFiles}` : 'Henüz belirlenmedi'}

### Kullanıcı Tercihleri
${preferences ? `- ${preferences}` : 'Henüz belirlenmedi'}
`.trim();
    }

    /**
     * Tüm hafızayı temizle
     */
    async clearAllMemories(): Promise<void> {
        this.memories = [];
        await this.saveMemories();
        logger.info('All memories cleared');
    }
}
