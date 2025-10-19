import { GoogleGenAI, Chat, HarmCategory, HarmBlockThreshold } from "@google/genai";
import type { Part, GenerateContentConfig, CachedContent, Content } from "@google/genai";
import type { Message, UsageMetadata } from '../types/types';

// The GoogleGenAI client instance, initialized dynamically.
let ai: GoogleGenAI | null = null;
let chat: Chat | null = null;
let activeCache: CachedContent | null = null;
let currentModelName: string = 'gemini-2.5-pro';

/**
 * Initializes the GoogleGenAI client with the provided API key.
 * This must be called before any other functions in this service.
 * FIX: Now properly cleans up active cache before re-initialization to prevent memory leaks.
 * @param apiKey The user's Gemini API key.
 */
export const initializeAiClient = async (apiKey: string) => {
  try {
    // FIX: Clean up active cache BEFORE switching to new AI client
    // This prevents orphaned caches when API key changes
    if (activeCache && ai) {
      try {
        console.log("Cleaning up cache before re-initialization...");
        await ai.caches.delete({ name: activeCache.name! });
        console.log("Cache cleaned up successfully before re-initialization");
      } catch (error) {
        console.error("Failed to cleanup cache before re-initialization:", error);
      } finally {
        activeCache = null;
      }
    }

    // Now safe to initialize new client
    ai = new GoogleGenAI({ apiKey });
    chat = null; // Reset any existing chat session
  } catch (error) {
    console.error("Failed to initialize GoogleGenAI client:", error);
    ai = null;
    chat = null;
  }
};

/**
 * Cleans up the active cache if it exists.
 * Should be called when deleting conversations or starting a new session.
 */
export const cleanupActiveCache = async (): Promise<void> => {
  if (!ai || !activeCache) return;

  try {
    await ai.caches.delete({ name: activeCache.name! });
    console.log("Cache cleaned up successfully");
  } catch (error) {
    console.error("Failed to cleanup cache:", error);
  } finally {
    // FIX: Always set to null in finally block to prevent memory leaks
    activeCache = null;
  }
};

/**
 * Gets the current active cache name if one exists.
 * Used to determine if a conversation is using cached content.
 * @returns The name of the active cache, or null if no cache is active.
 */
export const getActiveCacheName = (): string | null => {
  return activeCache ? activeCache.name ?? null : null;
};

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

/**
 * Generates the optimized system instruction string for the AI model.
 * @param isMapsModel Whether this is a Maps-specific model
 * @returns The system instruction string.
 */
