import { Bot, User, ImageIcon, AlertCircle, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Markdown } from '@/components/ui/markdown';
import type { ImageAttachment } from '@/store/app-store';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  images?: ImageAttachment[];
  isError?: boolean;
}

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isError = message.isError && message.role === 'assistant';
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      toast.success('Message copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy message');
    }
  };

  return (
    <div
      className={cn(
        'flex gap-4 max-w-4xl group relative',
        message.role === 'user' ? 'flex-row-reverse ml-auto' : ''
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm',
          isError
            ? 'bg-red-500/10 ring-1 ring-red-500/20'
            : message.role === 'assistant'
              ? 'bg-primary/10 ring-1 ring-primary/20'
              : 'bg-muted ring-1 ring-border'
        )}
      >
        {isError ? (
          <AlertCircle className="w-4 h-4 text-red-500" />
        ) : message.role === 'assistant' ? (
          <Bot className="w-4 h-4 text-primary" />
        ) : (
          <User className="w-4 h-4 text-muted-foreground" />
        )}
      </div>

      {/* Message Bubble */}
      <div
        className={cn(
          'flex-1 max-w-[85%] rounded-2xl px-4 py-3 shadow-sm select-text cursor-text relative', // select-text and relative for copy button
          isError
            ? 'bg-red-500/10 border border-red-500/30'
            : message.role === 'user'
              ? 'bg-primary text-primary-foreground'
              : 'bg-card border border-border'
        )}
      >
        {/* Copy Button (visible on hover) */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute -top-3 h-6 w-6 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity bg-background border border-border",
            message.role === 'user' ? '-left-2' : '-right-2'
          )}
          onClick={handleCopy}
          title="Copy message"
        >
          {copied ? (
            <Check className="h-3 w-3 text-green-500" />
          ) : (
            <Copy className="h-3 w-3 text-muted-foreground" />
          )}
        </Button>

        {message.role === 'assistant' ? (
          <Markdown
            className={cn(
              'text-sm prose-p:leading-relaxed prose-headings:text-foreground prose-strong:text-foreground prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded select-text', // Ensure Markdown is selectable
              isError
                ? 'text-red-600 dark:text-red-400 prose-code:text-red-600 dark:prose-code:text-red-400 prose-code:bg-red-500/10'
                : 'text-foreground prose-code:text-primary prose-code:bg-muted'
            )}
          >
            {message.content}
          </Markdown>
        ) : (
          <p className="text-sm whitespace-pre-wrap leading-relaxed select-text">{message.content}</p>
        )}

        {/* Display attached images for user messages */}
        {message.role === 'user' && message.images && message.images.length > 0 && (
          <div className="mt-3 space-y-2 select-none"> {/* Images usually don't need text selection */}
            <div className="flex items-center gap-1.5 text-xs text-primary-foreground/80">
              <ImageIcon className="w-3 h-3" />
              <span>
                {message.images.length} image
                {message.images.length > 1 ? 's' : ''} attached
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {message.images.map((image, index) => {
                // Construct proper data URL from base64 data and mime type
                const dataUrl = image.data.startsWith('data:')
                  ? image.data
                  : `data:${image.mimeType || 'image/png'};base64,${image.data}`;
                return (
                  <div
                    key={image.id || `img-${index}`}
                    className="relative group/image rounded-lg overflow-hidden border border-primary-foreground/20 bg-primary-foreground/10"
                  >
                    <img
                      src={dataUrl}
                      alt={image.filename || `Attached image ${index + 1}`}
                      className="w-20 h-20 object-cover hover:opacity-90 transition-opacity"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1.5 py-0.5 text-[9px] text-white truncate">
                      {image.filename || `Image ${index + 1}`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p
          className={cn(
            'text-[11px] mt-2 font-medium select-none', // Timestamp doesn't strictly need selection
            isError
              ? 'text-red-500/70'
              : message.role === 'user'
                ? 'text-primary-foreground/70'
                : 'text-muted-foreground'
          )}
        >
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}
