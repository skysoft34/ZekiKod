import { WebSocket } from 'ws';
import { createLogger } from '@automaker/utils';
import { EventEmitter } from 'events';
import { AgentService } from './agent-service.js';
import { BrowserService } from './browser-service.js';
import { AIMemoryService } from './ai-memory-service.js';
import fs from 'fs/promises';
import path from 'path';

const logger = createLogger('GeminiLiveService');

// ZekiKod projesi hakkında sistem talimatı
const ZEKIKOD_SYSTEM_INSTRUCTION = `Sen ZekiKod'un AI Geliştiricisisin. Adın "Elsa".

## SENİN ROLÜN
Sen ZekiKod uygulamasının BAKIMCISI ve GELİŞTİRİCİSİSİN. Kullanıcının projeleriyle DEĞİL,
ZekiKod'un kendisiyle ilgileniyorsun. Kullanıcı projeleri için ZekiKod'un kendi agent'ları var.

## TEMEL GÖREVLERİN
1. **ZekiKod Hatalarını Düzelt**: Konsolda gördüğün hataları analiz et ve ZekiKod kodunda düzelt
2. **Sunucu Yönetimi**: Sunucuların durumunu kontrol et, gerekirse yeniden başlat
3. **CLI Bağlantı Hataları**: WebSocket, API bağlantı sorunlarını tespit et ve çöz
4. **Yeni Özellikler Ekle**: İstenen özellikleri ZekiKod'a ekle - AMA SİSTEMİ BOZMA
5. **Performans İzleme**: Sistem performansını takip et, sorunları önle

## ZEKIKOD MİMARİSİ

### Dizin Yapısı
\`\`\`
automaker/
├── apps/
│   ├── ui/                 # React frontend (Vite, port 3007)
│   │   ├── src/components/ # UI bileşenleri
│   │   ├── src/store/      # Zustand state yönetimi
│   │   └── src/lib/        # Yardımcı fonksiyonlar
│   └── server/             # Node.js backend (Express, port 7008)
│       ├── src/services/   # Servisler (agent, gemini-live, vb.)
│       ├── src/routes/     # API rotaları
│       └── src/index.ts    # Giriş noktası
├── packages/               # Paylaşılan paketler
│   ├── types/              # TypeScript tipleri
│   ├── utils/              # Ortak yardımcılar
│   └── prompts/            # AI prompt şablonları
└── dev.mjs                 # Geliştirme sunucusu başlatıcı
\`\`\`

### Kritik Dosyalar (Dikkatli Ol!)
- \`apps/server/src/index.ts\`: Sunucu başlangıcı - BOZARSAN SUNUCU AÇILMAZ
- \`apps/ui/src/store/app-store.ts\`: Ana state - DEĞİŞİKLİKLER DİKKATLİ YAPILMALI
- \`apps/server/src/services/agent-service.ts\`: AI Agent mantığı
- \`apps/server/src/services/gemini-live-service.ts\`: SEN (Elsa) burada çalışıyorsun

### Sık Karşılaşılan Hatalar ve Çözümleri
1. **ERR_CONNECTION_REFUSED**: Sunucu kapalı → Yeniden başlat
2. **WebSocket Error**: API key eksik veya geçersiz → .env kontrol et
3. **Session polling aşırı istek**: session-manager.tsx'de interval artır
4. **Build hatası**: packages/ önce derlenmeli → npm run build

## KURALLARIN
1. **Önce OKU, sonra DEĞİŞTİR**: Dosyayı değiştirmeden önce mutlaka oku
2. **Küçük adımlar**: Büyük değişiklikler yerine küçük, test edilebilir değişiklikler yap
3. **Yedek al**: Kritik dosyaları değiştirmeden önce içeriği hatırla
4. **Hata yakalama**: Her düzeltmeden sonra sonucu kontrol et
5. **Kullanıcıyı bilgilendir**: Ne yaptığını ve neden yaptığını açıkla

## İLETİŞİM
- Türkçe konuş
- Teknik terimleri Türkçe açıkla
- Sorun tespit ettiğinde önce analiz, sonra çözüm öner
- Değişiklik yapmadan önce onay al (kritik dosyalar için)
- Hafızanı kullan - öğrendiklerini kaydet`;

