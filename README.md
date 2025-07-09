# Glass

A modern application for efficient interaction with audio, visual content, and AI assistance.

## Features

### Core Capabilities
- **Real-time Audio Transcription**: Captures and transcribes system audio
- **AI-powered Content Analysis**: Processes captured content with multiple AI providers
- **Intelligent Q&A**: Ask questions about captured content with contextual awareness
- **Multi-provider AI Support**: OpenAI, Gemini, AWS Bedrock/Claude, and Local LLM options
- **Cross-platform**: Support for macOS and Windows (beta)

### Technical Features
- **Electron + Next.js Hybrid Architecture**: Desktop app with web components
- **SQLite Database**: Local storage with optional Firebase sync
- **Keyboard Shortcut Controls**: Quick access to key functionality
- **Knowledge Base Integration**: RAG capabilities through AWS Bedrock
- **Customizable Settings**: Provider selection, language preferences, and more

## Architecture

Glass consists of several interconnected components:

### Core Structure
- **Main Process**: Handles window management, IPC, and core services initialization
- **UI Layer**: LitElement components for desktop and Next.js for web
- **Service Layer**: Modular services for various functionalities
- **Repository Layer**: Data persistence and retrieval

### Data Flow
1. Audio capture → STT transcription → AI processing → UI rendering
2. User queries → LLM processing (with KB enhancement) → Response display
3. Screen content → Visual processing → Context-aware responses

## AI Integration

Glass supports multiple AI providers through a factory pattern:
- **OpenAI**: Primary provider for STT and chat capabilities
- **Google Gemini**: Alternative LLM provider for content generation
- **AWS Bedrock/Claude**: Enhanced with Knowledge Base integration
- **Local LLM**: Support for self-hosted models like Ollama

## Recent Enhancements

- **AWS Bedrock Integration**: Full support for Claude models with Knowledge Base capabilities
- **Windows Support**: Beta version now available for Windows users
- **Improved Audio Processing**: Enhanced acoustic echo cancellation using Rust
- **Local Model Support**: Run with local language models for privacy
- **Firebase Integration**: Cloud-based data storage and synchronization
- **Customizable Shortcuts**: Personalized keyboard controls

## Getting Started

### Prerequisites
- Node.js 20.x.x
- For Windows users: Build Tools for Visual Studio

### Installation

```bash
npm run setup
```

### Development Mode

```bash
npm run dev
```

## Project Structure

```
glass/
├── docs/             # Documentation and guides
├── functions/        # Firebase Cloud Functions
├── pickleglass_web/  # Next.js web application
├── public/           # Static assets
├── scripts/          # Utility scripts
├── src/              # Main Electron application
│   ├── app/          # Main application components
│   ├── assets/       # Application resources
│   ├── common/       # Shared utilities and services
│   │   ├── ai/       # AI provider integrations
│   │   ├── config/   # Application configuration
│   │   ├── prompts/  # AI prompt templates
│   │   ├── repositories/ # Data access layer
│   │   ├── services/ # Shared services
│   │   └── utils/    # Utility functions
│   ├── electron/     # Electron-specific code
│   └── features/     # Feature implementations
│       ├── ask/      # AI chat functionality
│       ├── listen/   # Audio transcription
│       └── settings/ # User preferences
└── build.js          # Build configuration