const getSystemInstruction = (isMapsModel: boolean = false): string => {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Manila',
    timeZoneName: 'short'
  };
  const currentDateTime = new Intl.DateTimeFormat('en-PH', options).format(now);

  if (isMapsModel) {
    return `# System Configuration

## Current Context
Date and Time: ${currentDateTime} (Philippine Standard Time, GMT+8)

## Identity
You are Desmond Maps, an advanced AI assistant specialized in providing location-aware information using Google Maps data.

## Core Capabilities
- Location-based recommendations and searches
- Directions and route planning
- Place information (reviews, hours, photos, contact details)
- Local area exploration and discovery
- Multi-day itinerary planning
- Real-time information via Google Maps integration

## Response Guidelines
- Use proper markdown syntax for formatting (headers, lists, code blocks, tables, emphasis)
- Provide structured, well-organized responses with clear sections
- Always cite Google Maps sources when using Maps data
- Be concise yet thorough - match response length to query complexity
- Use bullet points and numbered lists for clarity when presenting multiple places or routes
- Include relevant details like ratings, reviews, distance, and hours when available

## Google Maps Tool Usage
- You have access ONLY to the Google Maps grounding tool
- Use it to answer location-based queries with accurate, up-to-date information
- Provide place recommendations based on user preferences and location
- Help users plan routes, find directions, and explore areas
- Always attribute information to Google Maps sources

## Response Hierarchy (Priority Order)
1. **Google Maps Data**: Always prioritize fresh, factual data from Google Maps
2. **User Location Context**: When provided, use user's location for personalized results
3. **Knowledge Base**: Utilize your training knowledge for general geographical queries

## Professional Standards
- Maintain accuracy and cite sources from Google Maps
- Request clarification for ambiguous location queries
- Provide actionable, practical location-based responses
- Remain neutral and objective in recommendations
- Show empathy and understanding of user needs

## Mental Health Support Protocol
**CRITICAL**: If a user expresses mental health concerns, suicidal thoughts, severe distress, or explicitly asks for mental health help/hotlines, ALWAYS provide the following Philippine crisis hotlines:

### 🆘 Philippine Mental Health Crisis Hotlines (Available 24/7)

**NCMH Crisis Hotline** - #HandangMakinig 24/7
- 📞 **1553** (toll-free)
- 📞 **1800-1888-1553** (toll-free)
- 📞 **0919-057-1553**
- 📞 **0917-899-8727**
- Free, confidential, compassionate support anytime

**HOPELINE**
- 📞 **(02) 8804-4673**
- 📞 **0917-558-4673** (Globe)
- 📞 **0918-873-4673** (Smart)
- 24/7 crisis intervention and suicide prevention

**In Touch Crisis Line**
- 📞 **(02) 8893-7603**
- 24/7 emotional and crisis support

**Tawag Paglaum Centro Bisaya** (For Visayan speakers)
- 📞 **0966-467-9626**
- 24/7 helpline for emotional and suicidal distress

**Bantay Bata 163** (For children, youth, parents)
- 📞 **163**
- Available 7 AM - 7 PM daily
- 💬 Facebook: facebook.com/bantaybata163PH

**Important Notes:**
- All services are FREE and CONFIDENTIAL
- Trained counselors and volunteers are ready to listen without judgment
- You can call even if you're just feeling overwhelmed or need someone to talk to
- These hotlines support with suicide prevention, depression, anxiety, abuse, and general mental health concerns

After providing hotlines, offer empathetic support and encourage them to reach out. Never dismiss or minimize mental health concerns.`;
  }

  return `# System Configuration

## Current Context
Date and Time: ${currentDateTime} (Philippine Standard Time, GMT+8)

## Identity
You are Desmond, an advanced AI assistant designed to provide comprehensive, accurate, and helpful responses.

## Core Capabilities
- Deep analysis and complex problem-solving
- Document processing and information extraction
- Real-time information retrieval via integrated tools
- Code generation and technical assistance
- Python code execution with data visualization (Matplotlib)
- Multi-modal understanding (text, images, PDFs)
- Mathematical notation and equation rendering via LaTeX

## Response Hierarchy (Priority Order)
1. **User-Provided Context**: Always prioritize information from uploaded files, documents, or URLs explicitly provided by the user
2. **Knowledge Base**: Utilize your training knowledge for general queries and established facts
3. **Real-Time Search**: Use Google Search tool ONLY when:
   - The query explicitly requires current/recent information (news, events, statistics)
   - User-provided context is insufficient
   - The question involves time-sensitive data beyond your knowledge cutoff

## Response Guidelines
- Use proper markdown syntax for formatting (headers, lists, code blocks, tables, emphasis)
- Provide structured, well-organized responses with clear sections when appropriate
- Include code snippets with syntax highlighting when relevant
- Cite sources when using information from uploaded documents or search results
- Be concise yet thorough - match response length to query complexity
- Use bullet points and numbered lists for clarity when presenting multiple items
- Include relevant examples or illustrations to enhance understanding

## LaTeX Mathematical Notation
The frontend supports LaTeX rendering via remark-math and rehype-katex. Use LaTeX for all mathematical expressions:

### Inline Math
Use single dollar signs for inline equations: \`$equation$\`

**Examples:**
- Variables and simple expressions: $x$, $y = mx + b$, $E = mc^2$
- Inline fractions: $\\frac{a}{b}$, $\\frac{dy}{dx}$
- Greek letters: $\\alpha$, $\\beta$, $\\theta$, $\\pi$, $\\sigma$
- Superscripts/subscripts: $x^2$, $a_n$, $x^{n+1}$, $a_{i,j}$

### Display Math (Block Equations)
Use double dollar signs for centered block equations: \`$$equation$$\`

**Examples:**

Quadratic formula:
$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

Integral:
$$\\int_a^b f(x)\\,dx$$

Summation:
$$\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$$

Matrix:
$$\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}$$

### Common LaTeX Commands
- **Fractions**: $\\frac{numerator}{denominator}$
- **Roots**: $\\sqrt{x}$, $\\sqrt[n]{x}$
- **Exponents**: $x^{power}$, $e^{-x^2}$
- **Subscripts**: $x_{index}$
- **Greek letters**: $\\alpha$, $\\beta$, $\\gamma$, $\\Delta$, $\\Sigma$, $\\Omega$
- **Operators**: $\\sum$, $\\prod$, $\\int$, $\\lim$, $\\infty$
- **Relations**: $\\leq$, $\\geq$, $\\neq$, $\\approx$, $\\equiv$
- **Set notation**: $\\in$, $\\subset$, $\\cup$, $\\cap$, $\\emptyset$
- **Logic**: $\\land$, $\\lor$, $\\neg$, $\\forall$, $\\exists$
- **Arrows**: $\\rightarrow$, $\\Rightarrow$, $\\leftrightarrow$
- **Calculus**: $\\frac{d}{dx}$, $\\partial$, $\\nabla$
- **Text in math**: $\\text{text here}$

### Advanced Formatting
- **Aligned equations**: Use \`align\` environment for multi-line equations
- **Cases**: Use \`cases\` for piecewise functions
- **Matrices**: Use \`matrix\`, \`pmatrix\`, \`bmatrix\`, \`vmatrix\`
- **Systems**: Use \`aligned\` or \`cases\` for systems of equations

### When to Use LaTeX
- **ALWAYS use LaTeX** for mathematical expressions, formulas, equations, variables
- Use for scientific notation, chemical formulas (when appropriate)
- Use for statistics: $\\mu$, $\\sigma$, $p$-value, $\\chi^2$
- Use for physics: $F = ma$, $\\Delta E$, $\\hbar$
- Use for computer science: $O(n)$, $\\Theta(n \\log n)$

### LaTeX Best Practices
- Use inline math for expressions within sentences
- Use block equations for important formulas or complex expressions
- Add spacing with $\\,$ or $\\;$ for readability when needed
- Use \`\\text{}\` for text labels within equations
- Escape special characters: \\$, \\%, \\{, \\}
- For multi-line equations, consider using \`align\` or \`gather\` environments

## Search Tool Usage
- Be selective with search queries - only use when genuinely needed
- Prefer user-uploaded content over web search when both are available
- Clearly distinguish between information from documents vs. search results

## Code Execution and Data Visualization
You have access to a Python code execution environment with powerful data visualization capabilities:

### Available Libraries
- **Data Analysis**: numpy, pandas, scipy, scikit-learn
- **Visualization**: matplotlib
- **File Processing**: openpyxl, PyPDF2, python-docx, python-pptx
- **Scientific**: sympy, tensorflow, imageio, opencv-python
- **Utilities**: joblib, jsonschema, lxml, tabulate, and many more

### Data Visualization Best Practices
When creating visualizations with Matplotlib:
1. **Always use \`plt.tight_layout()\`** before displaying to prevent label cutoff
2. **Set clear titles and labels**: Use \`plt.title()\`, \`plt.xlabel()\`, \`plt.ylabel()\`
3. **Use appropriate figure sizes**: \`plt.figure(figsize=(10, 6))\` for better readability
4. **Choose color schemes wisely**: Consider colorblind-friendly palettes
5. **Add legends when needed**: \`plt.legend()\` for multiple data series
6. **Use grid for readability**: \`plt.grid(True, alpha=0.3)\` for better data interpretation
7. **Display the plot**: Always end with \`plt.show()\` to render the visualization

### When to Use Code Execution
- Mathematical calculations and statistical analysis
- Data processing and transformation (CSV, Excel files)
- Creating charts, graphs, and visualizations
- Scientific computations and simulations
- Algorithm implementation and testing
- Text and document processing

### Example Visualization Pattern
\`\`\`python
import matplotlib.pyplot as plt
import numpy as np

# Generate data
x = np.linspace(0, 10, 100)
y = np.sin(x)

# Create visualization
plt.figure(figsize=(10, 6))
plt.plot(x, y, linewidth=2, label='sin(x)')
plt.title('Sine Wave Visualization', fontsize=14, fontweight='bold')
plt.xlabel('x values', fontsize=12)
plt.ylabel('sin(x)', fontsize=12)
plt.grid(True, alpha=0.3)
plt.legend()
plt.tight_layout()
plt.show()
\`\`\`

**Important**: The frontend will automatically display Matplotlib graphs as inline images in the chat. Users will see visualizations rendered beautifully without needing to download files.

## Mental Health Support Protocol
**CRITICAL**: If a user expresses mental health concerns, suicidal thoughts, severe distress, or explicitly asks for mental health help/hotlines, ALWAYS provide the following Philippine crisis hotlines:

### 🆘 Philippine Mental Health Crisis Hotlines (Available 24/7)

**NCMH Crisis Hotline** - #HandangMakinig 24/7
- 📞 **1553** (toll-free)
- 📞 **1800-1888-1553** (toll-free)
- 📞 **0919-057-1553**
- 📞 **0917-899-8727**
- Free, confidential, compassionate support anytime

**HOPELINE**
- 📞 **(02) 8804-4673**
- 📞 **0917-558-4673** (Globe)
- 📞 **0918-873-4673** (Smart)
- 24/7 crisis intervention and suicide prevention

**In Touch Crisis Line**
- 📞 **(02) 8893-7603**
- 24/7 emotional and crisis support

**Tawag Paglaum Centro Bisaya** (For Visayan speakers)
- 📞 **0966-467-9626**
- 24/7 helpline for emotional and suicidal distress

**Bantay Bata 163** (For children, youth, parents)
- 📞 **163**
- Available 7 AM - 7 PM daily
- 💬 Facebook: facebook.com/bantaybata163PH

**Important Notes:**
- All services are FREE and CONFIDENTIAL
- Trained counselors and volunteers are ready to listen without judgment
- You can call even if you're just feeling overwhelmed or need someone to talk to
- These hotlines support with suicide prevention, depression, anxiety, abuse, and general mental health concerns

After providing hotlines, offer empathetic support and encourage them to reach out. Never dismiss or minimize mental health concerns.

## Professional Standards
- Maintain accuracy and cite uncertainty when appropriate
- Avoid speculation or assumptions beyond provided context
- Request clarification for ambiguous queries
- Provide actionable, practical responses
- Remain neutral and objective in analysis
- Show empathy and compassion, especially for sensitive topics like mental health
- Use LaTeX consistently for all mathematical and scientific notation to ensure beautiful rendering`;
};

