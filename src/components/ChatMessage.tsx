import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Message, StyleConfig, UsageMetadata } from '../types/types';
import { Icon } from './Icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import DOMPurify from 'dompurify';
import 'katex/dist/katex.min.css';

interface ChatMessageProps {
  message: Message;
  styles: StyleConfig;
  onSuggestionClick?: (suggestion: string) => void;
  showSuggestions?: boolean;
}

// Memoized markdown components factory
const createMarkdownComponents = (
  handleCodeCopy: (code: string) => void,
  copiedCode: Record<string, boolean>
): Record<string, React.ComponentType<React.ComponentPropsWithoutRef<'code'> & { inline?: boolean }>> => ({
  code({ inline, className, children, ...props }: React.ComponentPropsWithoutRef<'code'> & { inline?: boolean }) {
    const match = /language-(\w+)/.exec(className || '');
    const codeString = String(children).replace(/\n$/, '');

    if (!inline && match) {
      return (
        <div className="relative my-2 bg-slate-50 border border-slate-200 rounded-md overflow-hidden font-sans">
          <div className="flex items-center justify-between px-4 py-1.5 bg-slate-100 border-b border-slate-200">
            <span className="text-xs font-sans text-slate-500">{match[1]}</span>
            <button
              onClick={() => handleCodeCopy(codeString)}
              className="p-1 rounded-md text-slate-500 hover:bg-slate-200 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label={copiedCode[codeString] ? 'Copied!' : 'Copy code'}
              title={copiedCode[codeString] ? 'Copied!' : 'Copy code'}
            >
              <Icon name={copiedCode[codeString] ? 'check' : 'copy'} className="w-4 h-4" />
            </button>
          </div>
          <SyntaxHighlighter
            style={oneLight}
            language={match[1]}
            PreTag="div"
            customStyle={{ margin: 0, padding: '1rem', overflowX: 'auto' }}
            codeTagProps={{ style: { fontFamily: 'inherit', fontSize: '0.875rem' } }}
          >
            {codeString}
          </SyntaxHighlighter>
        </div>
      );
    }

    return (
      <code className="px-1.5 py-0.5 bg-slate-200 rounded text-blue-600 font-mono text-sm" {...props}>
        {children}
      </code>
    );
  }
});

// FIX: Memoized MessageContent component with LaTeX support and XSS protection
interface MessageContentProps {
  text: string;
  components: Record<string, React.ComponentType<React.ComponentPropsWithoutRef<'code'> & { inline?: boolean }>>;
}

const MessageContent = React.memo<MessageContentProps>(({ text, components }) => {
  // Sanitize the text to prevent XSS attacks while preserving markdown and LaTeX
  const sanitizedText = useMemo(() => {
    return DOMPurify.sanitize(text, {
      // Allow common HTML tags that markdown produces
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'code', 'pre', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'del', 'span', 'div'],
      // Allow common attributes
      ALLOWED_ATTR: ['href', 'class', 'id', 'target', 'rel', 'title'],
      // Allow data URIs for images if needed
      ALLOW_DATA_ATTR: false,
      // Return as plain text since ReactMarkdown will handle the rendering
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
    });
  }, [text]);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={components}
    >
      {sanitizedText}
    </ReactMarkdown>
  );
}, (prevProps, nextProps) => {
  return prevProps.text === nextProps.text;
});

MessageContent.displayName = 'MessageContent';

// FIX: Memoized ThoughtsContent component with LaTeX support and XSS protection
interface ThoughtsContentProps {
  thoughts: string;
}

const ThoughtsContent = React.memo<ThoughtsContentProps>(({ thoughts }) => {
  // Sanitize the thoughts to prevent XSS attacks while preserving markdown and LaTeX
  const sanitizedThoughts = useMemo(() => {
    return DOMPurify.sanitize(thoughts, {
      // Allow common HTML tags that markdown produces
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'code', 'pre', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'del', 'span', 'div'],
      // Allow common attributes
      ALLOWED_ATTR: ['href', 'class', 'id', 'target', 'rel', 'title'],
      // Allow data URIs for images if needed
      ALLOW_DATA_ATTR: false,
      // Return as plain text since ReactMarkdown will handle the rendering
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
    });
  }, [thoughts]);

  return (
    <div className="prose prose-sm max-w-none text-slate-600">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {sanitizedThoughts}
      </ReactMarkdown>
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.thoughts === nextProps.thoughts;
});

