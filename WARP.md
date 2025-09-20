# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

NeuroLearn is an AI-powered educational platform built with Next.js 14, TypeScript, and Supabase. The platform provides comprehensive document processing, AI chat, transcription, translation, and summarization capabilities for educational content.

## Development Commands

### Core Commands
- `npm install` - Install dependencies
- `npm run dev` - Start development server on port 3000
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run check` - TypeScript type checking without emitting files

### Testing & Debugging
- Use browser developer tools for frontend debugging
- Check `/api/test` endpoint to verify API connectivity
- Test individual services with dedicated test files (test-whisper.js, test-translation.js)

## Architecture Overview

### Application Structure
The application follows Next.js 14 App Router architecture with these key patterns:

**Authentication & Session Management:**
- Supabase authentication with middleware-based route protection
- `AuthContext` provides user state throughout the app
- `middleware.ts` handles session refresh and route protection
- Public routes: `/auth/*` - Protected routes: everything else

**Component Architecture:**
- `Layout` component wraps all authenticated pages with navigation
- `Navigation` component provides sidebar with main app sections
- Page components in `/src/app/*/page.tsx` follow feature-based organization

**State Management:**
- React Context for authentication state
- Custom hooks for feature-specific state (useTranslation, useSummarization, etc.)
- Zustand may be used for complex client state

### Key Features & Modules

**1. Document Processing & Summarization (`/summarize/*`)**
- Multi-format document upload (PDF, DOCX, TXT, CSV)
- AI-powered summarization with multiple types (brief, detailed, bullet points, etc.)
- Support for text, document, video, and audio summarization
- Export capabilities in multiple formats (PDF, DOCX, HTML, Markdown)

**2. AI Chat & RAG System (`/api/chat`)**
- Google Gemini-powered chat with document context
- Retrieval-Augmented Generation (RAG) using selected document sources
- Conversation history stored in Supabase
- Context-aware responses with source citations

**3. Audio Transcription (`/api/transcribe`)**
- OpenAI Whisper integration for audio transcription
- Support for multiple audio formats (WebM, WAV, MP3, OGG, etc.)
- Language detection and translation capabilities
- Format conversion using FFmpeg when needed

**4. Translation Services (`/api/translate`)**
- Microsoft Translator API integration
- Translation caching in Supabase for performance
- Support for 100+ languages
- Confidence scoring and source language detection

**5. Notebook System (`/notebooks/*`)**
- Document organization and management
- File upload and processing
- Integration with chat system for document queries

### API Architecture

**Route Organization:**
- `/api/chat` - AI chat with RAG capabilities
- `/api/transcribe` - Audio transcription using Whisper
- `/api/translate` - Text translation services
- `/api/documents` - Document management
- `/api/files` - File upload and processing
- `/api/notebooks` - Notebook management
- `/api/languages` - Language detection and utilities

**Error Handling Patterns:**
- Consistent error response format with error codes
- Client-side error boundaries for graceful failures
- Retry logic with exponential backoff for external APIs
- Validation errors return 400, server errors return 500

**External Service Integration:**
- OpenAI Whisper for transcription
- Google Gemini for AI chat responses
- Microsoft Translator for text translation
- Supabase for database, auth, and file storage
- FFmpeg for audio conversion

### Database Schema (Supabase)

**Core Tables:**
- `files` - Document storage and metadata
- `notebooks` - Document organization
- `notebook_files` - Many-to-many relationship between notebooks and files
- `conversations` - Chat history storage
- `translation_cache` - Translation result caching
- User management handled by Supabase Auth

**Key Relationships:**
- Users have many notebooks
- Notebooks contain many files (via junction table)
- Chat conversations belong to notebooks
- Files have processing status and metadata

### TypeScript Architecture

**Path Aliases (tsconfig.json):**
- `@/*` - src root
- `@/components/*` - UI components
- `@/lib/*` - Utility libraries
- `@/hooks/*` - Custom React hooks
- `@/types/*` - TypeScript type definitions

**Key Type Definitions:**
- `summarization.ts` - Comprehensive types for document processing
- `translation.ts` - Translation service types
- `voice.ts` - Audio processing types
- Custom type declarations in `pptx2json.d.ts`

**Custom Hooks Pattern:**
- `useTranslation` - Translation state and API calls
- `useSummarization` - Document processing and summarization
- `useVoiceRecognition` - Audio transcription capabilities
- `useDocuments` - Document management operations
- `useMediaProcessing` - Video/audio processing

### UI Components & Styling

**Component Library:**
- Radix UI primitives for accessible components
- Custom UI components in `/src/components/ui/`
- Lucide React for consistent iconography
- Framer Motion for animations

**Styling Approach:**
- Tailwind CSS for utility-first styling
- Custom CSS classes for complex components
- Responsive design with mobile-first approach
- Dark/light theme support via theme context

## Environment Configuration

### Required Environment Variables
```bash
# Authentication & Database
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Services
OPENAI_API_KEY=your_openai_key
GOOGLE_API_KEY=your_google_gemini_key

# Translation
MICROSOFT_TRANSLATOR_KEY=your_translator_key
MICROSOFT_TRANSLATOR_ENDPOINT=https://api.cognitive.microsofttranslator.com/
MICROSOFT_TRANSLATOR_REGION=your_region

# Audio Processing
MAX_AUDIO_SIZE=25  # MB
```

### Service Configuration
- OpenAI Whisper model: whisper-1 (default)
- Google Gemini model: gemini-1.5-flash
- File upload limits: 25MB for audio, configurable for documents
- FFmpeg used for audio format conversion when needed

## Development Patterns

### API Route Patterns
- Always validate input parameters and return structured errors
- Use consistent response formats: `{ success: boolean, data?: T, error?: string }`
- Handle both form data and JSON payloads appropriately
- Include proper CORS headers for cross-origin requests

### Error Handling
- Client-side: Use try-catch with user-friendly error messages
- Server-side: Log detailed errors, return sanitized messages to clients
- Network errors: Implement retry logic with exponential backoff
- Validation: Return specific error codes for different failure types

### File Processing
- Validate file types and sizes before processing
- Use temporary files for format conversion
- Clean up temporary files after processing
- Support multiple upload methods (drag-drop, file picker)

### State Management
- Use React Context for global state (auth, theme)
- Custom hooks for feature-specific state and API calls
- Local component state for UI-only concerns
- Optimistic updates where appropriate

## Key Integration Points

### Supabase Integration
- Row Level Security (RLS) policies protect user data
- Real-time subscriptions for live updates
- File storage with automatic cleanup
- Edge Functions for server-side processing

### External APIs
- OpenAI: Respect rate limits, handle quota exhaustion gracefully
- Google Gemini: Use streaming for long responses when possible
- Microsoft Translator: Cache results to reduce API calls
- All services: Include proper error handling and timeouts

### Audio Processing Pipeline
1. Client records/uploads audio file
2. Server validates format and size
3. Convert to compatible format if needed (FFmpeg)
4. Send to OpenAI Whisper for transcription
5. Return structured response with confidence scores
6. Optional: Translate result using Microsoft Translator

### Document Processing Pipeline
1. File upload to Supabase storage
2. Extract text content based on file type
3. Chunk content for processing
4. Generate embeddings for RAG capabilities
5. Store processed content in database
6. Enable querying through chat interface

## Common Issues & Solutions

### Audio Transcription
- WebM files may need conversion to WAV for Whisper compatibility
- Very short audio files (<0.5s) will be rejected
- Large files should be chunked before processing
- Handle codec parameter sanitization in MIME types

### Translation Caching
- Cache translations by text hash for performance
- Include user context in cache keys when personalization is needed
- Set reasonable expiration times (30 days default)
- Handle cache misses gracefully

### File Upload Limits
- Configure appropriate limits based on processing capabilities
- Provide clear feedback on file size restrictions
- Support resumable uploads for large files
- Validate file types on both client and server

### Database Queries
- Use appropriate indexes for frequently queried fields
- Implement pagination for large result sets
- Join tables efficiently to avoid N+1 queries
- Use database functions for complex aggregations

## Performance Considerations

- Enable Next.js caching for static content
- Use React.memo and useMemo for expensive computations
- Implement lazy loading for large component trees
- Optimize images with Next.js Image component
- Use Supabase edge functions for compute-heavy operations
- Consider implementing request debouncing for real-time features