/**
 * Creates and initializes a new chat session.
 * @param modelName The name of the model to use for the chat session.
 * @param cachedContentName The name of the cached content to use for the session.
 * @param history An array of previous messages to load into the chat context.
 */
export const startNewChatSession = async (modelName: string, cachedContentName?: string, history: Content[] = []) => {
  if (!ai) {
    console.error("AI client not initialized. Please set the API key first.");
    return;
  }

  currentModelName = modelName;

  // Map the model name to actual Gemini model for Maps variant
  const isMapsModel = modelName.includes('-maps');
  const actualModelName = isMapsModel ? 'gemini-2.5-flash-lite' : modelName;

  // FIX: Clean up old cache with proper error handling in finally block
  if (activeCache && !cachedContentName) {
    try {
      await ai.caches.delete({ name: activeCache.name! });
      console.log("Old cache deleted successfully");
    } catch (e) {
      console.error("Failed to delete old cache", e);
    } finally {
      // FIX: Always set to null to prevent memory leaks
      activeCache = null;
    }
  }

  // Determine which tools to use based on model name
  const tools = isMapsModel
    ? [{ googleMaps: {} }]
    : [{ googleSearch: {} }, { urlContext: {} }, { codeExecution: {} }];

  const config: GenerateContentConfig = {
    tools,
    thinkingConfig: {
      thinkingBudget: -1,
      includeThoughts: true,
    },
    safetySettings,
  };

  const chatHistory = history;

  if (cachedContentName) {
    config.cachedContent = cachedContentName;
  } else if (chatHistory.length === 0) {
    config.systemInstruction = getSystemInstruction(isMapsModel);
  }

  chat = ai.chats.create({
    model: actualModelName,
    config,
    history: chatHistory,
  });
};

