import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Loader2, Pause, Play, AlertCircle, Sparkles, Camera, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Uyanma kelimesi ve komutlar
const WAKE_WORD = 'elsa';
const PAUSE_COMMANDS = ['elsa dur', 'elsa bekle', 'elsa sus'];
const RESUME_COMMANDS = ['elsa devam', 'elsa başla', 'elsa gel'];
const TOGGLE_COMMANDS = ['elsa tamam']; // Toggle - açıksa kapatır, kapalıysa açar

interface ConsoleError {
    message: string;
    source?: string;
    lineno?: number;
    colno?: number;
    timestamp: Date;
}

export function VoiceAssistant() {
    const [isActive, setIsActive] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isListeningForWakeWord, setIsListeningForWakeWord] = useState(false);
    const [consoleErrors, setConsoleErrors] = useState<ConsoleError[]>([]);
    const [showErrorBadge, setShowErrorBadge] = useState(false);
    const [statusText, setStatusText] = useState('');

    const wsRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const nextStartTimeRef = useRef(0);
    const recognitionRef = useRef<any>(null);

    // Konsol hatalarını dinle
    useEffect(() => {
        const originalConsoleError = console.error;
        const originalConsoleWarn = console.warn;

        const captureError = (type: 'error' | 'warn', ...args: any[]) => {
            const message = args.map(arg =>
                typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ');

            const error: ConsoleError = {
                message: message.substring(0, 500),
                timestamp: new Date()
            };

            setConsoleErrors(prev => [...prev.slice(-19), error]);
            setShowErrorBadge(true);
        };

        console.error = (...args) => {
            captureError('error', ...args);
            originalConsoleError.apply(console, args);
        };

        // Global hata yakalayıcı
        const handleGlobalError = (event: ErrorEvent) => {
            const error: ConsoleError = {
                message: event.message,
                source: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                timestamp: new Date()
            };
            setConsoleErrors(prev => [...prev.slice(-19), error]);
            setShowErrorBadge(true);
        };

        window.addEventListener('error', handleGlobalError);

        return () => {
            console.error = originalConsoleError;
            window.removeEventListener('error', handleGlobalError);
        };
    }, []);

    // Web Speech API ile uyanma kelimesi dinleme
    const startWakeWordDetection = useCallback(() => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            toast.error('Tarayıcınız ses tanımayı desteklemiyor');
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'tr-TR';

        recognition.onresult = (event: any) => {
            const lastResult = event.results[event.results.length - 1];
            const transcript = lastResult[0].transcript.toLowerCase().trim();

            console.log('Tanınan:', transcript);

            // Toggle komutları - "elsa tamam" ile açıp kapatabilir
            if (TOGGLE_COMMANDS.some(cmd => transcript.includes(cmd))) {
                if (isPaused) {
                    setIsPaused(false);
                    setStatusText('Elsa dinliyor...');
                    toast.success('Elsa tekrar aktif!');
                } else {
                    setIsPaused(true);
                    setStatusText('Beklemede... ("Elsa tamam" deyin devam etmek için)');
                    toast.info('Elsa beklemede.');
                }
                return;
            }

            // Duraklatma komutları
            if (PAUSE_COMMANDS.some(cmd => transcript.includes(cmd))) {
                setIsPaused(true);
                setStatusText('Beklemede... ("Elsa tamam" deyin devam etmek için)');
                toast.info('Elsa beklemede.');
                return;
            }

            // Devam komutları
            if (RESUME_COMMANDS.some(cmd => transcript.includes(cmd))) {
                setIsPaused(false);
                setStatusText('Elsa dinliyor...');
                toast.success('Elsa tekrar aktif!');
                return;
            }

            // Uyanma kelimesi algılandı (sadece bağlı değilse)
            if (transcript.includes(WAKE_WORD) && !isConnected && !isPaused) {
                setStatusText('Bağlanıyor...');
                toast.info(`"${WAKE_WORD}" algılandı! Bağlanıyor...`);
                connect();
            }
        };

        recognition.onerror = (event: any) => {
            console.error('Ses tanıma hatası:', event.error);
            if (event.error === 'not-allowed') {
                toast.error('Mikrofon erişimi reddedildi');
            }
        };

        recognition.onend = () => {
            // Sürekli dinleme için yeniden başlat - bağlı olsa bile komutları dinle
            if (isListeningForWakeWord) {
                setTimeout(() => {
                    try {
                        recognition.start();
                    } catch (e) {
                        // Zaten çalışıyor olabilir
                    }
                }, 100);
            }
        };

        recognitionRef.current = recognition;
        recognition.start();
        setIsListeningForWakeWord(true);
        setStatusText('Uyanma kelimesi bekleniyor...');
    }, [isConnected, isPaused, isListeningForWakeWord]);

    const stopWakeWordDetection = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        setIsListeningForWakeWord(false);
    }, []);

    const connect = () => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const url = `${protocol}//${host}/api/gemini-live/ws`;

        console.log('Connecting to Voice Assistant:', url);
        const ws = new WebSocket(url);

        ws.onopen = () => {
            console.log('Voice Assistant Connected');
            setIsConnected(true);
            setStatusText('Elsa dinliyor... ("Elsa bekle" deyin duraklatmak için)');
            toast.success('Elsa bağlandı! Konuşabilirsiniz.');
            startAudioCapture();

            // Bekleyen hataları gönder
            if (consoleErrors.length > 0) {
                sendErrorsToAssistant();
            }
        };

        ws.onmessage = async (event) => {
            try {
                const response = JSON.parse(event.data);

                // UI komutlarını işle
                if (response.uiCommand) {
                    const { commandId, command, args } = response.uiCommand;
                    let result: any = null;
                    let error: string | null = null;

                    try {
                        switch (command) {
                            case 'clickElement': {
                                // Selector veya text ile element bul ve tıkla
                                let element: HTMLElement | null = null;
                                if (args.selector) {
                                    element = document.querySelector(args.selector);
                                } else if (args.text) {
                                    // Text içeren butonu bul
                                    const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'));
                                    element = buttons.find(el =>
                                        el.textContent?.toLowerCase().includes(args.text.toLowerCase())
                                    ) as HTMLElement;
                                }
                                if (element) {
                                    element.click();
                                    result = { success: true, message: `Element tıklandı: ${args.selector || args.text}` };
                                } else {
                                    error = 'Element bulunamadı';
                                }
                                break;
                            }
                            case 'readTable': {
                                const tables = document.querySelectorAll(args.selector || 'table');
                                const tableData: any[] = [];
                                tables.forEach((table, index) => {
                                    const rows = Array.from(table.querySelectorAll('tr'));
                                    const data = rows.map(row =>
                                        Array.from(row.querySelectorAll('td, th')).map(cell => cell.textContent?.trim())
                                    );
                                    tableData.push({ tableIndex: index, rows: data });
                                });
                                result = { tables: tableData };
                                break;
                            }
                            case 'fillInput': {
                                let input: HTMLInputElement | HTMLTextAreaElement | null = null;
                                if (args.selector) {
                                    input = document.querySelector(args.selector);
                                } else {
                                    // Placeholder ile bul
                                    const inputs = Array.from(document.querySelectorAll('input, textarea'));
                                    input = inputs.find(el =>
                                        (el as HTMLInputElement).placeholder?.toLowerCase().includes(args.selector?.toLowerCase() || '')
                                    ) as HTMLInputElement;
                                }
                                if (input) {
                                    input.value = args.value;
                                    input.dispatchEvent(new Event('input', { bubbles: true }));
                                    result = { success: true, message: `Input dolduruldu` };
                                } else {
                                    error = 'Input bulunamadı';
                                }
                                break;
                            }
                            case 'getPageElements': {
                                const clickable = Array.from(document.querySelectorAll('button, a, [role="button"], input[type="submit"]'));
                                const elements = clickable.slice(0, 50).map((el, i) => ({
                                    index: i,
                                    tag: el.tagName.toLowerCase(),
                                    text: el.textContent?.trim().substring(0, 50),
                                    id: el.id,
                                    className: el.className
                                }));
                                result = { elements };
                                break;
                            }
                            case 'navigateToPage': {
                                const pageRoutes: Record<string, string> = {
                                    'kanban': '/kanban',
                                    'agent-runner': '/agent',
                                    'terminal': '/terminal',
                                    'ideation': '/ideation',
                                    'settings': '/settings',
                                    'graph-view': '/graph'
                                };
                                const route = pageRoutes[args.page];
                                if (route) {
                                    window.location.hash = route;
                                    result = { success: true, message: `Sayfa değiştirildi: ${args.page}` };
                                } else {
                                    error = `Bilinmeyen sayfa: ${args.page}`;
                                }
                                break;
                            }
                            default:
                                error = `Bilinmeyen UI komutu: ${command}`;
                        }
                    } catch (e: any) {
                        error = e.message;
                    }

                    // Sonucu geri gönder
                    ws.send(JSON.stringify({
                        uiCommandResponse: { commandId, result, error }
                    }));
                    return;
                }

                // Audio/text içeriği işle
                if (response.serverContent?.modelTurn?.parts) {
                    for (const part of response.serverContent.modelTurn.parts) {
                        if (part.inlineData && part.inlineData.mimeType.startsWith('audio/pcm')) {
                            playPcmData(part.inlineData.data);
                        }
                    }
                }
            } catch (error) {
                console.error('Error parsing message', error);
            }
        };

        ws.onclose = (e) => {
            console.log('Voice Assistant Disconnected', e.code, e.reason);
            setIsConnected(false);
            setIsActive(false);
            setStatusText('Bağlantı kesildi');
            stopAudioCapture();

            if (e.code === 1008) {
                toast.error('Bağlantı hatası: API Key eksik');
            } else {
                toast('Elsa bağlantısı kesildi');
            }

            // Uyanma kelimesi dinlemeye geri dön
            if (isListeningForWakeWord) {
                startWakeWordDetection();
            }
        };

        ws.onerror = (error) => {
            console.error('Voice Assistant Error', error);
            setIsConnected(false);
        };

        wsRef.current = ws;
    };

    const disconnect = () => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        stopAudioCapture();
        setIsConnected(false);
        setIsActive(false);
        setStatusText('');
    };

    const toggleVoice = () => {
        if (isActive) {
            disconnect();
            stopWakeWordDetection();
            setStatusText('');
        } else {
            setIsActive(true);
            startWakeWordDetection();
        }
    };

    // Hataları AI asistanına gönder
    const sendErrorsToAssistant = useCallback(() => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        if (consoleErrors.length === 0) return;

        const errorSummary = consoleErrors.slice(-5).map(e => e.message).join('\n');

        // Text mesajı olarak gönder
        const message = {
            clientContent: {
                turns: [{
                    role: 'user',
                    parts: [{
                        text: `Sayfada şu hatalar algılandı. Bunları analiz edip çözüm önerir misin?\n\n${errorSummary}`
                    }]
                }],
                turnComplete: true
            }
        };

        wsRef.current.send(JSON.stringify(message));
        setShowErrorBadge(false);
        toast.info('Hatalar Elsa\'ya gönderildi');
    }, [consoleErrors]);

    // Ekran görüntüsü al ve Elsa'ya gönder
    const captureAndSendScreen = useCallback(async () => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            toast.error('Önce Elsa\'yı aktifleştirin');
            return;
        }

        try {
            // html2canvas kullanarak ekran görüntüsü al
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(document.body, {
                scale: 0.5, // Boyutu küçült
                useCORS: true,
                allowTaint: true,
                logging: false
            });

            // Canvas'ı base64'e çevir
            const base64Image = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];

            // Gemini'ye görsel olarak gönder
            const message = {
                clientContent: {
                    turns: [{
                        role: 'user',
                        parts: [
                            {
                                text: 'Bu ekran görüntüsünü analiz et. Eğer hata görüyorsan açıkla ve çözüm öner.'
                            },
                            {
                                inlineData: {
                                    mimeType: 'image/jpeg',
                                    data: base64Image
                                }
                            }
                        ]
                    }],
                    turnComplete: true
                }
            };

            wsRef.current.send(JSON.stringify(message));
            toast.success('Ekran görüntüsü Elsa\'ya gönderildi');
        } catch (error) {
            console.error('Ekran görüntüsü hatası:', error);
            toast.error('Ekran görüntüsü alınamadı');
        }
    }, []);

    const startAudioCapture = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    autoGainControl: true,
                    noiseSuppression: true,
                }
            });
            mediaStreamRef.current = stream;

            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            audioContextRef.current = audioContext;

            const source = audioContext.createMediaStreamSource(stream);
            const processor = audioContext.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
                if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
                if (isPaused) return; // Duraklatılmışsa ses gönderme

                const inputData = e.inputBuffer.getChannelData(0);
                const pcmData = new Int16Array(inputData.length);

                for (let i = 0; i < inputData.length; i++) {
                    const s = Math.max(-1, Math.min(1, inputData[i]));
                    pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }

                const base64Audio = arrayBufferToBase64(pcmData.buffer);

                const message = {
                    realtimeInput: {
                        mediaChunks: [{
                            mimeType: "audio/pcm;rate=16000",
                            data: base64Audio
                        }]
                    }
                };

                wsRef.current.send(JSON.stringify(message));
            };

            source.connect(processor);
            processor.connect(audioContext.destination);

        } catch (error) {
            console.error('Error starting audio capture', error);
            toast.error('Mikrofona erişilemedi');
            disconnect();
        }
    };

    const stopAudioCapture = () => {
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
    };

    function base64ToArrayBuffer(base64: string) {
        const binaryString = window.atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    function arrayBufferToBase64(buffer: ArrayBuffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    const playPcmData = (base64Data: string) => {
        if (!audioContextRef.current) return;
        if (isPaused) return; // Duraklatılmışsa ses çalma

        const targetSampleRate = 24000;
        const buffer = base64ToArrayBuffer(base64Data);
        const int16Array = new Int16Array(buffer);
        const float32Array = new Float32Array(int16Array.length);

        for (let i = 0; i < int16Array.length; i++) {
            float32Array[i] = int16Array[i] / 32768;
        }

        const audioBuffer = audioContextRef.current.createBuffer(1, float32Array.length, targetSampleRate);
        audioBuffer.getChannelData(0).set(float32Array);

        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);

        const currentTime = audioContextRef.current.currentTime;
        if (nextStartTimeRef.current < currentTime) {
            nextStartTimeRef.current = currentTime;
        }
        source.start(nextStartTimeRef.current);
        nextStartTimeRef.current += audioBuffer.duration;
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
            {/* Durum göstergesi */}
            {statusText && (
                <div className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium shadow-lg",
                    isPaused ? "bg-yellow-500/90 text-white" :
                        isConnected ? "bg-green-500/90 text-white" :
                            isListeningForWakeWord ? "bg-purple-500/90 text-white" :
                                "bg-gray-800/90 text-white"
                )}>
                    <div className="flex items-center gap-1.5">
                        {isPaused ? <Pause className="w-3 h-3" /> :
                            isConnected ? <Sparkles className="w-3 h-3" /> :
                                <Mic className="w-3 h-3" />}
                        <span>{statusText}</span>
                    </div>
                </div>
            )}

            {/* Hata rozeti ve gönder butonu */}
            {showErrorBadge && isConnected && (
                <Button
                    onClick={sendErrorsToAssistant}
                    size="sm"
                    variant="destructive"
                    className="rounded-full shadow-lg animate-pulse"
                >
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {consoleErrors.length} Hata - Gönder
                </Button>
            )}

            {/* Ana buton */}
            <div className="flex gap-2">
                {/* Ekran görüntüsü butonu */}
                {isConnected && (
                    <Button
                        onClick={captureAndSendScreen}
                        size="lg"
                        className="rounded-full w-12 h-12 shadow-lg bg-blue-500 hover:bg-blue-600"
                        title="Ekran görüntüsü al ve Elsa'ya gönder"
                    >
                        <Eye className="w-5 h-5 text-white" />
                    </Button>
                )}

                {/* Duraklatma butonu */}
                {isConnected && (
                    <Button
                        onClick={() => setIsPaused(!isPaused)}
                        size="lg"
                        className={cn(
                            "rounded-full w-12 h-12 shadow-lg",
                            isPaused ? "bg-yellow-500 hover:bg-yellow-600" : "bg-gray-600 hover:bg-gray-700"
                        )}
                    >
                        {isPaused ? <Play className="w-5 h-5 text-white" /> : <Pause className="w-5 h-5 text-white" />}
                    </Button>
                )}

                {/* Ana mikrofon butonu */}
                <Button
                    onClick={toggleVoice}
                    size="lg"
                    className={cn(
                        "rounded-full w-14 h-14 shadow-lg transition-all duration-300",
                        isActive
                            ? isConnected
                                ? isPaused
                                    ? "bg-yellow-500 hover:bg-yellow-600"
                                    : "bg-green-500 hover:bg-green-600 animate-pulse"
                                : "bg-purple-500 hover:bg-purple-600"
                            : "bg-primary hover:bg-primary/90"
                    )}
                >
                    {isActive ? (
                        isConnected ? (
                            isPaused ? <Pause className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />
                        ) : (
                            isListeningForWakeWord ? <Sparkles className="w-6 h-6 text-white animate-pulse" /> : <Loader2 className="w-6 h-6 text-white animate-spin" />
                        )
                    ) : (
                        <MicOff className="w-6 h-6 text-white" />
                    )}
                </Button>
            </div>

            {/* Kullanım ipucu */}
            {isActive && !isConnected && (
                <div className="text-xs text-muted-foreground text-right max-w-48">
                    "Elsa" deyin aktifleştirmek için
                </div>
            )}
        </div>
    );
}