export class GeminiLiveService extends EventEmitter {
    private ws: WebSocket | null = null;
    private clientSocket: WebSocket | null = null; // Client'a mesaj göndermek için
    private readonly baseUrl = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';
    private agentService: AgentService;
    private browserService: BrowserService;
    private memoryService: AIMemoryService;
    private dataDir: string;
    private currentProjectPath: string | null = null;
    private pendingUICommands: Map<string, { resolve: (value: any) => void; reject: (error: any) => void }> = new Map();

    constructor(agentService: AgentService, dataDir: string) {
        super();
        this.agentService = agentService;
        this.dataDir = dataDir;
        this.browserService = new BrowserService();
        this.memoryService = new AIMemoryService(dataDir);
    }

    public async connect(socketToClient: WebSocket, apiKey: string, projectPath?: string) {
        if (!apiKey) {
            socketToClient.close(1008, 'API Key missing');
            return;
        }

        // Hafıza servisini başlat
        await this.memoryService.initialize();
        this.currentProjectPath = projectPath || process.cwd();
        this.clientSocket = socketToClient; // Client referansını sakla

        const url = `${this.baseUrl}?key=${apiKey}`;
        this.ws = new WebSocket(url);

        this.ws.on('open', async () => {
            logger.info('Connected to Gemini Live API');

            // Proje bilgisini al
            const projectKnowledge = this.memoryService.getProjectKnowledgeSummary();
            const recentMemories = await this.memoryService.getRecentMemories(5);
            const memoryContext = recentMemories.length > 0
                ? `\n\n## Son Hafızalar\n${recentMemories.map(m => `- [${m.category}] ${m.content}`).join('\n')}`
                : '';

            const fullSystemInstruction = ZEKIKOD_SYSTEM_INSTRUCTION + projectKnowledge + memoryContext;

            // Setup mesajı - Live API için doğru format
            const setupMessage = {
                setup: {
                    model: 'models/gemini-2.5-flash-native-audio-preview-12-2025',
                    generationConfig: {
                        responseModalities: ["AUDIO"]
                    },
                    systemInstruction: {
                        parts: [{ text: fullSystemInstruction }]
                    },
                    tools: [
                        {
                            functionDeclarations: [
                                // === Dosya İşlemleri ===
                                {
                                    name: 'listFiles',
                                    description: 'Bir dizindeki dosyaları listele. Proje yapısını keşfetmek için kullan.',
                                    parameters: {
                                        type: 'OBJECT',
                                        properties: {
                                            path: { type: 'STRING', description: 'Göreceli yol (örn: "apps/ui/src")' }
                                        },
                                        required: ['path']
                                    }
                                },
                                {
                                    name: 'readFile',
                                    description: 'Bir dosyanın içeriğini oku.',
                                    parameters: {
                                        type: 'OBJECT',
                                        properties: {
                                            path: { type: 'STRING', description: 'Dosyanın göreceli yolu' }
                                        },
                                        required: ['path']
                                    }
                                },
                                {
                                    name: 'updateFile',
                                    description: 'Bir dosyayı oluştur veya güncelle.',
                                    parameters: {
                                        type: 'OBJECT',
                                        properties: {
                                            path: { type: 'STRING', description: 'Dosyanın göreceli yolu' },
                                            content: { type: 'STRING', description: 'Yeni içerik' }
                                        },
                                        required: ['path', 'content']
                                    }
                                },
                                {
                                    name: 'searchInFiles',
                                    description: 'Dosyalarda metin ara (grep benzeri).',
                                    parameters: {
                                        type: 'OBJECT',
                                        properties: {
                                            query: { type: 'STRING', description: 'Aranacak metin' },
                                            path: { type: 'STRING', description: 'Arama yapılacak dizin (varsayılan: proje kökü)' }
                                        },
                                        required: ['query']
                                    }
                                },

                                // === Komut Çalıştırma ===
                                {
                                    name: 'runCommand',
                                    description: 'Terminal komutu çalıştır (npm, git, vb.).',
                                    parameters: {
                                        type: 'OBJECT',
                                        properties: {
                                            command: { type: 'STRING', description: 'Çalıştırılacak komut' }
                                        },
                                        required: ['command']
                                    }
                                },

                                // === Tarayıcı İşlemleri ===
                                {
                                    name: 'openBrowser',
                                    description: 'Tarayıcıda bir URL aç (test için).',
                                    parameters: {
                                        type: 'OBJECT',
                                        properties: {
                                            url: { type: 'STRING', description: 'Açılacak URL' },
                                            headless: { type: 'BOOLEAN', description: 'Görünmez modda çalıştır' }
                                        },
                                        required: ['url']
                                    }
                                },
                                {
                                    name: 'getBrowserLogs',
                                    description: 'Aktif tarayıcı oturumundan konsol loglarını al.',
                                    parameters: {
                                        type: 'OBJECT',
                                        properties: {}
                                    }
                                },
                                {
                                    name: 'browserScreenshot',
                                    description: 'Mevcut sayfa ekran görüntüsü al.',
                                    parameters: {
                                        type: 'OBJECT',
                                        properties: {}
                                    }
                                },
                                {
                                    name: 'closeBrowser',
                                    description: 'Tarayıcı oturumunu kapat.',
                                    parameters: {
                                        type: 'OBJECT',
                                        properties: {}
                                    }
                                },

                                // === Hafıza İşlemleri ===
                                {
                                    name: 'remember',
                                    description: 'Önemli bir bilgiyi hafızana kaydet. Sonra hatırlayabilirsin.',
                                    parameters: {
                                        type: 'OBJECT',
                                        properties: {
                                            category: { type: 'STRING', description: 'Kategori (kullanıcı_tercihi, proje_bilgisi, öğrenilen, not)' },
                                            content: { type: 'STRING', description: 'Hatırlanacak bilgi' },
                                            importance: { type: 'STRING', description: 'Önem: low, medium, high' },
                                            tags: { type: 'STRING', description: 'Virgülle ayrılmış etiketler' }
                                        },
                                        required: ['category', 'content']
                                    }
                                },
                                {
                                    name: 'recall',
                                    description: 'Hafızandan bilgi ara ve hatırla.',
                                    parameters: {
                                        type: 'OBJECT',
                                        properties: {
                                            query: { type: 'STRING', description: 'Aranacak anahtar kelime' },
                                            category: { type: 'STRING', description: 'Belirli bir kategoride ara (opsiyonel)' }
                                        },
                                        required: ['query']
                                    }
                                },
                                {
                                    name: 'setPreference',
                                    description: 'Kullanıcı tercihini kaydet.',
                                    parameters: {
                                        type: 'OBJECT',
                                        properties: {
                                            key: { type: 'STRING', description: 'Tercih anahtarı' },
                                            value: { type: 'STRING', description: 'Tercih değeri' }
                                        },
                                        required: ['key', 'value']
                                    }
                                },

                                // === Proje Yönetimi ===
                                {
                                    name: 'getProjectInfo',
                                    description: 'Mevcut projenin genel bilgilerini al (package.json, yapı, vb.).',
                                    parameters: {
                                        type: 'OBJECT',
                                        properties: {}
                                    }
                                },
                                {
                                    name: 'getGitStatus',
                                    description: 'Git durumunu kontrol et (branch, değişiklikler).',
                                    parameters: {
                                        type: 'OBJECT',
                                        properties: {}
                                    }
                                },
                                {
                                    name: 'listProjects',
                                    description: 'Mevcut projeleri listele.',
                                    parameters: {
                                        type: 'OBJECT',
                                        properties: {}
                                    }
                                },
                                {
                                    name: 'setActiveProject',
                                    description: 'Aktif projeyi değiştir.',
                                    parameters: {
                                        type: 'OBJECT',
                                        properties: {
                                            projectPath: { type: 'STRING', description: 'Projenin yolu' }
                                        },
                                        required: ['projectPath']
                                    }
                                },
                                {
                                    name: 'fixError',
                                    description: 'Belirtilen dosyadaki hatayı düzelt. Dosyayı okuyup, hatayı analiz edip, düzeltilmiş içeriği yaz.',
                                    parameters: {
                                        type: 'OBJECT',
                                        properties: {
                                            filePath: { type: 'STRING', description: 'Düzeltilecek dosyanın yolu' },
                                            errorDescription: { type: 'STRING', description: 'Hata açıklaması' },
                                            fixedContent: { type: 'STRING', description: 'Düzeltilmiş dosya içeriği' }
                                        },
                                        required: ['filePath', 'fixedContent']
                                    }
                                },
                                {
                                    name: 'createProject',
                                    description: 'Yeni bir proje oluştur. Verilen isimle yeni bir klasör ve temel proje yapısı oluşturur.',
                                    parameters: {
                                        type: 'OBJECT',
                                        properties: {
                                            projectName: { type: 'STRING', description: 'Proje adı (boşluksuz, küçük harf)' },
                                            description: { type: 'STRING', description: 'Proje açıklaması' }
                                        },
                                        required: ['projectName']
                                    }
                                },
                                {
                                    name: 'getAgentStatus',
                                    description: 'Çalışan agent oturumlarını, durumlarını ve hangi projede olduklarını listele.',
                                    parameters: {
                                        type: 'OBJECT',
                                        properties: {}
                                    }
                                },
                                {
                                    name: 'sendAgentMessage',
                                    description: 'Bir agent oturumuna mesaj gönder ve onu çalıştır.',
                                    parameters: {
                                        type: 'OBJECT',
                                        properties: {
                                            sessionId: { type: 'STRING', description: 'Oturum ID (getAgentStatus ile alınır)' },
                                            message: { type: 'STRING', description: 'Agent\'a gönderilecek talimat' }
                                        },
                                        required: ['sessionId', 'message']
                                    }
                                },

                                // === UI Etkileşimleri (Frontend'e gönderilir) ===
                                {
                                    name: 'clickElement',
                                    description: 'Sayfadaki bir butona veya elemente tıkla. Element text içeriği veya CSS selector ile belirtilir.',
                                    parameters: {
                                        type: 'OBJECT',
                                        properties: {
                                            selector: { type: 'STRING', description: 'CSS selector (örn: #myButton, .btn-primary)' },
                                            text: { type: 'STRING', description: 'Buton veya link metni (örn: "Kaydet", "Yeni Ekle")' }
                                        }
                                    }
                                },
                                {
                                    name: 'readTable',
                                    description: 'Sayfadaki bir tabloyu oku ve içeriğini getir.',
                                    parameters: {
                                        type: 'OBJECT',
                                        properties: {
                                            selector: { type: 'STRING', description: 'Tablo CSS selector (örn: table, .data-table)' }
                                        }
                                    }
                                },
                                {
                                    name: 'fillInput',
                                    description: 'Sayfadaki bir input alanını doldur.',
                                    parameters: {
                                        type: 'OBJECT',
                                        properties: {
                                            selector: { type: 'STRING', description: 'Input CSS selector veya placeholder metni' },
                                            value: { type: 'STRING', description: 'Yazılacak değer' }
                                        },
                                        required: ['value']
                                    }
                                },
                                {
                                    name: 'getPageElements',
                                    description: 'Sayfadaki tıklanabilir elementleri (butonlar, linkler) listele.',
                                    parameters: {
                                        type: 'OBJECT',
                                        properties: {}
                                    }
                                },
                                {
                                    name: 'navigateToPage',
                                    description: 'Uygulamada belirli bir sayfaya git.',
                                    parameters: {
                                        type: 'OBJECT',
                                        properties: {
                                            page: { type: 'STRING', description: 'Sayfa adı: kanban, agent-runner, terminal, ideation, settings, graph-view' }
                                        },
                                        required: ['page']
                                    }
                                },
                                {
                                    name: 'addNewCapability',
                                    description: 'Sisteme yeni bir yetenek/araç ekle. Bu, gemini-live-service dosyasına yeni tool tanımı ekler.',
                                    parameters: {
                                        type: 'OBJECT',
                                        properties: {
                                            name: { type: 'STRING', description: 'Yeni aracın adı' },
                                            description: { type: 'STRING', description: 'Aracın ne yaptığının açıklaması' },
                                            parameters: { type: 'STRING', description: 'Parametreler JSON formatında' },
                                            implementation: { type: 'STRING', description: 'Aracın TypeScript implementasyonu' }
                                        },
                                        required: ['name', 'description', 'implementation']
                                    }
                                }
                            ]
                        }
                    ]
                }
            };

            this.ws?.send(JSON.stringify(setupMessage));
            logger.info('Setup message sent to Gemini Live API');
        });

        this.ws.on('message', async (data: Buffer) => {
            try {
                const response = JSON.parse(data.toString());

                // SetupComplete mesajını logla
                if (response.setupComplete) {
                    logger.info('Gemini Live API setup complete');
                }

                // Server content (audio/text) -> Client'a ilet
                if (response.serverContent) {
                    socketToClient.send(JSON.stringify(response));
                }

                // Tool calls -> Çalıştır ve sonucu geri gönder
                if (response.toolCall) {
                    logger.info('Received tool call:', response.toolCall);
                    const functionCalls = response.toolCall.functionCalls;

                    if (functionCalls && functionCalls.length > 0) {
                        const toolResponse = {
                            toolResponse: {
                                functionResponses: [] as any[]
                            }
                        };

                        for (const call of functionCalls) {
                            const result = await this.executeTool(call.name, call.args);
                            toolResponse.toolResponse.functionResponses.push({
                                id: call.id,
                                name: call.name,
                                response: { result: result }
                            });

                            // Yapılan işlemi hafızaya kaydet
                            await this.memoryService.recordAction(`${call.name}: ${JSON.stringify(call.args).substring(0, 100)}`);
                        }

                        this.ws?.send(JSON.stringify(toolResponse));
                    }
                }
            } catch (error) {
                logger.error('Error processing message from Gemini:', error);
            }
        });

        this.ws.on('error', (error) => {
            console.error('Gemini WS Error FULL:', error);
            logger.error('Gemini WS Error:', error);
            socketToClient.close(1011, 'Gemini connection error');
        });

        this.ws.on('close', (code, reason) => {
            console.error('Gemini WS Closed FULL:', code, reason.toString());
            logger.info('Gemini WS Closed', code, reason.toString());
            socketToClient.close(1000, 'Gemini connection closed');
        });

        // Client mesajlarını işle
        socketToClient.on('message', (message: string) => {
            try {
                const data = JSON.parse(message.toString());

                // UI command response'u mu kontrol et
                if (data.uiCommandResponse) {
                    const { commandId, result, error } = data.uiCommandResponse;
                    const pending = this.pendingUICommands.get(commandId);
                    if (pending) {
                        if (error) {
                            pending.reject(new Error(error));
                        } else {
                            pending.resolve(result);
                        }
                        this.pendingUICommands.delete(commandId);
                    }
                    return; // Gemini'ye iletme
                }

                // Normal mesajları Gemini'ye ilet
                if (this.ws?.readyState === WebSocket.OPEN) {
                    this.ws.send(message);
                }
            } catch {
                // Parse edilemezse direkt ilet
                if (this.ws?.readyState === WebSocket.OPEN) {
                    this.ws.send(message);
                }
            }
        });

        socketToClient.on('close', () => {
            this.ws?.close();
            this.browserService.close();
        });
    }

