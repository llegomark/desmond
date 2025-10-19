import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import ChatHistory from './components/ChatHistory';
import { streamGeminiResponse, startNewChatSession, initializeAiClient, generateChatTitle, verifyApiKey, generateTitleFromHistory, generateImage } from './services/geminiService';
import type { Message, StyleConfig, Conversation, Content, ModelId } from './types/types';
import { Icon } from './components/Icons';
import { validateFiles } from './utils/fileValidation';

// Query Keys - Centralized for consistency
const conversationKeys = {
  all: ['conversations'] as const,
  detail: (id: string) => [...conversationKeys.all, id] as const,
};

const getFormattedTimestamp = (): string => {
  return new Date().toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

const MODELS: Record<ModelId, { name: string; description: string }> = {
  'gemini-2.5-pro': {
    name: 'Cognitive Core',
    description: 'The powerhouse engine for deep analysis and complex problem-solving. Excels at understanding nuanced topics, generating detailed insights from large documents, and handling multi-step reasoning.',
  },
  'gemini-2.5-flash': {
    name: 'Dynamic Engine',
    description: 'A swift and versatile engine perfect for a wide range of tasks. Delivers quick, intelligent responses for brainstorming, summarization, and everyday questions.',
  },
  'gemini-2.5-flash-lite': {
    name: 'Rapid Response',
    description: 'The lightning-fast engine for instant answers and high-volume tasks. Ideal for when speed and high throughput are top priorities, delivering efficient results without delay.',
  },
  'gemini-2.5-flash-lite-maps': {
    name: 'Maps Navigator',
    description: 'Specialized location-aware assistant powered by Google Maps. Provides accurate place recommendations, directions, itinerary planning, and local area exploration using real-time Maps data.',
  },
  'gemini-2.5-flash-image': {
    name: 'Image Generator',
    description: 'Advanced image generation and editing capabilities. Creates high-quality images from text descriptions, edits existing images, and supports various artistic styles with 16:9 aspect ratio output.',
  },
};

const INITIAL_MESSAGE_WITHOUT_KEY = {
  sender: 'ai' as const,
  text: `Hello! I'm **Desmond**, your AI assistant.

To get started, please enter your License Key by clicking the settings icon in the top-right corner.

What can I help you with today?`,
  fullText: `Hello! I'm Desmond, your AI assistant. I can help you with a variety of tasks, and I'll even show you my thought process as I work.

To get started, please enter your License Key by clicking the **settings icon** in the top-right corner.

Once your license key is set, you can try things like:

*   **Ask about current events:** "What is the latest news in the Philippines?"
*   **Upload a file for analysis:** Upload a PDF of a research paper and ask me to summarize it.
*   **Provide a URL for a specific task:** "Please write a complete case digest for the following URL: https://lawphil.net/judjuris/juri2025/mar2025/gr_265434_2025.html"

**A quick heads-up on how I work:**

*   **Start a new chat:** Click the **+ New Chat** button in the sidebar to start a fresh conversation.
*   **Optimize your prompt:** Not sure how to phrase your question? Type it out and click the **sparkle icon** ✨. I'll help you rewrite it for better clarity and effectiveness to get the best possible response.
*   **Choose your engine:** Use the dropdown in the top-left to switch between AI models. Changing models will start a new chat.
*   **Your privacy is protected:** **Your conversations are saved only in this browser**. Your license key is also stored securely only in your browser.

What can I help you with today?`,
  suggestions: [
    'Provide a summary of the top 10 most significant news stories in the Philippines as of today, focusing on political, economic, and social developments.',
    'Summarize the key arguments and concepts presented in Guillermo Rauch\'s article "The AI Cloud," focusing on the shift from a static web of pages to a dynamic web of intelligent agents and the implications for cloud infrastructure. Explain the three major trends identified by Rauch (Pages to Agents, Problems to Solutions, Closed to Open) and contrast the characteristics of the AI Cloud with the Traditional Cloud. Conclude with the article\'s vision for the future of the web and the role of open, decentralized foundations. URL: https://rauchg.com/2025/the-ai-cloud',
    'Generate a sample Python code snippet using the Matplotlib library that creates and displays a basic line graph. The graph should plot a simple sine wave, with appropriate labels for the x and y axes, and a title.',
    'Analyze the current financial situation in the Philippines. Specifically, focus on key economic indicators such as GDP growth rate, inflation rate, unemployment rate, and national debt. Present the findings using visualizations generated with the Python Matplotlib library. Ensure visualizations are clearly labeled, appropriately scaled, and easy to interpret.',
    'A photorealistic close-up portrait of a fluffy ginger cat with bright green eyes, sitting on a windowsill. Soft, natural light from the window illuminates its fur, creating a warm, cozy atmosphere. Shot with an 85mm lens with shallow depth of field, focusing on the cat\'s expressive face.',
    'Act as a legal expert specializing in Philippine jurisprudence. Provide a concise case digest of the Supreme Court ruling in G.R. No. 265434, dated March 03, 2025, titled "PEOPLE OF THE PHILIPPINES, PLAINTIFF-APPELLEE, VS. EDGARDO BERNARDINO Y TAMAYO A.K.A. \'TOTONG,\' ACCUSED-APPELLANT."\n\nThe digest should include:\n\n1. Case Title and Number,\n\n2. Date of Decision,\n\n3. Parties,\n\n4. Facts,\n\n5. Issue(s),\n\n6. Ruling/Holding, and\n\n7. Ratio Decidendi.\n\nThe digest should be a structured, bulleted list and not exceed 300 words.\n\nUse the provided URL for reference:\n\nhttps://lawphil.net/judjuris/juri2025/mar2025/gr_265434_2025.html',
    'Act as a legal analyst and provide a structured summary of the Supreme Court case G.R. No. 267998 using the following documents for your analysis:\n\nMain Decision: https://sc.judiciary.gov.ph/wp-content/uploads/2025/10/267998.pdf\nDissenting Opinion: https://sc.judiciary.gov.ph/wp-content/uploads/2025/10/267998-Dissenting-Opinion-SAJ-Leonen.pdf\n\nFormat your response into these distinct sections:\n\nCase Summary: Briefly explain the background of the case and what the petitioner was asking for.\nKey Points of the Majority Decision:\n    - What was the final ruling?\n    - Explain the court\'s reasoning regarding the burden of proof, the marriage certificate\'s status as a public document, and the application of the "good faith" principle under the Family Code.\nKey Points of the Dissenting Opinion (Senior Associate Justice Marvic M.V.F. Leonen):\n    - What was the core argument of the dissent?\n    - Explain why the dissent believed the marriage was void due to the absence of a valid ceremony.\n\nPlease define any legal jargon (like "void ab initio" or "prima facie") in simple terms.',
    'Provide a comprehensive historical overview of public access to Statements of Assets, Liabilities, and Net Worth (SALNs) in the Philippines. Detail key legislative milestones, significant court decisions, and notable periods of increased or restricted access. Analyze the impact of these developments on government transparency and accountability. Subsequently, explain the recent reinstatement of public access to SALNs for public officials, detailing updated procedures and any significant changes from previous policies.',
    'Provide a comprehensive research on Google\'s Cell2Sentence-Scale 27B (C2S-Scale) AI model, focusing on its development, capabilities, and implications for cancer research. Include details on its collaboration with Yale University, its foundation on Google\'s Gemma models, and its demonstrated ability to generate and validate novel hypotheses for cancer therapies. Cite credible sources for all information.',
    'A homeowner installs solar panels on their roof. Given that the panels receive varying sunlight throughout the day, calculate the total energy produced over a 12-hour period. The solar irradiance follows the pattern: I(t) = I_max × sin(πt/12) where t is time in hours (0 to 12) and I_max = 1000 W/m². The panel area is 20 m² with 18% efficiency. Use numerical integration to find the total energy in kWh.',
    'Given the matrix (B): [ B = \\begin{pmatrix} 2 & -1 & 3 \\\\ 0 & 4 & -2 \\\\ 1 & -3 & 5 \\end{pmatrix} ] Calculate the determinant of matrix (B). Please show the steps of your calculation, such as the expansion by cofactors along the first row. Your final answer should be clearly stated.',
  ],
};

const INITIAL_MESSAGE_WITH_KEY = {
  sender: 'ai' as const,
  text: `Hello! I'm **Desmond**, your AI assistant.

I can help you with research, document analysis, coding, math problems, and much more. Ready when you are!

What can I help you with today?`,
  fullText: `Hello! I'm Desmond, your AI assistant. I can help you with a variety of tasks, and I'll even show you my thought process as I work.

**Here are some things you can try:**

*   **Ask about current events:** "What is the latest news in the Philippines?"
*   **Upload a file for analysis:** Upload a PDF of a research paper and ask me to summarize it.
*   **Provide a URL for a specific task:** "Please write a complete case digest for the following URL: https://lawphil.net/judjuris/juri2025/mar2025/gr_265434_2025.html"

**Quick tips on how I work:**

*   **Start a new chat:** Click the **+ New Chat** button in the sidebar to start a fresh conversation.
*   **Optimize your prompt:** Not sure how to phrase your question? Type it out and click the **sparkle icon** ✨. I'll help you rewrite it for better clarity and effectiveness.
*   **Choose your engine:** Use the dropdown in the top-left to switch between AI models. Changing models will start a new chat.
*   **Your privacy is protected:** Your conversations are saved only in this browser. Your license key is also stored securely only in your browser.

What can I help you with today?`,
  suggestions: [
    'Provide a summary of the top 10 most significant news stories in the Philippines as of today, focusing on political, economic, and social developments.',
    'Summarize the key arguments and concepts presented in Guillermo Rauch\'s article "The AI Cloud," focusing on the shift from a static web of pages to a dynamic web of intelligent agents and the implications for cloud infrastructure. Explain the three major trends identified by Rauch (Pages to Agents, Problems to Solutions, Closed to Open) and contrast the characteristics of the AI Cloud with the Traditional Cloud. Conclude with the article\'s vision for the future of the web and the role of open, decentralized foundations. URL: https://rauchg.com/2025/the-ai-cloud',
    'Generate a sample Python code snippet using the Matplotlib library that creates and displays a basic line graph. The graph should plot a simple sine wave, with appropriate labels for the x and y axes, and a title.',
    'Analyze the current financial situation in the Philippines. Specifically, focus on key economic indicators such as GDP growth rate, inflation rate, unemployment rate, and national debt. Present the findings using visualizations generated with the Python Matplotlib library. Ensure visualizations are clearly labeled, appropriately scaled, and easy to interpret.',
    'A photorealistic close-up portrait of a fluffy ginger cat with bright green eyes, sitting on a windowsill. Soft, natural light from the window illuminates its fur, creating a warm, cozy atmosphere. Shot with an 85mm lens with shallow depth of field, focusing on the cat\'s expressive face.',
    'Act as a legal expert specializing in Philippine jurisprudence. Provide a concise case digest of the Supreme Court ruling in G.R. No. 265434, dated March 03, 2025, titled "PEOPLE OF THE PHILIPPINES, PLAINTIFF-APPELLEE, VS. EDGARDO BERNARDINO Y TAMAYO A.K.A. \'TOTONG,\' ACCUSED-APPELLANT."\n\nThe digest should include:\n\n1. Case Title and Number,\n\n2. Date of Decision,\n\n3. Parties,\n\n4. Facts,\n\n5. Issue(s),\n\n6. Ruling/Holding, and\n\n7. Ratio Decidendi.\n\nThe digest should be a structured, bulleted list and not exceed 300 words.\n\nUse the provided URL for reference:\n\nhttps://lawphil.net/judjuris/juri2025/mar2025/gr_265434_2025.html',
    'Act as a legal analyst and provide a structured summary of the Supreme Court case G.R. No. 267998 using the following documents for your analysis:\n\nMain Decision: https://sc.judiciary.gov.ph/wp-content/uploads/2025/10/267998.pdf\nDissenting Opinion: https://sc.judiciary.gov.ph/wp-content/uploads/2025/10/267998-Dissenting-Opinion-SAJ-Leonen.pdf\n\nFormat your response into these distinct sections:\n\nCase Summary: Briefly explain the background of the case and what the petitioner was asking for.\nKey Points of the Majority Decision:\n    - What was the final ruling?\n    - Explain the court\'s reasoning regarding the burden of proof, the marriage certificate\'s status as a public document, and the application of the "good faith" principle under the Family Code.\nKey Points of the Dissenting Opinion (Senior Associate Justice Marvic M.V.F. Leonen):\n    - What was the core argument of the dissent?\n    - Explain why the dissent believed the marriage was void due to the absence of a valid ceremony.\n\nPlease define any legal jargon (like "void ab initio" or "prima facie") in simple terms.',
    'Provide a comprehensive historical overview of public access to Statements of Assets, Liabilities, and Net Worth (SALNs) in the Philippines. Detail key legislative milestones, significant court decisions, and notable periods of increased or restricted access. Analyze the impact of these developments on government transparency and accountability. Subsequently, explain the recent reinstatement of public access to SALNs for public officials, detailing updated procedures and any significant changes from previous policies.',
    'Provide a comprehensive research on Google\'s Cell2Sentence-Scale 27B (C2S-Scale) AI model, focusing on its development, capabilities, and implications for cancer research. Include details on its collaboration with Yale University, its foundation on Google\'s Gemma models, and its demonstrated ability to generate and validate novel hypotheses for cancer therapies. Cite credible sources for all information.',
    'A homeowner installs solar panels on their roof. Given that the panels receive varying sunlight throughout the day, calculate the total energy produced over a 12-hour period. The solar irradiance follows the pattern: I(t) = I_max × sin(πt/12) where t is time in hours (0 to 12) and I_max = 1000 W/m². The panel area is 20 m² with 18% efficiency. Use numerical integration to find the total energy in kWh.',
    'Given the matrix (B): [ B = \\begin{pmatrix} 2 & -1 & 3 \\\\ 0 & 4 & -2 \\\\ 1 & -3 & 5 \\end{pmatrix} ] Calculate the determinant of matrix (B). Please show the steps of your calculation, such as the expansion by cofactors along the first row. Your final answer should be clearly stated.',
  ],
};

const createInitialMessages = (hasApiKey: boolean): Message[] => {
  const message = hasApiKey ? INITIAL_MESSAGE_WITH_KEY : INITIAL_MESSAGE_WITHOUT_KEY;
  return [{
    ...message,
    id: 'initial-' + Date.now(),
    timestamp: getFormattedTimestamp(),
  }];
};

const STYLES: StyleConfig = {
  container: 'flex flex-col flex-1 min-w-0 bg-slate-50 text-slate-800 font-sans',
  header: 'flex items-center justify-between bg-white/80 backdrop-blur-sm p-3 sm:p-4 text-slate-900 shadow-sm border-b border-slate-200',
  chatContainer: 'flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 sm:space-y-4',
  messageUser: 'bg-blue-700 text-white rounded-lg',
  messageAI: 'bg-white text-slate-800 rounded-lg border border-slate-200',
  avatarContainer: 'w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-200 flex items-center justify-center',
  avatarIcon: 'w-5 h-5 sm:w-6 sm:h-6 text-slate-500',
  messageBase: 'p-3 sm:p-4 break-words',
  inputArea: 'bg-white/80 backdrop-blur-sm p-2 sm:p-4 border-t border-slate-200',
  input: 'flex-grow w-full p-3 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder-slate-400',
  button: 'p-3 rounded-full text-blue-700 hover:bg-blue-700/10 transition-colors disabled:opacity-50 disabled:text-slate-400 disabled:bg-transparent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
  fileUploadButton: 'p-3 rounded-full text-blue-700 hover:bg-blue-700/10 transition-colors disabled:opacity-50 disabled:text-slate-400 disabled:bg-transparent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
  filePreview: '',
};

const mapMessagesToHistory = (messages: Message[]): Content[] => {
  const history: Content[] = [];
  const validMessages = messages.filter(
    m => !m.id.startsWith('initial-') && m.text && m.text.trim() !== ''
  );

  for (const msg of validMessages) {
    const role = msg.sender === 'user' ? 'user' : 'model';
    history.push({
      role,
      parts: [{ text: msg.text }],
    });
  }
  return history;
};

// FIX: Separate query functions
const fetchConversations = (): Conversation[] => {
  const saved = localStorage.getItem('chatHistory');
  if (!saved) return [];

  try {
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map(convo => {
        const model = convo.model && Object.keys(MODELS).includes(convo.model) ? convo.model : 'gemini-2.5-pro';
        return {
          ...(convo as Partial<Conversation>),
          id: convo.id || Date.now().toString(),
          messages: convo.messages || [],
          title: convo.title || 'Untitled Chat',
          model,
        };
      });
    }
  } catch (e) {
    console.error("Failed to parse chat history:", e);
    localStorage.removeItem('chatHistory');
  }
  return [];
};

