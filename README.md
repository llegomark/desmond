# Desmond AI Chat 🤖

> A special AI chat application built with love for a curious 6-year-old who loves learning and asking questions.

## The Story Behind Desmond

This project was created for Desmond, a bright and curious 6-year-old who uses ChatGPT every day to learn new things and explore the world. He asks questions about everything - from dinosaurs to space, from math problems to how things work. Sometimes he gets frustrated when AI gives him incorrect answers, so his dad built him his own personal AI assistant that he can trust and customize.

When Desmond woke up one morning, he asked his dad to create a ChatGPT-like app just for him - and that's how **Desmond AI** was born!

## What is Desmond AI?

Desmond AI is a friendly, educational chat application powered by Google's Gemini AI. It's designed to be:

- **Easy to use** - Simple, clean interface perfect for kids and adults
- **Educational** - Helps with learning, homework, and curiosity
- **Reliable** - Uses advanced AI models for accurate answers
- **Fun** - Supports images, PDFs, and even creates pictures!

## Features

### What Can Desmond AI Do?

- **Chat with AI** - Ask questions and get helpful answers
- **Upload Files** - Share PDFs and images to discuss with the AI
- **Multiple AI Models** - Choose different AI personalities for different tasks:
  - **Cognitive Core** - For complex questions and big documents
  - **Dynamic Engine** - For everyday questions (the default)
  - **Rapid Response** - For quick, simple answers
  - **Maps Navigator** - For questions about places and locations
  - **Image Generator** - Creates pictures from your descriptions!

- **Save Conversations** - All your chats are saved automatically
- **Dark Mode** - Easy on the eyes for nighttime learning
- **Math Support** - Displays math equations properly
- **Code Highlighting** - Makes code examples easy to read
- **Web Search** - Gets real-time information from the internet
- **Smart Titles** - Automatically names your conversations

### Special Features for Learning

- **Thought Process Display** - See how the AI thinks (optional)
- **Sources** - Shows where information comes from
- **Code Execution** - AI can run calculations and create graphs
- **Image Understanding** - Upload pictures and ask questions about them
- **PDF Reading** - Upload homework or documents for help

## Getting Started

### What You Need

1. A computer with internet connection
2. A Google Gemini API key (free to get!)
3. Node.js installed on your computer

### How to Get Your API Key

1. Go to [Google AI Studio](https://aistudio.google.com/api-keys)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key (it looks like a long string of letters and numbers)

### Installation Steps

1. **Download the code**
   ```bash
   # If you have the code already, skip to step 2
   git clone https://github.com/llegomark/desmond
   cd desmond
   ```

2. **Install the app**
   ```bash
   npm install
   ```

3. **Start using Desmond AI**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   - Go to `http://localhost:5173`
   - Enter your API key when asked
   - Start chatting!

### Building for Production

When you're ready to share Desmond AI with others:

```bash
npm run build
npm run preview
```

## How to Use Desmond AI

### Starting a Conversation

1. Type your question in the text box at the bottom
2. Press Enter or click the Send button
3. Wait for Desmond AI to respond
4. Continue the conversation!

### Uploading Files

1. Click the paperclip icon (📎) next to the text box
2. Choose a PDF or image file (up to 50MB)
3. The file will be attached to your message
4. Ask questions about the file!

### Creating Images

1. Switch to the "Image Generator" model
2. Describe what you want to see
3. Choose an aspect ratio (square, wide, etc.)
4. Send your message and wait for your picture!

### Managing Conversations

- **New Chat** - Click the "+" button to start fresh
- **Rename** - Click the pencil icon on any conversation
- **Delete** - Click the trash icon to remove conversations
- **Switch Chats** - Click on any conversation to continue it

### Changing AI Models

Click on the current model name (at the top) to see all options:
- Use **Cognitive Core** for homework help and reading long documents
- Use **Dynamic Engine** for everyday questions
- Use **Rapid Response** for quick facts
- Use **Maps Navigator** for questions about places
- Use **Image Generator** to create pictures

## Future Plans (Coming Soon!)

### Progressive Web App (PWA)
- Install Desmond AI on your phone or tablet
- Use it offline when there's no internet
- Get it from your home screen like a real app

### Custom Domain Name
- Visit Desmond AI at its own special web address
- Share it easily with friends and family
- Professional and easy to remember

### Claude AI Integration
- Add another smart AI (Claude) as an option
- Different AI personalities for different needs
- More accurate answers by comparing AI responses

### Kid-Friendly Features
- Safety filters for age-appropriate content
- Parental controls and usage monitoring
- Fun themes and avatars
- Voice input for younger kids
- Reading mode with larger text

## Technical Details

### Built With

- **React** - For the user interface
- **TypeScript** - For reliable code
- **Vite** - For fast development
- **Tailwind CSS** - For beautiful styling
- **Google Gemini API** - For AI intelligence
- **TanStack Query** - For data management

### Browser Support

Works best on:
- Chrome
- Edge
- Firefox
- Safari

### File Upload Limits

- Maximum file size: 50MB
- Supported formats: PDF, JPG, PNG, GIF, WebP

## Privacy & Safety

- All conversations are saved only on your computer
- Your API key is stored locally and never shared
- No data is sent to any server except Google's Gemini API
- You control all your data and can delete it anytime

## Tips for Best Results

1. **Ask clear questions** - The more specific, the better
2. **Break down big questions** - Ask one thing at a time
3. **Double-check important facts** - AI can make mistakes
4. **Upload relevant files** - Help AI understand your question better
5. **Try different models** - Some are better for certain tasks

## Troubleshooting

### "Invalid API Key" Error
- Check that you copied the entire key
- Make sure there are no extra spaces
- Try generating a new key

### App Won't Start
- Make sure Node.js is installed
- Run `npm install` again
- Check that port 5173 isn't being used

### Slow Responses
- Try the "Rapid Response" model
- Check your internet connection
- Reduce file sizes before uploading

### Images Not Generating
- Make sure you're using the "Image Generator" model
- Be specific in your description
- Try simpler requests first

## Contributing

This is a personal project for Desmond, but suggestions and improvements are welcome! If you find bugs or have ideas, please share them.