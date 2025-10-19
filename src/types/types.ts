// FIX: Provide type definitions for Message and StyleConfig used across the application.
export interface UsageMetadata {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
    thoughtsTokenCount?: number;
    cachedContentTokenCount?: number;
    toolUsePromptTokenCount?: number;
    promptTokensDetails?: Array<{ modality?: string; tokenCount?: number }>;
    toolUsePromptTokensDetails?: Array<{ modality?: string; tokenCount?: number }>;
}

export interface Message {
    id: string;
    sender: 'user' | 'ai';
    text: string;
    timestamp: string;
    thoughts?: string;
    thinkingTime?: number;
    imagePreviews?: string[];
    files?: Array<{
        base64: string;
        mimeType: string;
        name: string;
    }>;
    sources?: Array<{
        uri: string;
        title: string;
        placeId?: string;
    }>;
    suggestions?: string[];
    fullText?: string; // Extended version of the initial message
    usageMetadata?: UsageMetadata;
    executableCode?: string;
    codeExecutionResult?: string;
    codeExecutionImages?: Array<{
        base64: string;
        mimeType: string;
    }>;
    generatedImages?: Array<{
        base64: string;
        mimeType: string;
    }>;
}

export interface StyleConfig {
    container?: string;
    header?: string;
    headerButton?: string;
    chatContainer?: string;
    messageUser?: string;
    messageAI?: string;
    avatarContainer?: string;
    avatarIcon?: string;
    messageBase?: string;
    inputArea?: string;
    input?: string;
    button?: string;
    fileUploadButton?: string;
    filePreview?: string;
}

export type ModelId = 'gemini-2.5-pro' | 'gemini-2.5-flash' | 'gemini-2.5-flash-lite' | 'gemini-2.5-flash-lite-maps' | 'gemini-2.5-flash-image';

export interface Conversation {

    id: string;

    title: string;

    messages: Message[];

    model: ModelId;

}



export interface Content {

    role: string;

    parts: { text: string }[];

}
