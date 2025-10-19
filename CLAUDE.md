# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Desmond is a React-based AI chat application powered by Google's Gemini API. It's a sophisticated chat interface with support for multiple AI models, file uploads (PDFs and images), conversation management, and advanced features like code execution, image generation, and real-time web grounding.

## Development Commands

### Essential Commands
- `npm run dev` - Start development server with HMR
- `npm run build` - Type-check with TypeScript and build for production
- `npm run lint` - Run ESLint for code quality checks
- `npm run preview` - Preview production build locally

### Build Notes
- Uses **rolldown-vite** (not standard Vite) as specified in package.json overrides
- TypeScript compiler runs before build (`tsc -b`)
- Build output goes to `dist/` directory (gitignored)

## Architecture Overview

### State Management Strategy
The app uses **TanStack Query (React Query)** for all state management, with a clear separation between:
- **Query operations** (`useQuery`): Reading conversation data from localStorage
- **Mutation operations** (`useMutation`): Writing/updating conversation data with optimistic updates
- **Direct cache updates**: Used only for high-frequency streaming updates (performance optimization)

Key mutations defined in `App.tsx`:
- `updateConversationsMutation` - Saves conversations to localStorage with optimistic updates and rollback on error
- `sendMessageMutation` - Handles message sending, streaming, and AI responses
- `generateTitleMutation` - Auto-generates conversation titles
- `verifyApiKeyMutation` - Validates user's Gemini API key

### Gemini Integration (`src/services/geminiService.ts`)
Core service managing all Google Gemini API interactions:
- **Client initialization** with API key verification
- **Session management** with support for context caching (for large PDFs)
- **Streaming responses** with thoughts, code execution, web grounding, and sources
- **Image generation** using `gemini-2.5-flash-image` model
- **Prompt optimization** and title generation utilities

Critical: The service maintains a singleton AI client instance and manages active cache cleanup to prevent memory leaks.

### Model Selection
Five models available (defined in `App.tsx` MODELS constant):
- `gemini-2.5-pro` - Cognitive Core (complex reasoning, large documents)
- `gemini-2.5-flash` - Dynamic Engine (general purpose)
- `gemini-2.5-flash-lite` - Rapid Response (speed optimized)
- `gemini-2.5-flash-lite-maps` - Maps Navigator (location-aware with Google Maps grounding)
- `gemini-2.5-flash-image` - Image Generator (creates images from text prompts)

**Important**: When switching models, a new chat session is created with the conversation history transferred to the new model.

### Data Persistence
- **localStorage** stores all conversation data (`chatHistory` key)
- **API key** stored separately in localStorage (`GEMINI_API_KEY`)
- **Generated images excluded** from localStorage to prevent quota exceeded errors
- **Error handling** for quota exceeded with user-friendly messages

### Virtual Scrolling
Uses `@tanstack/react-virtual` for efficient rendering of long message lists:
- Dynamic size estimation based on message characteristics (AI thoughts, sources, file attachments)
- Auto-scroll to bottom on new messages
- Measurement-based sizing for accurate scroll positions

### File Upload System
File validation centralized in `src/utils/fileValidation.ts`:
- **Max file size**: 50MB
- **Allowed types**: Images and PDFs only
- **Large files** (>19MB): Uploaded via Files API with polling for processing status
- **Small files**: Embedded as inline base64 data
- **Single large PDF**: Creates context cache for token optimization

### Components Structure
- **App.tsx** - Main container with state management, mutations, and business logic
- **ChatMessage.tsx** - Renders individual messages with markdown, LaTeX, code highlighting, sources
- **ChatInput.tsx** - Input field with file upload, prompt optimization, aspect ratio selection
- **ChatHistory.tsx** - Sidebar with conversation list, new chat, delete, rename
- **Icons.tsx** - SVG icon components library

## Key Technical Details

### Markdown Rendering
Messages use `react-markdown` with plugins:
- `remark-gfm` - GitHub Flavored Markdown support
- `remark-math` + `rehype-katex` - LaTeX math rendering
- `react-syntax-highlighter` - Code syntax highlighting with Prism
- `dompurify` - Sanitizes HTML to prevent XSS

### Code Execution & Visualizations
Gemini's code execution environment supports:
- Python with numpy, pandas, scipy, scikit-learn, matplotlib
- Matplotlib graphs rendered as inline images in chat
- Base64 encoded images returned in `codeExecutionImages` field

### Streaming Implementation
The `streamGeminiResponse` function handles:
1. File processing and upload (with status callbacks)
2. Streaming chunks with thoughts, text, sources, code execution
3. Deduplication of sources (web grounding and Google Maps)
4. Usage metadata tracking for token counts

**Race condition prevention**: Uses `activeStreamingRef` to ensure only one conversation streams at a time.

### TypeScript Configuration
- **Strict mode** enabled with additional linting rules
- **Bundler module resolution** for modern tooling
- **verbatimModuleSyntax** and **erasableSyntaxOnly** for performance
- **No emit** - Vite handles bundling

### Styling
- **Tailwind CSS v4** with Vite plugin (`@tailwindcss/vite`)
- **Typography plugin** for markdown content styling
- Responsive design with mobile-first breakpoints
- Dark/light theme optimized for readability

## Important Patterns

### Optimistic Updates
When saving conversations:
1. Cancel in-flight queries
2. Snapshot previous state
3. Optimistically update cache
4. Rollback on error with user notification

### Context Cleanup
Always clean up Gemini context caches when:
- Switching API keys (in `initializeAiClient`)
- Starting new sessions with different models
- Deleting conversations

### Error Boundaries
- API key validation on startup with retry prompt
- File validation before upload with clear error messages
- Storage quota exceeded handling with user guidance
- Stream interruption handling with error states

## Model-Specific Behavior

### Maps Model
- Uses `googleMaps` tool instead of `googleSearch`
- Provides location-aware responses with place IDs
- Specialized system instruction for map queries

### Image Model
- Takes aspect ratio parameter (`16:9`, etc.)
- Returns base64 encoded images
- Supports both generation and editing (with input images)
- Images displayed inline but NOT saved to localStorage

## Common Pitfalls to Avoid

1. **Don't batch todo completions** - Mark tasks complete immediately after finishing
2. **Don't save generated images to localStorage** - They're excluded to prevent quota issues
3. **Don't allow concurrent streaming** - Check `activeStreamingRef` before sending messages
4. **Don't forget cache cleanup** - Memory leaks occur if caches aren't properly deleted
5. **Always use context.client** in mutations - Not the closure queryClient for proper lifecycle management