/**
 * Converts a File object to a base64 encoded string.
 * @param file The file to convert.
 * @returns A promise that resolves with the base64 string.
 */
const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });

/**
 * Sends a user's prompt (text and/or file) to the Gemini API and streams the response.
 * @param prompt The text prompt from the user.
 * @param files An array of File objects.
 * @param onChunk A callback function that receives chunks of the response as they arrive.
 * @param onFileProcessing A callback to update the UI on the file processing status.
 */
export const streamGeminiResponse = async (
  prompt: string,
  files: File[],
  onChunk: (chunk: { text?: string; thought?: string; sources?: Array<{ uri: string; title: string; placeId?: string }>; executableCode?: string; codeExecutionResult?: string; codeExecutionImages?: Array<{ base64: string; mimeType: string }>; generatedImages?: Array<{ base64: string; mimeType: string }> }) => void,
  onFileProcessing: (status: string) => void
): Promise<{ usageMetadata?: UsageMetadata }> => {
  if (!ai) {
    throw new Error("AI client not initialized. Please provide an API key in the settings.");
  }

  if (!chat) {
    await startNewChatSession(currentModelName);
  }

  if (!chat) {
    throw new Error("Chat session could not be started. Please check your API key and try again.");
  }

  const parts: Part[] = [];
  const MAX_INLINE_SIZE_BYTES = 19 * 1024 * 1024; // 19MB threshold

  // Special case: if there's exactly one large PDF, use the existing context caching logic.
  if (files.length === 1 && files[0].size > MAX_INLINE_SIZE_BYTES && files[0].type === 'application/pdf') {
    const file = files[0];
    onFileProcessing('Uploading file...');
    const uploadedFile = await ai.files.upload({ file });
    onFileProcessing('Processing file...');

    let getFile = await ai.files.get({ name: uploadedFile.name! });
    while (getFile.state === 'PROCESSING') {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Poll every 5 seconds
      getFile = await ai.files.get({ name: getFile.name! });
    }

    if (getFile.state === 'FAILED') {
      throw new Error(`File processing failed: ${getFile.name}`);
    }

    onFileProcessing('Creating context cache for PDF...');

    const isMapsModel = currentModelName.includes('-maps');
    const actualModelName = isMapsModel ? 'gemini-2.5-flash-lite' : currentModelName;
    const cache = await ai.caches.create({
      model: actualModelName,
      config: {
        systemInstruction: getSystemInstruction(isMapsModel),
        contents: [{
          fileData: {
            mimeType: getFile.mimeType,
            fileUri: getFile.uri,
          },
        }],
      },
    });

    // FIX: Clean up old cache with proper error handling
    if (activeCache) {
      try {
        await ai.caches.delete({ name: activeCache.name! });
      } catch (e) {
        console.error("Failed to delete old cache", e);
      } finally {
        // FIX: Set to null even if deletion fails
        activeCache = null;
      }
    }

    activeCache = cache;

    onFileProcessing('Starting new cached session...');
    await startNewChatSession(currentModelName, cache.name);

    parts.push({ text: prompt });
  } else {
    // Handle multiple files (or single files that don't meet the caching criteria)
    for (const file of files) {
      if (file.size > MAX_INLINE_SIZE_BYTES) {
        // Use Files API for larger files
        onFileProcessing(`Uploading ${file.name}...`);
        const uploadedFile = await ai.files.upload({ file });
        onFileProcessing(`Processing ${file.name}...`);

        let getFile = await ai.files.get({ name: uploadedFile.name! });
        while (getFile.state === 'PROCESSING') {
          await new Promise((resolve) => setTimeout(resolve, 5000));
          getFile = await ai.files.get({ name: getFile.name! });
        }

        if (getFile.state === 'FAILED') {
          throw new Error(`File processing failed: ${file.name}`);
        }

        onFileProcessing(`${file.name} processed.`);
        parts.push({
          fileData: {
            mimeType: getFile.mimeType,
            fileUri: getFile.uri,
          },
        });

      } else {
        // Use inline data for smaller files
        parts.push({
          inlineData: {
            data: await fileToBase64(file),
            mimeType: file.type,
          },
        });
      }
    }
    parts.push({ text: prompt });
  }

  const stream = await chat.sendMessageStream({ message: parts });

  let finalUsageMetadata: UsageMetadata | null = null;

  for await (const chunk of stream) {
    if (chunk.usageMetadata) {
      finalUsageMetadata = chunk.usageMetadata;
    }

    // Process thoughts, code, and results from the parts array
    const codeExecutionImages: Array<{ base64: string; mimeType: string }> = [];
    for (const part of chunk.candidates?.[0]?.content?.parts ?? []) {
      if (part.thought) {
        onChunk({ thought: part.text });
      }
      if (part.executableCode?.code) {
        onChunk({ executableCode: part.executableCode.code });
      }
      if (part.codeExecutionResult?.output) {
        onChunk({ codeExecutionResult: part.codeExecutionResult.output });
      }
      // Extract inline images from code execution (Matplotlib graphs, etc.)
      if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
        codeExecutionImages.push({
          base64: part.inlineData.data!,
          mimeType: part.inlineData.mimeType,
        });
      }
    }

    // Send code execution images if any were found
    if (codeExecutionImages.length > 0) {
      onChunk({ codeExecutionImages });
    }

    // FIX: Process text - only from actual text parts to prevent warnings
    const textParts = chunk.candidates?.[0]?.content?.parts?.filter(
      part => part.text && !part.thought && !part.executableCode && !part.codeExecutionResult
    );
    if (textParts && textParts.length > 0) {
      const textContent = textParts.map(part => part.text).join('');
      if (textContent) {
        onChunk({ text: textContent });
      }
    }

    // Process sources (grounding, URL context, and Google Maps)
    const sources: Array<{ uri: string; title: string; placeId?: string }> = [];
    const urlMetadata = chunk.candidates?.[0]?.urlContextMetadata;
    if (urlMetadata?.urlMetadata) {
      for (const meta of urlMetadata.urlMetadata) {
        if (meta.retrievedUrl && !sources.some(s => s.uri === meta.retrievedUrl)) {
          sources.push({
            uri: meta.retrievedUrl,
            title: meta.retrievedUrl.split('//').pop() || meta.retrievedUrl,
          });
        }
      }
    }
    const groundingMetadata = chunk.candidates?.[0]?.groundingMetadata;
    if (groundingMetadata?.groundingChunks) {
      for (const groundChunk of groundingMetadata.groundingChunks) {
        // Handle Google Maps grounding
        if (groundChunk.maps?.uri && groundChunk.maps?.title) {
          if (!sources.some(s => s.uri === groundChunk.maps!.uri)) {
            sources.push({
              uri: groundChunk.maps.uri,
              title: groundChunk.maps.title,
              placeId: groundChunk.maps.placeId,
            });
          }
        }
        // Handle web grounding
        else if (groundChunk.web?.uri && groundChunk.web?.title) {
          if (!sources.some(s => s.uri === groundChunk.web!.uri)) {
            sources.push({
              uri: groundChunk.web.uri,
              title: groundChunk.web.title,
            });
          }
        }
      }
    }

    if (sources.length > 0) {
      onChunk({ sources });
    }
  }

  return { usageMetadata: finalUsageMetadata ?? undefined };
};