    private async executeTool(name: string, args: any): Promise<any> {
        try {
            const workspaceRoot = this.currentProjectPath || process.cwd();

            switch (name) {
                // === Dosya İşlemleri ===
                case 'listFiles': {
                    const targetPath = path.resolve(workspaceRoot, args.path || '.');
                    const entries = await fs.readdir(targetPath, { withFileTypes: true });
                    const files = entries.map(e => ({
                        name: e.name,
                        isDirectory: e.isDirectory()
                    }));
                    return { files };
                }
                case 'readFile': {
                    const targetPath = path.resolve(workspaceRoot, args.path);
                    const content = await fs.readFile(targetPath, 'utf8');
                    // Önemli dosyayı kaydet
                    await this.memoryService.addKeyFile(args.path);
                    return { content };
                }
                case 'updateFile': {
                    const targetPath = path.resolve(workspaceRoot, args.path);
                    await fs.writeFile(targetPath, args.content, 'utf8');
                    return { success: true, message: `Dosya güncellendi: ${args.path}` };
                }
                case 'searchInFiles': {
                    const searchPath = path.resolve(workspaceRoot, args.path || '.');
                    const { exec } = await import('child_process');
                    const { promisify } = await import('util');
                    const execAsync = promisify(exec);
                    try {
                        const { stdout } = await execAsync(
                            `findstr /s /i /n "${args.query}" *.ts *.tsx *.js *.json`,
                            { cwd: searchPath, maxBuffer: 1024 * 1024 }
                        );
                        return { results: stdout.split('\n').slice(0, 20) };
                    } catch (e) {
                        return { results: [], message: 'Sonuç bulunamadı' };
                    }
                }

                // === Komut Çalıştırma ===
                case 'runCommand': {
                    const { exec } = await import('child_process');
                    const { promisify } = await import('util');
                    const execAsync = promisify(exec);
                    const { stdout, stderr } = await execAsync(args.command, {
                        cwd: workspaceRoot,
                        timeout: 30000
                    });
                    return { stdout, stderr };
                }

                // === Tarayıcı İşlemleri ===
                case 'openBrowser': {
                    return await this.browserService.launch(args.url, args.headless);
                }
                case 'getBrowserLogs': {
                    return await this.browserService.getLogs();
                }
                case 'browserScreenshot': {
                    const screenshot = await this.browserService.getScreenshot();
                    return { screenshot_base64: screenshot };
                }
                case 'closeBrowser': {
                    await this.browserService.close();
                    return { success: true, message: 'Tarayıcı kapatıldı' };
                }

                // === Hafıza İşlemleri ===
                case 'remember': {
                    const tags = args.tags ? args.tags.split(',').map((t: string) => t.trim()) : [];
                    const memory = await this.memoryService.addMemory(
                        args.category,
                        args.content,
                        args.importance || 'medium',
                        tags
                    );
                    return { success: true, memoryId: memory.id, message: 'Hafızaya kaydedildi' };
                }
                case 'recall': {
                    const memories = await this.memoryService.searchMemories(
                        args.query,
                        args.category
                    );
                    return {
                        memories: memories.map(m => ({
                            category: m.category,
                            content: m.content,
                            timestamp: m.timestamp,
                            importance: m.importance
                        }))
                    };
                }
                case 'setPreference': {
                    await this.memoryService.setUserPreference(args.key, args.value);
                    return { success: true, message: `Tercih kaydedildi: ${args.key}` };
                }

                // === Proje Yönetimi ===
                case 'getProjectInfo': {
                    try {
                        const packageJsonPath = path.join(workspaceRoot, 'package.json');
                        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

                        const topLevelDirs = await fs.readdir(workspaceRoot);

                        return {
                            name: packageJson.name,
                            version: packageJson.version,
                            description: packageJson.description,
                            scripts: Object.keys(packageJson.scripts || {}),
                            directories: topLevelDirs.filter(d => !d.startsWith('.')),
                            workspaces: packageJson.workspaces
                        };
                    } catch (e) {
                        return { error: 'package.json okunamadı' };
                    }
                }
                case 'getGitStatus': {
                    const { exec } = await import('child_process');
                    const { promisify } = await import('util');
                    const execAsync = promisify(exec);
                    try {
                        const { stdout: branch } = await execAsync('git branch --show-current', { cwd: workspaceRoot });
                        const { stdout: status } = await execAsync('git status --porcelain', { cwd: workspaceRoot });
                        const { stdout: log } = await execAsync('git log --oneline -5', { cwd: workspaceRoot });
                        return {
                            branch: branch.trim(),
                            changedFiles: status.trim().split('\n').filter(l => l),
                            recentCommits: log.trim().split('\n')
                        };
                    } catch (e) {
                        return { error: 'Git bilgisi alınamadı' };
                    }
                }

                case 'listProjects': {
                    try {
                        // Data dizinindeki projeleri listele
                        const projectsDir = path.join(this.dataDir, 'projects');
                        try {
                            const projects = await fs.readdir(projectsDir);
                            const projectList = [];
                            for (const proj of projects) {
                                const projPath = path.join(projectsDir, proj);
                                const stat = await fs.stat(projPath);
                                if (stat.isDirectory()) {
                                    // feature.json dosyasını kontrol et
                                    try {
                                        const featurePath = path.join(projPath, 'feature.json');
                                        const featureData = JSON.parse(await fs.readFile(featurePath, 'utf8'));
                                        projectList.push({
                                            name: featureData.name || proj,
                                            path: projPath,
                                            status: featureData.status
                                        });
                                    } catch {
                                        projectList.push({ name: proj, path: projPath });
                                    }
                                }
                            }
                            return { projects: projectList, currentProject: this.currentProjectPath };
                        } catch {
                            return { projects: [], currentProject: this.currentProjectPath, message: 'Proje dizini bulunamadı' };
                        }
                    } catch (e) {
                        return { error: 'Projeler listelenemedi' };
                    }
                }

                case 'setActiveProject': {
                    try {
                        const projectPath = args.projectPath;
                        // Yolun var olup olmadığını kontrol et
                        await fs.access(projectPath);
                        this.currentProjectPath = projectPath;

                        // Hafızaya kaydet
                        await this.memoryService.addMemory(
                            'proje_değişikliği',
                            `Aktif proje değiştirildi: ${projectPath}`,
                            'medium',
                            ['proje', 'aktif']
                        );

                        return {
                            success: true,
                            message: `Aktif proje değiştirildi: ${projectPath}`,
                            currentProject: projectPath
                        };
                    } catch (e) {
                        return { error: 'Proje yolu bulunamadı veya erişilemiyor' };
                    }
                }

                case 'fixError': {
                    try {
                        const filePath = path.resolve(workspaceRoot, args.filePath);

                        // Önce dosyayı oku
                        let originalContent = '';
                        try {
                            originalContent = await fs.readFile(filePath, 'utf8');
                        } catch {
                            // Dosya yoksa yeni oluşturulacak
                        }

                        // Düzeltilmiş içeriği yaz
                        await fs.writeFile(filePath, args.fixedContent, 'utf8');

                        // Hafızaya kaydet
                        await this.memoryService.addMemory(
                            'hata_düzeltme',
                            `${args.filePath} dosyasındaki hata düzeltildi. ${args.errorDescription || ''}`,
                            'high',
                            ['hata', 'düzeltme', args.filePath]
                        );

                        return {
                            success: true,
                            message: `Dosya düzeltildi: ${args.filePath}`,
                            originalLength: originalContent.length,
                            newLength: args.fixedContent.length
                        };
                    } catch (e: any) {
                        return { error: `Dosya düzeltilemedi: ${e.message}` };
                    }
                }

                case 'createProject': {
                    try {
                        const projectName = args.projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
                        const projectsDir = path.join(this.dataDir, 'projects');
                        const projectPath = path.join(projectsDir, projectName);

                        // Klasörü oluştur
                        await fs.mkdir(projectPath, { recursive: true });

                        // feature.json oluştur
                        const featureData = {
                            name: args.projectName,
                            description: args.description || '',
                            status: 'planned',
                            createdAt: new Date().toISOString(),
                            tasks: []
                        };
                        await fs.writeFile(path.join(projectPath, 'feature.json'), JSON.stringify(featureData, null, 2));

                        // Hafızaya kaydet
                        await this.memoryService.addMemory(
                            'proje_oluşturma',
                            `Yeni proje oluşturuldu: ${args.projectName}`,
                            'high',
                            ['proje', 'yeni']
                        );

                        return {
                            success: true,
                            message: `Proje oluşturuldu: ${projectName}`,
                            path: projectPath
                        };
                    } catch (e: any) {
                        return { error: `Proje oluşturulamadı: ${e.message}` };
                    }
                }

                case 'getAgentStatus': {
                    try {
                        const sessions = await this.agentService.listSessions();
                        const activeSessions = sessions.map(s => ({
                            id: s.id,
                            name: s.name,
                            isRunning: false,
                            projectPath: s.projectPath,
                            updatedAt: s.updatedAt
                        }));

                        // Detaylı bilgi al
                        const detailedSessions = [];
                        for (const s of activeSessions.slice(0, 5)) { // Son 5 session
                            const history = this.agentService.getHistory(s.id);

                            if (history && history.success) {
                                detailedSessions.push({
                                    ...s,
                                    isRunning: history.isRunning,
                                    lastMessage: history.messages && history.messages.length > 0
                                        ? history.messages[history.messages.length - 1].content.substring(0, 100)
                                        : ''
                                });
                            } else {
                                detailedSessions.push(s);
                            }
                        }

                        return {
                            sessions: detailedSessions,
                            count: sessions.length
                        };
                    } catch (e: any) {
                        return { error: `Agent durumu alınamadı: ${e.message}` };
                    }
                }

                case 'sendAgentMessage': {
                    try {
                        const { sessionId, message } = args;

                        // AgentService üzerinden mesaj gönder
                        await this.agentService.sendMessage({
                            sessionId,
                            message
                        });

                        return {
                            success: true,
                            message: `Mesaj agent'a gönderildi: ${message.substring(0, 50)}...`
                        };
                    } catch (e: any) {
                        return { error: `Mesaj gönderilemedi: ${e.message}` };
                    }
                }

                // === UI Etkileşimleri ===
                case 'clickElement': {
                    return await this.sendUICommand('clickElement', args);
                }
                case 'readTable': {
                    return await this.sendUICommand('readTable', args);
                }
                case 'fillInput': {
                    return await this.sendUICommand('fillInput', args);
                }
                case 'getPageElements': {
                    return await this.sendUICommand('getPageElements', args);
                }
                case 'navigateToPage': {
                    return await this.sendUICommand('navigateToPage', args);
                }
                case 'addNewCapability': {
                    try {
                        // Yeni yetenek eklemek için dosyayı oku ve güncelle
                        const serviceFilePath = path.join(process.cwd(), 'apps/server/src/services/gemini-live-service.ts');
                        const content = await fs.readFile(serviceFilePath, 'utf8');

                        // Tool tanımını ekle (functionDeclarations dizisine)
                        const toolDef = `
                                {
                                    name: '${args.name}',
                                    description: '${args.description}',
                                    parameters: ${args.parameters || '{ type: "OBJECT", properties: {} }'}
                                },`;

                        // Implementation'ı ekle (switch case'e)
                        const implCode = `
                case '${args.name}': {
                    ${args.implementation}
                }`;

                        // Hafızaya kaydet
                        await this.memoryService.addMemory(
                            'yeni_yetenek',
                            `Yeni yetenek eklendi: ${args.name} - ${args.description}`,
                            'high',
                            ['yetenek', 'araç', args.name]
                        );

                        return {
                            success: true,
                            message: `Yeni yetenek tanımı hazırlandı: ${args.name}. Sunucu yeniden başlatıldığında aktif olacak.`,
                            toolDefinition: toolDef,
                            implementation: implCode,
                            note: 'Bu yeteneği kalıcı olarak eklemek için dosyayı manuel düzenlemeniz gerekiyor.'
                        };
                    } catch (e: any) {
                        return { error: `Yetenek eklenemedi: ${e.message}` };
                    }
                }

                default:
                    return { error: `Bilinmeyen araç: ${name}` };
            }
        } catch (error: any) {
            logger.error(`Tool execution error (${name}):`, error);
            return { error: error.message };
        }
    }

    /**
     * UI komutu gönder ve cevap bekle
     */
    private async sendUICommand(command: string, args: any): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.clientSocket || this.clientSocket.readyState !== WebSocket.OPEN) {
                reject(new Error('Client bağlantısı yok'));
                return;
            }

            const commandId = `ui-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            // Timeout ayarla (10 saniye)
            const timeout = setTimeout(() => {
                this.pendingUICommands.delete(commandId);
                reject(new Error('UI komutu zaman aşımına uğradı'));
            }, 10000);

            // Promise'i kaydet
            this.pendingUICommands.set(commandId, {
                resolve: (result) => {
                    clearTimeout(timeout);
                    resolve(result);
                },
                reject: (error) => {
                    clearTimeout(timeout);
                    reject(error);
                }
            });

            // Komutu client'a gönder
            const message = {
                uiCommand: {
                    commandId,
                    command,
                    args
                }
            };

            this.clientSocket.send(JSON.stringify(message));
            logger.info(`UI command sent: ${command}`, args);
        });
    }
}
