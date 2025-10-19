import React from 'react';
import type { Conversation } from '../types/types';
import { Icon } from './Icons';

interface ChatHistoryProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onGenerateTitle: (id: string) => void;
  renamingConversationId: string | null;
  className?: string;
  isLoading?: boolean;
}

const ChatHistory: React.FC<ChatHistoryProps> = ({
  conversations,
  activeConversationId,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  onGenerateTitle,
  renamingConversationId,
  className,
  isLoading,
}) => {
  return (
    <div className={`bg-slate-50 border-r border-slate-200 flex flex-col ${className}`}>
      <div className="p-2 border-b border-slate-200">
        <button
          onClick={onNewChat}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Icon name="plus" className="w-4 h-4" />
          New Chat
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-4 py-8 text-center">
            <div className="mb-4 p-4 rounded-full bg-slate-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-10 h-10 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">No conversations yet</h3>
            <p className="text-xs text-slate-500 mb-4 max-w-[180px]">
              Start your first chat by clicking the "New Chat" button above
            </p>
            <div className="flex flex-col gap-1 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Ask questions</span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Analyze documents</span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                <span>Get code help</span>
              </div>
            </div>
          </div>
        ) : (
          <ul className="p-2 space-y-1">
            {conversations.map((convo) => (
              <li key={convo.id}>
                <div
                  onClick={() => onSelectConversation(convo.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectConversation(convo.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  title={convo.title}
                  aria-current={activeConversationId === convo.id ? 'true' : undefined}
                  className={`group w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 ${activeConversationId === convo.id
                    ? 'bg-blue-100 text-blue-800 font-semibold'
                    : 'text-slate-700 hover:bg-slate-200/70'
                    }`}
                >
                  <span className="truncate flex-1 min-w-0">{convo.title}</span>
                  {renamingConversationId === convo.id ? (
                    <span role="status" aria-label="Regenerating title" className="shrink-0">
                      <Icon name="loading" className="w-4 h-4 text-slate-500 animate-spin" />
                    </span>
                  ) : (
                    <span className="hidden md:flex md:w-0 md:group-hover:w-auto items-center shrink-0 overflow-hidden transition-all duration-200">
                      <button
                        onClick={(e) => { e.stopPropagation(); onGenerateTitle(convo.id); }}
                        className="p-1 rounded-md text-slate-500 hover:bg-blue-100 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                        aria-label={`Regenerate title for "${convo.title}"`}
                        title="Regenerate title"
                      >
                        <Icon name="edit" className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConversation(convo.id);
                        }}
                        className="p-1 rounded-md text-slate-500 hover:bg-red-100 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-500"
                        aria-label={`Delete "${convo.title}"`}
                        title={`Delete "${convo.title}"`}
                      >
                        <Icon name="trash" className="w-4 h-4" />
                      </button>
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </nav>
    </div>
  );
};

export default ChatHistory;