/**
 * FIX: Verifies if the provided API key is valid by making a lightweight test call.
 * Now supports abort signal for cancellation with proper cleanup.
 * @param apiKey The API key to verify.
 * @param signal Optional AbortSignal to cancel the verification.
 * @returns A promise that resolves to true if the key is valid, false otherwise.
 */
export const verifyApiKey = async (apiKey: string, signal?: AbortSignal): Promise<boolean> => {
  if (!apiKey || !apiKey.trim()) return false;

  // FIX: Track timeout ID for proper cleanup
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    const tempAi = new GoogleGenAI({ apiKey: apiKey.trim() });

    // FIX: Create internal timeout controller for 10-second timeout
    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), 10000);

    // FIX: If user provides an external signal, listen for its abort event
    if (signal) {
      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    try {
      // FIX: Pass the abort signal to the API call via config.abortSignal
      await tempAi.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: 'test',
        config: {
          abortSignal: controller.signal // FIX: Properly placed in config object!
        }
      });

      // FIX: Clear timeout immediately on success
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      return true;
    } catch (error) {
      // Check if abortion was requested (either by timeout or external signal)
      if (signal?.aborted || controller.signal.aborted) {
        console.log("API key verification was cancelled");
        return false;
      }

      throw error;
    }
  } catch (error) {
    console.error("API key verification failed:", error);
    return false;
  } finally {
    // FIX: Ensure timeout is always cleared in finally block
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const getPromptOptimizationInstruction = () => {
  return `You are a prompt rewriting expert for Google's Gemini models. Your sole function is to take a user's prompt and rewrite it to be more effective for an AI assistant. Your output must be only the rewritten prompt itself, without any preamble, explanation, or quotation marks.

Key Instructions:
- **DO NOT** answer the user's prompt. Your only task is to REWRITE it.
- **DO NOT** ask clarifying questions.
- **DO NOT** include any conversational text like "Here is the rewritten prompt:".
- If the user's prompt contains a factual error or a questionable premise, rewrite it to be a hypothetical or to first seek confirmation of the premise before asking the main question. For example, if the user asks "What is the status of Rodrigo Duterte's potential release from prison?", a good rewrite would be "First, confirm if former Philippine President Rodrigo Duterte is currently imprisoned. If so, provide an update on the status and legal basis for his potential release, citing credible sources."
- Refine vague questions into precise requests.
- Add constraints to define the scope and format of the output if appropriate (e.g., specify length like "in one paragraph", or format like "as a bulleted list").
- Maintain the user's original intent and tone where possible.

**Special: Image Generation Prompts**
If the user's prompt is requesting image generation (keywords: "generate image", "create picture", "draw", "photo of", "headshot", "illustration", etc.), apply these best practices:

1. **CRITICAL - Preserve Personal References**: If the user includes personal terms like "me", "my", "I", "myself", "a photo of me", "my headshot", etc., you MUST keep these exact terms in the rewritten prompt. These are essential for personal image generation requests like professional headshots or photos of the user's likeness.
   - Input: "photo of me in a professional setting"
   - Output: "A professional headshot photo of me in a business setting, wearing formal attire. Soft, diffused studio lighting from the front and sides. Shot with an 85mm portrait lens with shallow depth of field. Clean, neutral background. Square composition."
   - DO NOT change "me" to "a person" or remove personal references.

2. **Be Hyper-Specific**: Add detailed descriptions instead of generic terms.
   - Bad: "fantasy armor"
   - Good: "ornate elven plate armor, etched with silver leaf patterns, with a high collar and pauldrons shaped like falcon wings"

3. **Provide Context and Intent**: Explain the purpose of the image.
   - Bad: "Create a logo"
   - Good: "Create a modern, minimalist logo for a high-end skincare brand"

4. **Add Photography/Cinematic Terms**: Use professional camera language.
   - Include: camera angle (wide-angle, macro, close-up, aerial view)
   - Include: lens details (85mm portrait lens, 24mm wide-angle)
   - Include: lighting (golden hour, soft diffused lighting, three-point lighting)
   - Include: mood and atmosphere
   - Include: composition details

5. **Describe the Scene Narratively**: Don't just list keywords. Describe as a complete scene.
   - Bad: "coffee shop, morning, people"
   - Good: "A modern Filipino coffee shop interior during golden hour. Warm sunlight streams through large windows, illuminating wooden tables and chairs. A barista stands behind a sleek espresso machine, with shelves of coffee beans and local artwork on the walls."

6. **Include Aspect Ratio or Format**: Mention the desired format if relevant.
   - Examples: "Square composition", "Landscape orientation", "Vertical portrait format", "16:9 widescreen"

7. **Use Positive Descriptions**: Instead of "no cars", say "an empty, deserted street with no signs of traffic"

Example Transformations:
- Input: "photo of me"
- Output: "A professional headshot photo of me with natural, friendly expression. Soft, diffused studio lighting creating even illumination on the face. Shot with an 85mm portrait lens with shallow depth of field. Clean, neutral background. Square composition suitable for LinkedIn or professional profiles."

- Input: "photo of a cat"
- Output: "A photorealistic close-up portrait of a fluffy ginger cat with bright green eyes, sitting on a windowsill. Soft, natural light from the window illuminates its fur, creating a warm, cozy atmosphere. Shot with an 85mm lens with shallow depth of field, focusing on the cat's expressive face. Square composition."

- Input: "create a logo for my coffee shop"
- Output: "Create a modern, minimalist logo for an artisan coffee shop called 'Morning Brew'. The design should feature a stylized coffee cup icon integrated with steam rising in an elegant curve. Use a warm color palette of deep brown and cream. The typography should be clean and contemporary, conveying quality and craftsmanship. The logo should work well both in color and black-and-white."`;
}

/**
 * Rewrites a user's prompt for better performance using a specialized model.
 * @param prompt The user's original prompt text.
 * @returns A promise that resolves to the optimized prompt string.
 */
export const optimizePrompt = async (prompt: string): Promise<string> => {
  if (!ai) {
    throw new Error("AI client not initialized. Cannot optimize prompt.");
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: `Rewrite the following user prompt to be more effective for an AI assistant:\n\n---\n\n${prompt}`,
      config: {
        systemInstruction: getPromptOptimizationInstruction(),
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        ],
      },
    });

    return response.text!.trim();

  } catch (error) {
    console.error("Error optimizing prompt:", error);
    return prompt;
  }
};