ThoughtsContent.displayName = 'ThoughtsContent';

// FIX: New component for displaying usage metadata with excellent UX
interface UsageMetadataDisplayProps {
  metadata: UsageMetadata;
}

const UsageMetadataDisplay = React.memo<UsageMetadataDisplayProps>(({ metadata }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Memoize calculations to avoid recalculating on every render
  const calculations = useMemo(() => {
    const totalInput = (metadata.promptTokenCount || 0) + (metadata.cachedContentTokenCount || 0);
    const totalOutput = metadata.candidatesTokenCount || 0;
    const totalTokens = metadata.totalTokenCount || totalInput + totalOutput;

    const inputPercentage = totalTokens > 0 ? (totalInput / totalTokens) * 100 : 0;
    const outputPercentage = totalTokens > 0 ? (totalOutput / totalTokens) * 100 : 0;

    return {
      totalInput,
      totalOutput,
      totalTokens,
      inputPercentage,
      outputPercentage,
      hasSignificantData: totalTokens > 0,
      hasCachedContent: (metadata.cachedContentTokenCount || 0) > 0,
      hasThoughts: (metadata.thoughtsTokenCount || 0) > 0,
      hasToolUse: (metadata.toolUsePromptTokenCount || 0) > 0,
    };
  }, [metadata]);

  if (!calculations.hasSignificantData) return null;

  return (
    <div className="mt-3 pt-3 border-t border-slate-300/70">
      <button
        onClick={() => setIsExpanded(prev => !prev)}
        className="w-full flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 rounded-md p-1 hover:bg-slate-50 transition-colors"
        aria-expanded={isExpanded}
        aria-controls="usage-metadata"
      >
        <h4 className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
          </svg>
          Token Usage
          <span className="text-slate-400 font-normal">
            ({calculations.totalTokens.toLocaleString()} total)
          </span>
        </h4>
        <Icon name="chevron-down" className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {isExpanded && (
        <div id="usage-metadata" className="mt-3 space-y-3 text-xs">
          {/* Visual Token Distribution Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-slate-600">
              <span>Token Distribution</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
              <div
                className="bg-blue-500 transition-all duration-300"
                style={{ width: `${calculations.inputPercentage}%` }}
                title={`Input: ${calculations.inputPercentage.toFixed(1)}%`}
              />
              <div
                className="bg-green-500 transition-all duration-300"
                style={{ width: `${calculations.outputPercentage}%` }}
                title={`Output: ${calculations.outputPercentage.toFixed(1)}%`}
              />
            </div>
            <div className="flex gap-3 text-[10px]">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span className="text-slate-500">Input ({calculations.inputPercentage.toFixed(0)}%)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-slate-500">Output ({calculations.outputPercentage.toFixed(0)}%)</span>
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-blue-50 rounded-md p-2">
              <div className="text-[10px] text-blue-600 font-medium mb-0.5">Input Tokens</div>
              <div className="text-sm font-semibold text-blue-700">
                {(metadata.promptTokenCount || 0).toLocaleString()}
              </div>
            </div>
            <div className="bg-green-50 rounded-md p-2">
              <div className="text-[10px] text-green-600 font-medium mb-0.5">Output Tokens</div>
              <div className="text-sm font-semibold text-green-700">
                {(metadata.candidatesTokenCount || 0).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Cached Content Highlight */}
          {calculations.hasCachedContent && (
            <div className="bg-purple-50 border border-purple-200 rounded-md p-2">
              <div className="flex items-center gap-2">
                <Icon name="cache" className="w-3.5 h-3.5 text-purple-600" />
                <div className="flex-1">
                  <div className="text-[10px] text-purple-600 font-medium">Cached Content</div>
                  <div className="text-sm font-semibold text-purple-700">
                    {metadata.cachedContentTokenCount!.toLocaleString()} tokens
                  </div>
                </div>
                <div className="text-[10px] text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                  Saved cost!
                </div>
              </div>
            </div>
          )}

          {/* Additional Details (Collapsible) */}
          <details className="bg-slate-50 rounded-md">
            <summary className="cursor-pointer p-2 text-slate-600 hover:bg-slate-100 rounded-md transition-colors list-none">
              <div className="flex items-center justify-between">
                <span className="font-medium">Detailed Breakdown</span>
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </summary>
            <div className="p-2 pt-1 space-y-2 border-t border-slate-200">
              {calculations.hasThoughts && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <Icon name="thought" className="w-3 h-3" />
                    Thinking Process
                  </span>
                  <span className="font-medium text-slate-700">
                    {metadata.thoughtsTokenCount!.toLocaleString()}
                  </span>
                </div>
              )}
              {calculations.hasToolUse && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-600 flex items-center gap-1.5">
                    <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                    </svg>
                    Tool Use
                  </span>
                  <span className="font-medium text-slate-700">
                    {metadata.toolUsePromptTokenCount!.toLocaleString()}
                  </span>
                </div>
              )}
              {metadata.promptTokensDetails && metadata.promptTokensDetails.length > 0 && (
                <div className="pt-1 border-t border-slate-200">
                  <div className="text-[10px] text-slate-500 font-medium mb-1">Input Modality</div>
                  {metadata.promptTokensDetails.map((detail, idx) => (
                    <div key={idx} className="flex justify-between items-center py-0.5">
                      <span className="text-slate-600">{detail.modality || 'Unknown'}</span>
                      <span className="text-slate-700">{(detail.tokenCount || 0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
              {metadata.toolUsePromptTokensDetails && metadata.toolUsePromptTokensDetails.length > 0 && (
                <div className="pt-1 border-t border-slate-200">
                  <div className="text-[10px] text-slate-500 font-medium mb-1">Tool Use Modality</div>
                  {metadata.toolUsePromptTokensDetails.map((detail, idx) => (
                    <div key={idx} className="flex justify-between items-center py-0.5">
                      <span className="text-slate-600">{detail.modality || 'Unknown'}</span>
                      <span className="text-slate-700">{(detail.tokenCount || 0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="pt-1 border-t border-slate-200">
                <div className="flex justify-between items-center py-1 font-semibold">
                  <span className="text-slate-700">Total Tokens</span>
                  <span className="text-slate-900">{calculations.totalTokens.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </details>

          {/* Cost Estimation (Optional - you can customize rates) */}
          <div className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-200">
            💡 Tip: Lower token usage = faster responses and lower costs
          </div>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // FIX: Use shallow comparison instead of JSON.stringify
  const prev = prevProps.metadata;
  const next = nextProps.metadata;

  return (
    prev.promptTokenCount === next.promptTokenCount &&
    prev.candidatesTokenCount === next.candidatesTokenCount &&
    prev.totalTokenCount === next.totalTokenCount &&
    prev.thoughtsTokenCount === next.thoughtsTokenCount &&
    prev.cachedContentTokenCount === next.cachedContentTokenCount &&
    prev.toolUsePromptTokenCount === next.toolUsePromptTokenCount
  );
});

UsageMetadataDisplay.displayName = 'UsageMetadataDisplay';

const ChatMessage: React.FC<ChatMessageProps> = ({ message, styles, onSuggestionClick, showSuggestions }) => {
  const [isCopied, setIsCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState<Record<string, boolean>>({});
  const [showThoughts, setShowThoughts] = useState(() => !message.thinkingTime);
  const [showCode, setShowCode] = useState(() => !message.codeExecutionResult);
  const [showResult, setShowResult] = useState(() => !message.codeExecutionResult);
  const [showFullMessage, setShowFullMessage] = useState(false);
  const [showSuggestionsList, setShowSuggestionsList] = useState(false);
  const isUser = message.sender === 'user';
  const isInitialMessage = message.id.startsWith('initial-');

  // Check if screen is mobile
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cleanup image preview URLs when component unmounts
  useEffect(() => {
    return () => {
      if (message.imagePreviews) {
        message.imagePreviews.forEach(url => {
          try {
            URL.revokeObjectURL(url);
          } catch {
            // URL might already be revoked
          }
        });
      }
    };
  }, [message.imagePreviews]);

  const bubbleStyle = isUser ? styles.messageUser : styles.messageAI;

  const handleCopy = useCallback(() => {
    if (message.text) {
      navigator.clipboard.writeText(message.text).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }).catch(err => {
        console.error('Failed to copy text: ', err);
      });
    }
  }, [message.text]);

  const handleCodeCopy = useCallback((code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(prev => ({ ...prev, [code]: true }));
      setTimeout(() => {
        setCopiedCode(prev => {
          const newState = { ...prev };
          delete newState[code];
          return newState;
        });
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy code: ', err);
    });
  }, []);

  const handleImageDownload = useCallback((base64: string, mimeType: string, index: number) => {
    try {
      const link = document.createElement('a');
      link.href = `data:${mimeType};base64,${base64}`;
      link.download = `generated-image-${Date.now()}-${index}.${mimeType.split('/')[1] || 'png'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to download image: ', err);
    }
  }, []);

  // Memoize the markdown components object
  const markdownComponents = useMemo(
    () => createMarkdownComponents(handleCodeCopy, copiedCode),
    [handleCodeCopy, copiedCode]
  );

  return (
    <div className={`flex items-start gap-2 sm:gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && !isMobile && (
        <div className={`${styles.avatarContainer} shrink-0`}>
          <Icon name="ai" className={styles.avatarIcon} />
        </div>
      )}
      <div className={`flex flex-col w-full ${isMobile ? 'max-w-full' : 'max-w-[95%]'} md:max-w-md lg:max-w-xl xl:max-w-2xl 2xl:max-w-3xl min-w-0`}>
        <div className={`group relative ${styles.messageBase} ${bubbleStyle} overflow-hidden`}>
          {!isUser && message.text && (
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 p-1.5 rounded-md bg-white/50 text-slate-500 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all hover:bg-slate-200/70 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 z-10"
              aria-label={isCopied ? 'Copied' : 'Copy message'}
              title={isCopied ? 'Copied!' : 'Copy to clipboard'}
            >
              <Icon name={isCopied ? 'check' : 'copy'} className="w-4 h-4" />
            </button>
          )}
          {message.thoughts && (
            <div className="mb-3 bg-slate-100 rounded-md">
              {message.thinkingTime ? (
                <>
                  <button
                    onClick={() => setShowThoughts(prev => !prev)}
                    className="w-full flex items-center justify-between p-3 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 rounded-md"
                    aria-expanded={showThoughts}
                    aria-controls={`thoughts-${message.id}`}
                  >
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                      <Icon name="thought" className="w-4 h-4" />
                      Thinking Process ({(message.thinkingTime / 1000).toFixed(1)}s)
                    </h4>
                    <Icon name="chevron-down" className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${showThoughts ? 'rotate-180' : ''}`} />
                  </button>
                  {showThoughts && (
                    <div id={`thoughts-${message.id}`} className="px-3 pb-3 border-t border-slate-200">
                      <ThoughtsContent thoughts={message.thoughts} />
                    </div>
                  )}
                </>
              ) : (
                <div className="p-3" role="status">
                  <h4 className="flex items-center gap-2 text-sm font-semibold mb-2 text-slate-500">
                    <Icon name="thought" className="w-4 h-4" />
                    Thinking...
                  </h4>
                  <ThoughtsContent thoughts={message.thoughts} />
                </div>
              )}
            </div>
          )}
          {message.imagePreviews && message.imagePreviews.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {message.imagePreviews.map((src, index) => (
                <img key={index} src={src} alt={`Image preview ${index + 1}`} className="rounded-lg max-w-xs max-h-48" />
              ))}
            </div>
          )}
          {message.files && message.files.length > 0 && (
            <div className={`mb-2 p-2 rounded-md text-sm ${isUser ? 'bg-white/30' : 'bg-slate-100 text-slate-600'}`}>
              <p className="font-medium">{message.files.length > 1 ? 'Files' : 'File'}:</p>
              <ul className="list-disc list-inside pl-2">
                {message.files.map((file, index) => (
                  <li key={index} className="truncate">{file.name}</li>
                ))}
              </ul>
            </div>
          )}
          {message.generatedImages && message.generatedImages.length > 0 && (
            <div className="mb-3 space-y-2">
              <h4 className="text-sm font-semibold text-slate-600 flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
                Generated {message.generatedImages.length > 1 ? 'Images' : 'Image'}
              </h4>
              <div className="grid grid-cols-1 gap-3">
                {message.generatedImages.map((img, index) => (
                  <div key={index} className="relative group rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                    <img
                      src={`data:${img.mimeType};base64,${img.base64}`}
                      alt={`Generated image ${index + 1}`}
                      className="w-full h-auto"
                    />
                    <button
                      onClick={() => handleImageDownload(img.base64, img.mimeType, index)}
                      className="absolute top-2 right-2 p-2 rounded-md bg-black/50 text-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white z-10"
                      aria-label="Download image"
                      title="Download image"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {isUser ? (
            <p className="whitespace-pre-wrap wrap-break-word overflow-wrap-anywhere">{message.text}</p>
          ) : (
            <>
              {message.executableCode && (
                <div className="mb-3 bg-slate-100 rounded-md">
                  <button
                    onClick={() => setShowCode(prev => !prev)}
                    className="w-full flex items-center justify-between p-3 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 rounded-md"
                    aria-expanded={showCode}
                    aria-controls={`code-${message.id}`}
                  >
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                      <Icon name="sparkle" className="w-4 h-4" />
                      Executable Code
                    </h4>
                    <Icon name="chevron-down" className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${showCode ? 'rotate-180' : ''}`} />
                  </button>
                  {showCode && (
                    <div id={`code-${message.id}`} className="border-t border-slate-200">
                      <SyntaxHighlighter
                        style={oneLight}
                        language="python"
                        PreTag="div"
                        customStyle={{ margin: 0, padding: '1rem', overflowX: 'auto', backgroundColor: '#f8fafc' }}
                        codeTagProps={{ style: { fontFamily: 'inherit', fontSize: '0.875rem' } }}
                      >
                        {String(message.executableCode).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    </div>
                  )}
                </div>
              )}
              {message.codeExecutionResult && (
                <div className="mb-3 bg-slate-100 rounded-md">
                  <button
                    onClick={() => setShowResult(prev => !prev)}
                    className="w-full flex items-center justify-between p-3 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 rounded-md"
                    aria-expanded={showResult}
                    aria-controls={`result-${message.id}`}
                  >
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                      <Icon name="check" className="w-5 h-5" />
                      Result
                    </h4>
                    <Icon name="chevron-down" className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${showResult ? 'rotate-180' : ''}`} />
                  </button>
                  {showResult && (
                    <div id={`result-${message.id}`} className="border-t border-slate-200">
                      <pre className="p-3 text-sm bg-slate-50 text-slate-800 whitespace-pre-wrap break-all overflow-x-auto max-h-60 rounded-b-md">
                        <code>{message.codeExecutionResult}</code>
                      </pre>
                    </div>
                  )}
                </div>
              )}
              {message.codeExecutionImages && message.codeExecutionImages.length > 0 && (
                <div className="mb-3 space-y-2">
                  <h4 className="text-sm font-semibold text-slate-600 flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                    </svg>
                    Generated {message.codeExecutionImages.length > 1 ? 'Graphs' : 'Graph'}
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    {message.codeExecutionImages.map((img, index) => (
                      <div key={index} className="relative group rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                        <img
                          src={`data:${img.mimeType};base64,${img.base64}`}
                          alt={`Generated graph ${index + 1}`}
                          className="w-full h-auto"
                        />
                        <button
                          onClick={() => handleImageDownload(img.base64, img.mimeType, index)}
                          className="absolute top-2 right-2 p-2 rounded-md bg-black/50 text-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white z-10"
                          aria-label="Download graph"
                          title="Download graph"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="prose prose-sm max-w-none wrap-break-word">
                {message.text ? (
                  <>
                    <MessageContent text={showFullMessage && message.fullText ? message.fullText : message.text} components={markdownComponents} />
                    {isInitialMessage && message.fullText && (
                      <button
                        onClick={() => setShowFullMessage(prev => !prev)}
                        className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 transition-colors"
                        aria-expanded={showFullMessage}
                      >
                        {showFullMessage ? (
                          <>
                            <Icon name="chevron-down" className="w-4 h-4 rotate-180" />
                            Show less
                          </>
                        ) : (
                          <>
                            <Icon name="chevron-down" className="w-4 h-4" />
                            Learn more about features
                          </>
                        )}
                      </button>
                    )}
                  </>
                ) : (
                  !message.thoughts && !message.executableCode && (
                    <div role="status" className="flex items-center">
                      <Icon name="loading" className="w-5 h-5" />
                      <span className="sr-only">Desmond is responding...</span>
                    </div>
                  )
                )}
              </div>
            </>
          )}
          {message.sources && message.sources.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-300/70">
              <h4 className="text-sm font-semibold mb-2 text-slate-600 flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                </svg>
                Sources
              </h4>
              <ul className="list-none space-y-2 pl-0!">
                {message.sources.map((source, index) => {
                  const isGoogleMaps = source.placeId !== undefined;
                  return (
                    <li key={index}>
                      <a
                        href={source.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-start gap-2 p-2.5 rounded-lg border transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isGoogleMaps
                          ? 'bg-linear-to-r from-blue-50 to-green-50 border-blue-200 hover:border-blue-300'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                          }`}
                        title={source.title}
                      >
                        <div className="shrink-0 mt-0.5">
                          {isGoogleMaps ? (
                            <img
                              src="https://www.google.com/images/branding/product/ico/maps15_bnuw3a_32dp.ico"
                              alt="Google Maps"
                              className="w-4 h-4"
                            />
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium truncate ${isGoogleMaps ? 'text-blue-700' : 'text-slate-700'}`}>
                            {source.title}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs text-slate-500" translate="no">
                              {isGoogleMaps ? 'Google Maps' : new URL(source.uri).hostname}
                            </span>
                            {isGoogleMaps && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700">
                                <svg className="w-2.5 h-2.5 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                </svg>
                                Place
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </div>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {message.usageMetadata && (
            <UsageMetadataDisplay metadata={message.usageMetadata} />
          )}
        </div>
        {message.suggestions && showSuggestions && onSuggestionClick && (
          <div className="mt-3 pl-1">
            <button
              onClick={() => setShowSuggestionsList(prev => !prev)}
              className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 transition-colors"
              aria-expanded={showSuggestionsList}
            >
              {showSuggestionsList ? (
                <>
                  <Icon name="chevron-down" className="w-4 h-4 rotate-180" />
                  Hide example prompts
                </>
              ) : (
                <>
                  <Icon name="sparkle" className="w-4 h-4" />
                  Show example prompts ({message.suggestions.length})
                </>
              )}
            </button>
            {showSuggestionsList && (
              <div className="flex flex-wrap gap-2">
                {message.suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => onSuggestionClick(suggestion)}
                    className="bg-white text-slate-700 text-left text-sm py-2 px-3 rounded-lg border border-slate-300 hover:bg-slate-100 hover:border-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 wrap-break-word whitespace-pre-wrap overflow-wrap-anywhere max-w-full"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {message.timestamp && (
          <p className={`mt-1.5 px-2 text-xs text-slate-400 ${isUser ? 'text-right' : 'text-left'}`}>
            {message.timestamp}
          </p>
        )}
      </div>
      {isUser && !isMobile && (
        <div className={`${styles.avatarContainer} shrink-0`}>
          <Icon name="user" className={styles.avatarIcon} />
        </div>
      )}
    </div>
  );
};

// FIX: Enhanced memo with deep comparison of relevant props to prevent unnecessary re-renders
export default React.memo(ChatMessage, (prevProps, nextProps) => {
  // Compare message content (the most important prop)
  if (prevProps.message.id !== nextProps.message.id) return false;
  if (prevProps.message.text !== nextProps.message.text) return false;
  if (prevProps.message.fullText !== nextProps.message.fullText) return false;
  if (prevProps.message.thoughts !== nextProps.message.thoughts) return false;
  if (prevProps.message.thinkingTime !== nextProps.message.thinkingTime) return false;
  if (prevProps.message.executableCode !== nextProps.message.executableCode) return false;
  if (prevProps.message.codeExecutionResult !== nextProps.message.codeExecutionResult) return false;
  if (prevProps.message.codeExecutionImages?.length !== nextProps.message.codeExecutionImages?.length) return false;

  // Compare other props
  if (prevProps.showSuggestions !== nextProps.showSuggestions) return false;

  // Styles object reference can change, but we don't need to re-render for that
  // since the actual CSS classes don't change

  // All checks passed, skip re-render
  return true;
});