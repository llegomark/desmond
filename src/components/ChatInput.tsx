// FIX: Implement the ChatInput component to handle user text and file uploads.
import React, { useState, useRef, useEffect } from 'react';
import { Icon } from './Icons';
import type { StyleConfig } from '../types/types';
import { optimizePrompt } from '../services/geminiService';
import { validateSingleFile } from '../utils/fileValidation';


interface ChatInputProps {
  onSendMessage: (message: string, files: File[]) => void;
  isLoading: boolean;
  styles: StyleConfig;
  placeholder?: string;
  fileErrors: string[];
  isImageModel?: boolean;
  aspectRatio?: string;
  onAspectRatioChange?: (ratio: string) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading, styles, placeholder, fileErrors, isImageModel = false, aspectRatio = '16:9', onAspectRatioChange }) => {
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0); // FIX: Key to force file input remount
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const aspectRatios = [
    { value: '1:1', label: 'Square', icon: '□', description: '1024x1024' },
    { value: '2:3', label: 'Portrait', icon: '▯', description: '832x1248' },
    { value: '3:2', label: 'Landscape', icon: '▭', description: '1248x832' },
    { value: '16:9', label: 'Wide', icon: '▬', description: '1344x768' },
    { value: '9:16', label: 'Vertical', icon: '▮', description: '768x1344' },
  ];

  // Auto-resize textarea based on content
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Set the height to match the content, with a max height
      const maxHeight = 200; // Maximum height in pixels (about 8-10 lines)
      const newHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = `${newHeight}px`;
    }
  };

  // Adjust height when text changes
  useEffect(() => {
    adjustTextareaHeight();
  }, [text]);

  // Adjust height on component mount
  useEffect(() => {
    adjustTextareaHeight();
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      // Add new files to the existing list, preventing duplicates by name
      const newFiles = Array.from(event.target.files);

      setFiles(prevFiles => {
        const existingFileNames = new Set(prevFiles.map(f => f.name));
        // FIX: Use centralized validation logic
        const validNewFiles = newFiles.filter((f: File) => {
          if (existingFileNames.has(f.name)) {
            return false;
          }
          const error = validateSingleFile(f);
          if (error) {
            console.warn(error);
            return false;
          }
          return true;
        });
        return [...prevFiles, ...validNewFiles];
      });
    }
  };

  const removeFile = (indexToRemove: number) => {
    setFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
    // FIX: Force remount of file input to ensure onChange fires for same file re-selection
    // This prevents browser caching issues where selecting the same file doesn't trigger onChange
    setFileInputKey(prev => prev + 1);
  };

  const handleSend = () => {
    if ((text.trim() || files.length > 0) && !isLoading) {
      onSendMessage(text, files);
      setText('');
      setFiles([]);
      // FIX: Force remount of file input to ensure onChange fires for same file re-selection
      setFileInputKey(prev => prev + 1);
      // Reset textarea height after sending
      setTimeout(() => {
        adjustTextareaHeight();
      }, 0);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send message on Enter (without Shift)
    // Allow Shift+Enter for new lines
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleOptimizePrompt = async () => {
    if (!text.trim() || isLoading || isOptimizing) return;

    setIsOptimizing(true);
    try {
      const optimizedText = await optimizePrompt(text);
      // Only update if the component is still mounted and user hasn't changed the text
      if (optimizedText && optimizedText !== text) {
        setText(optimizedText);
      }
    } catch (error) {
      console.error("Failed to optimize prompt:", error);
      // Optionally, show an error to the user
    } finally {
      setIsOptimizing(false);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={styles.inputArea}>
      {fileErrors.length > 0 && (
        <div className="mb-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
          <ul className="list-disc list-inside">
            {fileErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      {isImageModel && onAspectRatioChange && (
        <div className="mb-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-semibold text-slate-700">Aspect Ratio</span>
            </div>
            <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
              {aspectRatios.find(r => r.value === aspectRatio)?.description || '1344x768'}
            </span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {aspectRatios.map((ratio) => (
              <button
                key={ratio.value}
                onClick={() => onAspectRatioChange(ratio.value)}
                className={`group relative p-3 rounded-lg border-2 transition-all duration-200 ${aspectRatio === ratio.value
                  ? 'border-blue-500 bg-blue-500 text-white shadow-md'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                disabled={isLoading}
                aria-label={`${ratio.label} aspect ratio`}
              >
                <div className="flex flex-col items-center gap-1.5">
                  <span className={`text-2xl transition-transform group-hover:scale-110 ${aspectRatio === ratio.value ? 'scale-110' : ''
                    }`}>
                    {ratio.icon}
                  </span>
                  <span className={`text-xs font-medium ${aspectRatio === ratio.value ? 'text-white' : 'text-slate-600'
                    }`}>
                    {ratio.label}
                  </span>
                  <span className={`text-[10px] ${aspectRatio === ratio.value ? 'text-blue-100' : 'text-slate-400'
                    }`}>
                    {ratio.value}
                  </span>
                </div>
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
            <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-amber-800 leading-relaxed">
              <span className="font-semibold">Important:</span> Please save any generated images immediately. Images will be lost when you refresh the browser or start a new chat session.
            </p>
          </div>
        </div>
      )}
      {files.length > 0 && (
        <div className={`mb-2 p-2 bg-slate-100 rounded-md text-sm max-h-32 overflow-y-auto ${styles.filePreview}`}>
          <div className="space-y-1">
            {files.map((file, index) => (
              <div key={index} className="flex justify-between items-center bg-white p-1 rounded">
                <span className="text-slate-700 truncate pr-2">{file.name}</span>
                <button onClick={() => removeFile(index)} className="flex-shrink-0 text-slate-500 hover:text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-slate-400 rounded-full w-5 h-5 flex items-center justify-center">&times;</button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-end gap-2">
        <input
          key={fileInputKey} // FIX: Key forces remount when changed, ensuring onChange always fires
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*,application/pdf"
          multiple
        />
        <button
          onClick={triggerFileUpload}
          className={styles.fileUploadButton}
          disabled={isLoading}
          aria-label="Upload file"
          title="Upload an image or PDF"
        >
          <Icon name="upload" className="w-6 h-6" />
        </button>
        <textarea
          ref={textareaRef}
          aria-label="Chat message"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Type a message or upload a pdf file..."}
          className={`${styles.input} resize-none overflow-y-auto`}
          disabled={isLoading}
          rows={1}
          style={{
            minHeight: '48px',
            maxHeight: '200px',
          }}
        />
        <button
          onClick={handleOptimizePrompt}
          className={styles.button}
          disabled={isLoading || isOptimizing || !text.trim()}
          aria-label="Optimize Prompt"
          title="Optimize Prompt"
          aria-busy={isOptimizing}
        >
          {isOptimizing ? <Icon name="loading" className="w-6 h-6" /> : <Icon name="sparkle" className="w-6 h-6" />}
          <span className="sr-only" aria-live="polite">
            {isOptimizing ? 'Optimizing prompt' : ''}
          </span>
        </button>
        <button
          onClick={handleSend}
          className={styles.button}
          disabled={isLoading || (!text.trim() && files.length === 0)}
          aria-label="Send message"
          aria-busy={isLoading}
        >
          {isLoading ? <Icon name="loading" className="w-6 h-6" /> : <Icon name="send" className="w-6 h-6" />}
          <span className="sr-only" aria-live="polite">
            {isLoading ? 'Sending message' : ''}
          </span>
        </button>
      </div>
      {!isLoading && text.trim() && (
        <div className="flex justify-center text-xs text-slate-400 mt-2">
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-mono">Enter</kbd>
            <span>to send</span>
            <span className="mx-1">•</span>
            <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-mono">Shift</kbd>
            <span>+</span>
            <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-mono">Enter</kbd>
            <span>for new line</span>
          </span>
        </div>
      )}
    </div>
  );
};

export default ChatInput;