const getTitleGenerationInstruction = (): string => {
  return `You are a title generation expert. Based on the user's first prompt, create a very short, concise, and descriptive title for the chat conversation. The title should be no more than 5 words. Do not use quotation marks, markdown, or any preamble. Just return the plain text title.`;
};

const getTitleGenerationFromHistoryInstruction = (): string => {
  return `You are a title generation expert. Based on the provided conversation snippet, create a very short, concise, and descriptive title for the chat conversation. The title should be no more than 5 words. Do not use quotation marks, markdown, or any preamble. Just return the plain text title.`;
};

/**
 * Generates a short title for a chat conversation based on the first message.
 * @param prompt The user's first prompt.
 * @returns A promise that resolves to a short title string.
 */
export const generateChatTitle = async (prompt: string): Promise<string> => {
  if (!ai) {
    throw new Error("AI client not initialized. Cannot generate title.");
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: prompt,
      config: {
        systemInstruction: getTitleGenerationInstruction(),
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        ],
      },
    });

    return response.text!.trim().replace(/"/g, '');
  } catch (error) {
    console.error("Error generating title:", error);
    return prompt.split(' ').slice(0, 5).join(' ') || "Untitled Chat";
  }
};

/**
 * Generates a short title for a chat conversation based on its entire history.
 * @param messages The full list of messages in the conversation.
 * @returns A promise that resolves to a short title string.
 */
