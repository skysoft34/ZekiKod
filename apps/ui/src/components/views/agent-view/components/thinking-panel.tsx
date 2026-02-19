import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ListTodo, Circle, Terminal, ShieldCheck, Activity } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface ThinkingPanelProps {
    isProcessing: boolean;
    thought: string;
    todos: string[];
}

export function ThinkingPanel({ isProcessing, thought, todos }: ThinkingPanelProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [selectedSupervisor, setSelectedSupervisor] = useState('supervisor');

    // Auto-scroll to bottom of thought
    useEffect(() => {
        const scrollViewport = document.getElementById('thinking-scroll-viewport');
        if (scrollViewport) {
            scrollViewport.scrollTop = scrollViewport.scrollHeight;
        }
    }, [thought]);

    if (!isProcessing && !thought && todos.length === 0) return null;

    return (
        <div className="w-96 border-l border-border bg-[#0c0c0c] flex flex-col h-full shadow-2xl z-20 animate-in slide-in-from-right duration-300 font-mono">
            {/* Header */}
            <div className="p-3 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {isProcessing ? (
                        <Activity className="w-4 h-4 text-green-500 animate-pulse" />
                    ) : (
                        <Terminal className="w-4 h-4 text-muted-foreground" />
                    )}
                    <h3 className="text-xs font-bold text-foreground/90 tracking-wider uppercase">
                        System Monitor
                    </h3>
                </div>
                {isProcessing && (
                    <Badge variant="outline" className="text-[10px] h-5 border-green-500/30 text-green-500 bg-green-500/10">
                        LIVE
                    </Badge>
                )}
            </div>

            {/* System Logs (formerly Process) */}
            <div className="flex-1 flex flex-col min-h-0 bg-black/40">
                <div className="px-4 py-1.5 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest border-b border-white/5 bg-white/[0.02]">
                    Kernel Logs / Process Output
                </div>
                <ScrollArea className="flex-1" id="thinking-scroll-viewport">
                    <div className="p-4 font-mono text-xs">
                        {thought ? (
                            <div className="whitespace-pre-wrap text-green-400/90 leading-relaxed font-medium">
                                <span className="text-white/30 mr-2">$</span>
                                {thought}
                                {isProcessing && <span className="animate-pulse inline-block w-1.5 h-3 bg-green-500 ml-1 translate-y-0.5" />}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2 opacity-50">
                                <span className="text-white/20 text-[10px]">$ system_check --verbose</span>
                                <span className="text-blue-400/80">Waiting for process stream...</span>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Supervisor / Planned Tasks */}
            <div className="h-2/5 flex flex-col border-t border-white/10 bg-[#111]">
                <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            Supervisor
                        </span>
                    </div>
                    <Select value={selectedSupervisor} onValueChange={setSelectedSupervisor}>
                        <SelectTrigger className="h-6 w-[140px] text-[10px] bg-black/20 border-white/10 focus:ring-0">
                            <SelectValue placeholder="Select Agent" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a1a] border-white/10">
                            <SelectItem value="supervisor" className="text-xs">🤖 Maintainer Agent</SelectItem>
                            <SelectItem value="security" className="text-xs">🛡️ Security Auditor</SelectItem>
                            <SelectItem value="qa" className="text-xs">🧪 QA Specialist</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="px-4 py-1.5 text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest bg-black/20">
                    Active Tasks
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-4">
                        {todos.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground/30 py-4">
                                <ShieldCheck className="w-8 h-8 opacity-20" />
                                <div className="text-[10px] font-mono">No active anomalies detected</div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {todos.map((todo, idx) => (
                                    <div key={idx} className="flex gap-2 items-start group animate-in slide-in-from-bottom-2 duration-300">
                                        <div className="mt-1 shrink-0">
                                            {idx === 0 ? (
                                                <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
                                            ) : (
                                                <Circle className="w-2 h-2 text-muted-foreground/40" />
                                            )}
                                        </div>
                                        <span className={`font-mono text-[11px] leading-tight transition-colors ${idx === 0 ? 'text-blue-400' : 'text-muted-foreground group-hover:text-foreground'}`}>
                                            {todo}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