const saveConversations = async (conversations: Conversation[]): Promise<Conversation[]> => {
  if (conversations.length > 0) {
    try {
      // Remove generated images from conversations before saving to prevent quota issues
      const conversationsToSave = conversations.map(convo => ({
        ...convo,
        messages: convo.messages.map(msg => {
          if (msg.generatedImages) {
            // Don't save generated images to localStorage due to size
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { generatedImages, ...msgWithoutImages } = msg;
            return msgWithoutImages;
          }
          return msg;
        })
      }));
      localStorage.setItem('chatHistory', JSON.stringify(conversationsToSave));
    } catch (error) {
      console.error("Failed to save chat history:", error);
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.warn("Storage quota exceeded.");
        throw new Error('Storage quota exceeded. Your chat history could not be saved. Please clear some browser data.');
      }
      throw new Error('Failed to save chat history. Please check your browser settings.');
    }
  } else {
    try {
      localStorage.removeItem('chatHistory');
    } catch (error) {
      console.error("Failed to remove chat history:", error);
      throw new Error('Failed to clear chat history.');
    }
  }
  return conversations;
};

const App: React.FC = () => {
  const queryClient = useQueryClient();

  // FIX: Use proper query configuration
  const { data: conversations = [], isLoading: isLoadingConversations } = useQuery({
    queryKey: conversationKeys.all,
    queryFn: fetchConversations,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false, // Added for stability
  });

  // FIX: Create a dedicated mutation for updating conversations with proper rollback
  const updateConversationsMutation = useMutation({
    mutationKey: ['updateConversations'],
    mutationFn: saveConversations,
    onMutate: async (newConversations, context) => {
      // Cancel any outgoing refetches to prevent overwriting our optimistic update
      // Best Practice: Use context.client instead of closure queryClient
      await context.client.cancelQueries({ queryKey: conversationKeys.all });

      // Snapshot the previous value for potential rollback
      const previousConversations = context.client.getQueryData<Conversation[]>(conversationKeys.all);

      // Optimistically update the cache immediately
      context.client.setQueryData(conversationKeys.all, newConversations);

      // Return context with snapshot for rollback
      return { previousConversations };
    },
    onSuccess: (savedConversations, _variables, _context, context) => {
      // Update cache with the saved data (may include server-side modifications)
      context.client.setQueryData(conversationKeys.all, savedConversations);
    },
    onError: (err, _newConversations, _onMutateResult, context) => {
      // Rollback to previous state on error
      const onMutateResult = _onMutateResult as { previousConversations?: Conversation[] } | undefined;
      if (onMutateResult?.previousConversations) {
        context.client.setQueryData(conversationKeys.all, onMutateResult.previousConversations);
      }
      console.error("Failed to save conversations:", err);
      // Show user-friendly error message
      const errorMessage = err instanceof Error ? err.message : 'Failed to save chat history.';
      setStorageError(errorMessage);
      setTimeout(() => setStorageError(null), 5000);
    },
    // No onSettled needed - we don't invalidate for localStorage operations
  });

  // FIX: Use direct cache updates for streaming (too frequent for mutation system)
  // Streaming happens multiple times per second, so we use direct setQueryData
  // for performance. The sendMessage mutation handles proper lifecycle management.
  const updateStreamingMessage = useCallback((
    conversationId: string,
    chunk: { text?: string; thought?: string; sources?: Array<{ uri: string; title: string; placeId?: string }>; executableCode?: string; codeExecutionResult?: string; codeExecutionImages?: Array<{ base64: string; mimeType: string }>; generatedImages?: Array<{ base64: string; mimeType: string }> }
  ) => {
    const currentConversations = queryClient.getQueryData<Conversation[]>(conversationKeys.all) || [];
    const updatedConversations = currentConversations.map(convo => {
      if (convo.id === conversationId) {
        const updatedMessages = convo.messages.map(msg => {
          if (msg.id.endsWith('-ai') && !msg.timestamp) {
            const updatedMsg = { ...msg };
            if (chunk.text) updatedMsg.text += chunk.text;
            if (chunk.thought) {
              if (!updatedMsg.thoughts) updatedMsg.thoughts = '';
              updatedMsg.thoughts += chunk.thought;
            }
            if (chunk.executableCode) {
              updatedMsg.executableCode = (updatedMsg.executableCode || '') + chunk.executableCode;
            }
            if (chunk.codeExecutionResult) {
              updatedMsg.codeExecutionResult = (updatedMsg.codeExecutionResult || '') + chunk.codeExecutionResult;
            }
            if (chunk.codeExecutionImages) {
              updatedMsg.codeExecutionImages = chunk.codeExecutionImages;
            }
            if (chunk.sources) {
              const existingSources = updatedMsg.sources || [];
              const newSources = chunk.sources.filter(sNew => !existingSources.some(sOld => sOld.uri === sNew.uri));
              updatedMsg.sources = [...existingSources, ...newSources];
            }
            if (chunk.generatedImages) {
              updatedMsg.generatedImages = chunk.generatedImages;
            }
            return updatedMsg;
          }
          return msg;
        });
        return { ...convo, messages: updatedMessages };
      }
      return convo;
    });
    queryClient.setQueryData(conversationKeys.all, updatedConversations);
  }, [queryClient]);

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelId>('gemini-2.5-pro');
  const [activeModel, setActiveModel] = useState<ModelId>('gemini-2.5-pro');
  const [isProSession, setIsProSession] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<string>('16:9');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const [apiKey, setApiKey] = useState<string | null>(() => localStorage.getItem('GEMINI_API_KEY'));
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(apiKey || '');
  const [isVerifyingApiKey, setIsVerifyingApiKey] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [renamingConversationId, setRenamingConversationId] = useState<string | null>(null);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [storageError, setStorageError] = useState<string | null>(null);

  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const activeStreamingRef = useRef<string | null>(null);

  const conversationsMap = useMemo(
    () => new Map(conversations.map(c => [c.id, c])),
    [conversations]
  );

  const activeConversation = useMemo(
    () => conversationsMap.get(activeConversationId || ''),
    [conversationsMap, activeConversationId]
  );

  const messages = useMemo(
    () => activeConversation?.messages || [],
    [activeConversation]
  );

  const chatHistory = useMemo(
    () => mapMessagesToHistory(messages),
    [messages]
  );

  const showSuggestions = useMemo(
    () => messages.filter(m => m.sender === 'user').length === 0,
    [messages]
  );

  const rowVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => chatContainerRef.current,
    estimateSize: useCallback((index: number) => {
      const msg = messages[index];
      if (!msg) return 200;

      // Better estimates based on message characteristics
      if (msg.sender === 'ai') {
        if (msg.thoughts && msg.thoughts.length > 0) return 450; // AI with thinking process
        if (msg.text.length > 500) return 400; // Long AI responses
        if (msg.sources && msg.sources.length > 0) return 350; // AI with sources
        return 250; // Standard AI response
      }

      // User messages
      if (msg.files && msg.files.length > 0) return 300; // Messages with file attachments
      if (msg.text.length > 200) return 200; // Longer user messages
      return 150; // Short user messages
    }, [messages]),
    overscan: 5,
    gap: 12, // Match the CSS space-y-3 (0.75rem = 12px on mobile)
    measureElement: typeof window !== 'undefined' &&
      navigator.userAgent.indexOf('Firefox') === -1
      ? (element) => element?.getBoundingClientRect().height
      : undefined,
  });

  const handleNewChat = useCallback(() => {
    if (!apiKey) {
      setShowApiKeyModal(true);
      return;
    }

    const newId = Date.now().toString();
    const newConversation: Conversation = {
      id: newId,
      title: 'New Chat',
      messages: createInitialMessages(!!apiKey),
      model: selectedModel,
    };

    const updatedConversations = [newConversation, ...conversations];
    // Fire-and-forget is OK here since we're creating initial state
    // and user is immediately interacting with the new conversation
    updateConversationsMutation.mutate(updatedConversations);
    setActiveConversationId(newId);
    setIsProSession(false);
    startNewChatSession(selectedModel);
    setActiveModel(selectedModel);

    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, [apiKey, selectedModel, conversations, updateConversationsMutation]);

  useEffect(() => {
    if (showApiKeyModal) {
      modalRef.current?.querySelector<HTMLElement>('input, button')?.focus();

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && !isVerifyingApiKey) {
          setShowApiKeyModal(false);
        } else if (e.key === 'Tab') {
          const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>('input, button:not([disabled])');
          if (!focusableElements || focusableElements.length === 0) return;

          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              lastElement.focus();
              e.preventDefault();
            }
          } else {
            if (document.activeElement === lastElement) {
              firstElement.focus();
              e.preventDefault();
            }
          }
        }
      };

      const modalElement = modalRef.current;
      const settingsButton = settingsButtonRef.current;
      modalElement?.addEventListener('keydown', handleKeyDown);

      return () => {
        modalElement?.removeEventListener('keydown', handleKeyDown);
        settingsButton?.focus();
      };
    }
  }, [showApiKeyModal, isVerifyingApiKey]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [isInitialized, setIsInitialized] = useState(false);
  const [isVerifyingStartupKey, setIsVerifyingStartupKey] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      if (isLoadingConversations) {
        return;
      }

      if (isInitialized) {
        return;
      }

      if (!apiKey) {
        // Note: API key modal no longer auto-shows on first load
        return;
      }

      // FIX: Verify stored API key is still valid before initializing
      setIsVerifyingStartupKey(true);
      const isValidKey = await verifyApiKey(apiKey);
      setIsVerifyingStartupKey(false);

      if (!isValidKey) {
        // Stored API key is invalid (revoked, expired, or wrong)
        console.warn("Stored API key is no longer valid");
        localStorage.removeItem('GEMINI_API_KEY');
        setApiKey(null);
        setShowApiKeyModal(true);
        setApiKeyError('Your stored license key is no longer valid. Please enter a new one.');
        return;
      }

      // FIX: Now properly awaits initialization to ensure cache cleanup completes
      await initializeAiClient(apiKey);

      if (conversations.length > 0) {
        const lastActiveConvo = conversations[0];
        setActiveConversationId(lastActiveConvo.id);
        setSelectedModel(lastActiveConvo.model as ModelId);
        await startNewChatSession(lastActiveConvo.model, undefined, mapMessagesToHistory(lastActiveConvo.messages));
        setActiveModel(lastActiveConvo.model as ModelId);
      } else {
        handleNewChat();
      }

      setIsInitialized(true);
    };

    initializeApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, isLoadingConversations, isInitialized]);

  useEffect(() => {
    if (messages.length > 0) {
      // Use requestAnimationFrame for better timing with dynamic measurements
      // Note: 'auto' behavior is used because 'smooth' is not fully supported with dynamic sizing
      const rafId = requestAnimationFrame(() => {
        try {
          rowVirtualizer.scrollToIndex(messages.length - 1, {
            align: 'end',
            behavior: 'auto',
          });
        } catch (error) {
          console.error("Error scrolling to message:", error);
        }
      });

      return () => cancelAnimationFrame(rafId);
    }
  }, [messages.length, rowVirtualizer]);

  useEffect(() => {
    return () => {
      if (generateTitleMutation.isPending) {
        setRenamingConversationId(null);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // FIX: Improved sendMessage mutation with proper streaming handling and optimistic updates
  const sendMessageMutation = useMutation({
    mutationKey: ['sendMessage', activeConversationId],
    mutationFn: async ({ text, files, targetConversationId }: {
      text: string;
      files: File[];
      userMessage: Message;
      aiMessagePlaceholder: Message;
      targetConversationId: string;
    }) => {
      // FIX: Validate conversation ID at the start of mutation
      const currentConvo = conversationsMap.get(targetConversationId);
      if (!currentConvo) throw new Error("No active conversation");

      // FIX: Early check - abort if another stream is already active
      if (activeStreamingRef.current !== null && activeStreamingRef.current !== targetConversationId) {
        throw new Error("Another conversation is currently streaming");
      }

      const urlRegex = /https?:\/\/[^\s/$.?#].[^\s]*/gi;
      const hasUrl = urlRegex.test(text);
      const requiresProModelNow = files.length > 0 || hasUrl;
      const shouldBeProSession = isProSession || requiresProModelNow;
      if (requiresProModelNow && !isProSession) setIsProSession(true);

      // Check if we're using the image generation model
      const isImageModel = selectedModel === 'gemini-2.5-flash-image';
      const targetModel = isImageModel ? 'gemini-2.5-flash-image' : (shouldBeProSession ? 'gemini-2.5-pro' : selectedModel);

      // FIX: Wait for model switch to complete before sending message
      if (!isImageModel && activeModel !== targetModel) {
        await startNewChatSession(targetModel, undefined, chatHistory);
        setActiveModel(targetModel);
      }

      // FIX: Capture the target conversation ID to prevent race conditions
      const streamingConversationId = targetConversationId;

      // Handle image generation differently
      if (isImageModel) {
        const imageResult = await generateImage(
          text,
          files,
          (status: string) => {
            if (activeStreamingRef.current === streamingConversationId) {
              updateStreamingMessage(streamingConversationId, { thought: status });
            }
          },
          aspectRatio
        );

        // Add generated images and completion text to the conversation
        if (imageResult.images.length > 0) {
          updateStreamingMessage(streamingConversationId, {
            generatedImages: imageResult.images,
            text: `Generated ${imageResult.images.length} image${imageResult.images.length > 1 ? 's' : ''} successfully.`
          });
        } else {
          updateStreamingMessage(streamingConversationId, {
            text: 'Image generation completed but no images were returned. Please try again with a different prompt.'
          });
        }

        return { result: { usageMetadata: imageResult.usageMetadata }, conversationId: streamingConversationId };
      }

      // FIX: Use the streaming callback for updates with conversation ID validation
      const result = await streamGeminiResponse(
        text,
        files,
        (chunk) => {
          // FIX: Double-check both the ref AND the target conversation ID
          if (activeStreamingRef.current === streamingConversationId) {
            updateStreamingMessage(streamingConversationId, chunk);
          }
        },
        (status: string) => {
          // FIX: Double-check both the ref AND the target conversation ID
          if (activeStreamingRef.current === streamingConversationId) {
            updateStreamingMessage(streamingConversationId, { thought: status });
          }
        }
      );

      return { result, conversationId: streamingConversationId };
    },
    onMutate: async ({ userMessage, aiMessagePlaceholder }, context) => {
      // Best Practice: Use context.client instead of closure queryClient
      await context.client.cancelQueries({ queryKey: conversationKeys.all });

      const previousConversations = context.client.getQueryData<Conversation[]>(conversationKeys.all);
      const conversationId = activeConversationId;

      if (!conversationId || !previousConversations) {
        return { startTime: performance.now(), conversationId, previousConversations };
      }

      // FIX: Optimistically add user message and AI placeholder
      const currentConvoIndex = previousConversations.findIndex(c => c.id === conversationId);
      if (currentConvoIndex === -1) {
        return { startTime: performance.now(), conversationId, previousConversations };
      }

      const newConversations = [...previousConversations];
      const convoToUpdate = { ...newConversations[currentConvoIndex] };

      const isInitialState = convoToUpdate.messages.length > 0 && convoToUpdate.messages[0].id.startsWith('initial');
      const newMessages = isInitialState
        ? [userMessage, aiMessagePlaceholder]
        : [...convoToUpdate.messages, userMessage, aiMessagePlaceholder];

      newConversations[currentConvoIndex] = { ...convoToUpdate, messages: newMessages };
      const updatedItem = newConversations.splice(currentConvoIndex, 1)[0];
      newConversations.unshift(updatedItem);

      context.client.setQueryData(conversationKeys.all, newConversations);

      return { startTime: performance.now(), conversationId, previousConversations };
    },
    onSuccess: async ({ result, conversationId: mutationConversationId }, _variables, _onMutateResult, context) => {
      // FIX: Update with usage metadata and finalize the message
      // FIX: Validate that we're still on the same conversation to prevent race conditions
      // Best Practice: Use context.client instead of closure queryClient
      if (_onMutateResult?.conversationId && result.usageMetadata && mutationConversationId === _onMutateResult.conversationId) {
        const currentConversations = context.client.getQueryData<Conversation[]>(conversationKeys.all) || [];
        const updatedConversations = currentConversations.map(convo =>
          convo.id === _onMutateResult.conversationId ? {
            ...convo,
            messages: convo.messages.map(msg =>
              msg.id.endsWith('-ai') && !msg.timestamp ? {
                ...msg,
                usageMetadata: result.usageMetadata,
                thinkingTime: performance.now() - (_onMutateResult?.startTime || performance.now()),
                timestamp: getFormattedTimestamp()
              } : msg
            )
          } : convo
        );

        // FIX: Wait for the save mutation to complete before finalizing
        await updateConversationsMutation.mutateAsync(updatedConversations);

        // Force remeasurement after streaming completes for accurate sizing
        requestAnimationFrame(() => {
          rowVirtualizer.measure();
        });
      }
    },
    onError: async (error, _variables, _onMutateResult, context) => {
      console.error(error);

      // Rollback optimistic update using context.client
      const onMutateResult = _onMutateResult as { previousConversations?: Conversation[]; conversationId?: string } | undefined;
      if (onMutateResult?.previousConversations) {
        context.client.setQueryData(conversationKeys.all, onMutateResult.previousConversations);
      }

      let errorMessage = 'Sorry, I encountered an unexpected error. Please try again.';
      if (error instanceof Error && (error.message.includes('API_KEY_INVALID') || error.message.includes('API key not valid'))) {
        errorMessage = 'The License Key you provided is not valid. Please go to settings to update it.';
      }

      if (onMutateResult?.conversationId) {
        const currentConversations = context.client.getQueryData<Conversation[]>(conversationKeys.all) || [];
        const updatedConversations = currentConversations.map(convo =>
          convo.id === onMutateResult.conversationId ? {
            ...convo,
            messages: convo.messages.map(msg =>
              msg.id.endsWith('-ai') && !msg.timestamp ? {
                ...msg,
                thoughts: '',
                text: errorMessage,
                timestamp: getFormattedTimestamp()
              } : msg
            )
          } : convo
        );

        // FIX: Wait for error state to be saved
        await updateConversationsMutation.mutateAsync(updatedConversations).catch((saveErr) => {
          console.error("Failed to save error state:", saveErr);
          // Don't throw - we already have an error to display
        });
      }
    },
    onSettled: (_data, _error, _variables, _onMutateResult) => {
      if (_onMutateResult?.conversationId && activeStreamingRef.current === _onMutateResult.conversationId) {
        activeStreamingRef.current = null;
      }
      setIsLoading(false);
    }
  });

  const handleSendMessage = async (text: string, files: File[] = []) => {
    if (!apiKey) {
      setShowApiKeyModal(true);
      return;
    }

    const { valid: validFiles, errors: newFileErrors } = validateFiles(files);

    if (newFileErrors.length > 0) {
      setFileErrors(newFileErrors);
      setTimeout(() => setFileErrors([]), 5000);
      return;
    }

    setFileErrors([]);

    const currentConvo = conversationsMap.get(activeConversationId || '');
    if (!currentConvo) return;

    // FIX: Capture the current conversation ID to prevent race conditions
    const targetConversationId = activeConversationId;
    if (!targetConversationId) return;

    // FIX: Prevent sending messages if another conversation is already streaming
    if (activeStreamingRef.current !== null && activeStreamingRef.current !== targetConversationId) {
      setFileErrors(['Please wait for the current message to finish before sending another.']);
      setTimeout(() => setFileErrors([]), 5000);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: getFormattedTimestamp()
    };

    if (validFiles.length > 0) {
      userMessage.files = validFiles.map(file => ({
        name: file.name,
        mimeType: file.type,
        base64: '',
      }));
    }

    const aiMessagePlaceholder: Message = {
      id: Date.now().toString() + '-ai',
      sender: 'ai',
      text: '',
      thoughts: '',
      timestamp: '',
    };

    const isFirstUserMessage = currentConvo.messages.filter(m => m.sender === 'user').length === 0;

    // Handle title generation for first message
    if (isFirstUserMessage && (text.trim() || validFiles.length > 0)) {
      if (text.trim()) {
        generateChatTitleMutation.mutate({ text, conversationId: targetConversationId });
      } else {
        const updatedWithTitle = conversations.map(c =>
          c.id === targetConversationId ? { ...c, title: "Chat with Files" } : c
        );
        // Fire-and-forget is OK here since it's just a title update
        updateConversationsMutation.mutate(updatedWithTitle);
      }
    }

    setIsLoading(true);
    // FIX: Set the streaming ref AFTER all validation
    activeStreamingRef.current = targetConversationId;

    // FIX: Pass the target conversation ID to mutation for validation
    sendMessageMutation.mutate({
      text,
      files: validFiles,
      userMessage,
      aiMessagePlaceholder,
      targetConversationId,
    });
  };

  const handleSaveApiKey = async () => {
    if (!tempApiKey.trim() || isVerifyingApiKey) return;

    setIsVerifyingApiKey(true);
    setApiKeyError(null);
    verifyApiKeyMutation.mutate(tempApiKey.trim());
  };

  const handleSelectConversation = useCallback((id: string) => {
    const conversationToSelect = conversationsMap.get(id);
    if (conversationToSelect) {
      setActiveConversationId(id);
      setSelectedModel(conversationToSelect.model as ModelId);
      startNewChatSession(conversationToSelect.model, undefined, mapMessagesToHistory(conversationToSelect.messages));
      setActiveModel(conversationToSelect.model as ModelId);
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      }
    }
  }, [conversationsMap]);

  const handleDeleteConversation = useCallback(async (id: string) => {
    // Find the conversation to get its title for the confirmation message
    const conversationToDelete = conversations.find(c => c.id === id);
    const conversationTitle = conversationToDelete?.title || 'this conversation';

    // Show confirmation dialog
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${conversationTitle}"?\n\nThis action cannot be undone.`
    );

    // If user cancels, exit early
    if (!confirmDelete) {
      return;
    }

    const updatedConversations = conversations.filter(c => c.id !== id);
    // Fire-and-forget is OK here - deletion is a one-way operation
    // and the optimistic update will handle immediate UI feedback
    updateConversationsMutation.mutate(updatedConversations);

    if (activeConversationId === id) {
      if (updatedConversations.length > 0) {
        const nextActiveConvo = updatedConversations[0];
        setActiveConversationId(nextActiveConvo.id);
        setSelectedModel(nextActiveConvo.model as ModelId);
        await startNewChatSession(nextActiveConvo.model, undefined, mapMessagesToHistory(nextActiveConvo.messages));
        setActiveModel(nextActiveConvo.model as ModelId);
      } else {
        handleNewChat();
      }
    }
  }, [conversations, activeConversationId, handleNewChat, updateConversationsMutation]);

  const generateTitleMutation = useMutation({
    mutationKey: ['generateTitle'],
    mutationFn: async (id: string) => {
      const conversation = conversationsMap.get(id);
      if (!conversation || conversation.messages.length === 0) {
        throw new Error("Conversation not found or is empty");
      }
      const newTitle = await generateTitleFromHistory(conversation.messages);
      return { id, newTitle };
    },
    onSuccess: async ({ id, newTitle }) => {
      const updatedConversations = conversations.map(c =>
        c.id === id ? { ...c, title: newTitle } : c
      );
      // FIX: Wait for the title regeneration to complete
      await updateConversationsMutation.mutateAsync(updatedConversations).catch((err) => {
        console.error("Failed to save regenerated title:", err);
      });
    },
    onError: (error) => {
      console.error("Failed to regenerate title:", error);
    },
    onSettled: () => {
      setRenamingConversationId(null);
    }
  });

  const handleGenerateTitle = useCallback(async (id: string) => {
    if (renamingConversationId) return;
    setRenamingConversationId(id);
    generateTitleMutation.mutate(id);
  }, [renamingConversationId, generateTitleMutation]);

  const handleModelChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newModel = e.target.value as ModelId;
    setSelectedModel(newModel);

    const currentConvo = conversationsMap.get(activeConversationId || '');

    if (currentConvo) {
      const updatedConversations = conversations.map(c =>
        c.id === activeConversationId ? { ...c, model: newModel } : c
      );
      // Fire-and-forget is OK here - model change is instant UI operation
      updateConversationsMutation.mutate(updatedConversations);

      const isInitialPlaceholder =
        currentConvo.messages.length > 0 &&
        currentConvo.messages[0].id.startsWith('initial-');

      startNewChatSession(newModel, undefined, isInitialPlaceholder ? [] : chatHistory);
      setActiveModel(newModel);
    } else {
      handleNewChat();
    }
  }, [conversationsMap, activeConversationId, chatHistory, handleNewChat, conversations, updateConversationsMutation]);

  const isInputDisabled = isLoading || !apiKey;

  const verifyApiKeyMutation = useMutation({
    mutationKey: ['verifyApiKey'],
    mutationFn: async (apiKeyToVerify: string) => {
      const isValid = await verifyApiKey(apiKeyToVerify);
      if (!isValid) {
        throw new Error('Invalid API Key');
      }
      return apiKeyToVerify;
    },
    onSuccess: (verifiedApiKey) => {
      localStorage.setItem('GEMINI_API_KEY', verifiedApiKey);
      setApiKey(verifiedApiKey);
      setShowApiKeyModal(false);
      setApiKeyError(null);
    },
    onError: () => {
      setApiKeyError('The provided License Key is not valid. Please check it and try again.');
    },
    onSettled: () => {
      setIsVerifyingApiKey(false);
    },
  });

  const generateChatTitleMutation = useMutation({
    mutationKey: ['generateChatTitle'],
    mutationFn: ({ text }: { text: string; conversationId: string | null }) =>
      generateChatTitle(text),
    onSuccess: async (title, variables) => {
      const updatedConversations = conversations.map(c =>
        c.id === variables.conversationId ? { ...c, title } : c
      );
      // FIX: Wait for the title save to complete
      await updateConversationsMutation.mutateAsync(updatedConversations).catch((err) => {
        console.error("Failed to save generated title:", err);
      });
    },
    onError: (err) => {
      console.error("Failed to generate title:", err);
    }
  });

  return (
    <div className="flex h-screen bg-slate-100 text-slate-800 font-sans relative">
      {storageError && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
          <div className="bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">{storageError}</span>
            <button
              onClick={() => setStorageError(null)}
              className="ml-2 hover:bg-red-600 rounded-full p-1 transition-colors"
              aria-label="Dismiss error"
            >
              <Icon name="close" className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      {showApiKeyModal && (
        <div className="absolute inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => !isVerifyingApiKey && setShowApiKeyModal(false)}>
          <div
            ref={modalRef}
            className="relative bg-white rounded-lg shadow-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            aria-describedby="modal-description"
          >
            <button onClick={() => !isVerifyingApiKey && setShowApiKeyModal(false)} className="absolute top-3 right-3 p-1 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Close settings" disabled={isVerifyingApiKey}>
              <Icon name="close" className="w-5 h-5" />
            </button>
            <h2 id="modal-title" className="text-xl font-bold mb-2 text-slate-800">Enter Your License Key</h2>
            <p id="modal-description" className="text-sm text-slate-600 mb-4">To use this app, please enter your license key. Your key is stored only in your browser's local storage.</p>
            <div>
              <label htmlFor="apiKeyInput" className="sr-only">Enter Your License Key</label>
              <input
                id="apiKeyInput"
                type="password"
                value={tempApiKey}
                onChange={(e) => {
                  setTempApiKey(e.target.value);
                  setApiKeyError(null);
                }}
                placeholder="Enter your license key here"
                className="w-full p-2 bg-white rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isVerifyingApiKey) {
                    e.preventDefault();
                    handleSaveApiKey();
                  }
                }}
                disabled={isVerifyingApiKey}
              />
              {apiKeyError && <p role="alert" className="text-red-500 text-sm mt-2">{apiKeyError}</p>}
            </div>
            <div className="flex justify-end items-center mt-4">
              <button
                onClick={handleSaveApiKey}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-300/50 disabled:cursor-wait transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-700 w-32 text-center"
                disabled={!tempApiKey.trim() || isVerifyingApiKey}
              >
                {isVerifyingApiKey ? (
                  <span className="flex items-center justify-center gap-2">
                    <Icon name="loading" className="w-4 h-4" />
                    Verifying...
                  </span>
                ) : (
                  'Save & Start'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      <ChatHistory
        conversations={conversations}
        activeConversationId={activeConversationId}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        onGenerateTitle={handleGenerateTitle}
        renamingConversationId={renamingConversationId}
        className={`absolute md:relative z-30 h-full w-64 flex-shrink-0 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
        isLoading={isLoading}
      />
      {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/30 z-20 md:hidden" />}
      <div className={`${STYLES.container} md:max-w-4xl md:mx-auto md:border-x md:border-slate-200`}>
        <header className={STYLES.header}>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-full text-slate-500 hover:bg-slate-100 md:hidden" aria-label="Toggle sidebar">
              <Icon name="menu" className="w-6 h-6" />
            </button>
            <select value={selectedModel} onChange={handleModelChange} className="bg-white border border-slate-300 rounded-md py-1.5 px-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Select AI Model" title={MODELS[selectedModel].description}>
              {Object.entries(MODELS).map(([id, { name, description }]) => (<option key={id} value={id} title={description}>{name}</option>))}
            </select>
          </div>
          <h1 className="text-base sm:text-lg md:text-xl font-bold flex-1 text-center px-2 truncate">Desmond</h1>
          <div className="flex justify-end items-center gap-1 sm:gap-2">
            <button ref={settingsButtonRef} onClick={() => setShowApiKeyModal(true)} className="p-2 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500" aria-label="API Key Settings" title="API Key Settings">
              <Icon name="settings" className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </header>
        <div
          ref={chatContainerRef}
          className={STYLES.chatContainer}
          aria-live="polite"
          style={{
            overflow: 'auto',
          }}
        >
          {!apiKey ? (
            <div className="text-center p-4 text-slate-500">
              Please set your License Key in{' '}
              <button
                onClick={() => setShowApiKeyModal(true)}
                className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline"
              >
                <Icon name="settings" className="w-4 h-4" /> settings
              </button>{' '}
              to begin.
            </div>
          ) : isVerifyingStartupKey ? (
            <div className="flex flex-col items-center justify-center p-8 text-slate-500">
              <Icon name="loading" className="w-8 h-8 mb-3" />
              <p className="text-sm">Verifying your license key...</p>
            </div>
          ) : (
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${rowVirtualizer.getVirtualItems()[0]?.start ?? 0}px)`,
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const msg = messages[virtualRow.index];
                  return (
                    <div
                      key={msg.id}
                      data-index={virtualRow.index}
                      ref={rowVirtualizer.measureElement}
                      className="mb-3 sm:mb-4"
                    >
                      <ChatMessage
                        message={msg}
                        styles={STYLES}
                        onSuggestionClick={(suggestion) => handleSendMessage(suggestion)}
                        showSuggestions={showSuggestions}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isInputDisabled}
          styles={STYLES}
          placeholder={apiKey ? 'Type a message or upload a pdf file...' : 'Please set your license key in settings to begin.'}
          fileErrors={fileErrors}
          isImageModel={selectedModel === 'gemini-2.5-flash-image'}
          aspectRatio={aspectRatio}
          onAspectRatioChange={setAspectRatio}
        />
      </div>
    </div>
  );
};

export default App;