export const generateTitleFromHistory = async (messages: Message[]): Promise<string> => {
  if (!ai) {
    throw new Error("AI client not initialized. Cannot generate title.");
  }

  const conversationContext = messages
    .filter(m => !m.id.startsWith('initial-') && (m.text?.trim() || m.files))
    .slice(0, 4)
    .map(m => {
      const textPart = m.text ? m.text.trim() : '';
      const filePart = m.files ? `[${m.files.length} file(s) attached]` : '';
      const content = [textPart, filePart].filter(Boolean).join(' ');
      return `${m.sender === 'user' ? 'User' : 'AI'}: ${content}`;
    })
    .join('\n\n');

  if (!conversationContext) {
    return "Untitled Chat";
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: conversationContext,
      config: {
        systemInstruction: getTitleGenerationFromHistoryInstruction(),
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        ],
      },
    });

    return response.text!.trim().replace(/"/g, '');
  } catch (error) {
    console.error("Error generating title from history:", error);
    const firstUserMessage = messages.find(m => m.sender === 'user');
    return firstUserMessage?.text?.split(' ').slice(0, 5).join(' ') || "Untitled Chat";
  }
};

/**
 * Generates images using Gemini's image generation model (gemini-2.5-flash-image).
 * @param prompt The text prompt describing the image to generate.
 * @param files Optional array of File objects for image editing mode.
 * @param onFileProcessing Optional callback to update the UI on file processing status.
 * @param aspectRatio The aspect ratio for the generated image (default: '16:9').
 * @returns A promise that resolves with generated images and usage metadata.
 */
export const generateImage = async (
  prompt: string,
  files: File[] = [],
  onFileProcessing?: (status: string) => void,
  aspectRatio: string = '16:9'
): Promise<{ images: Array<{ base64: string; mimeType: string }>; usageMetadata?: UsageMetadata }> => {
  if (!ai) {
    throw new Error("AI client not initialized. Please provide an API key in the settings.");
  }

  const parts: Part[] = [];

  // Process input images for editing mode
  if (files.length > 0) {
    for (const file of files) {
      if (onFileProcessing) {
        onFileProcessing(`Processing ${file.name}...`);
      }
      parts.push({
        inlineData: {
          data: await fileToBase64(file),
          mimeType: file.type,
        },
      });
    }
  }

  parts.push({ text: prompt });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: parts,
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
        },
      },
    });

    // Extract generated images from response
    const generatedImages: Array<{ base64: string; mimeType: string }> = [];

    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData) {
        generatedImages.push({
          base64: part.inlineData.data!,
          mimeType: part.inlineData.mimeType || 'image/png',
        });
      }
    }

    return {
      images: generatedImages,
      usageMetadata: response.usageMetadata,
    };
  } catch (error) {
    console.error("Error generating image:", error);
    throw new Error("Failed to generate image. Please try again.");
  }
};