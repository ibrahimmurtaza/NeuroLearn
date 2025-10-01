# NeuroLearn - AI-Powered Educational Platform

NeuroLearn is an innovative AI-driven educational platform that revolutionizes learning experiences through intelligent features, personalized content delivery, and adaptive technologies. The platform serves students, educators, and educational institutions seeking enhanced, data-driven learning outcomes.

## 🚀 Features

### Core Learning Features
- **📚 Document Summarization**: AI-powered summarization of PDFs, DOCX, and text files with multiple summary types (brief, detailed, bullet points, academic)
- **🎥 Video Summarization**: YouTube video processing and uploaded video analysis with transcript generation and key moment extraction
- **🎵 Audio Processing**: Audio file transcription and summarization with speaker identification and timestamp extraction
- **🗣️ Voice Query Feature**: Advanced voice input system with Web Speech API and Whisper integration for enhanced accessibility and user experience
- **🌐 Language Translation**: Multi-language support with 20+ languages, real-time translation, and user preference management
- **📝 Smart Note-Taking**: AI-generated notes in multiple formats (outline, mind map, Cornell, linear, concept map)
- **🎯 Flashcard Generation**: Automated flashcard creation with spaced repetition algorithm and difficulty levels
- **📊 Intelligent Quiz System**: AI-powered quiz generation from educational content with adaptive testing, real-time feedback, question flagging, progress tracking, and comprehensive performance analytics
- **🎮 Gamification**: Achievement system, badges, leaderboards, and learning challenges

### Advanced Features
- **🤖 AI Q&A Assistant**: Contextual help and instant answers using Google's Generative AI
- **📈 Analytics Dashboard**: Learning progress tracking, performance insights, and predictive analytics
- **👥 Collaboration Tools**: Discussion forums, group projects, and real-time messaging
- **📅 Smart Scheduling**: AI-powered study scheduling with calendar integration
- **🎨 Content Creation Studio**: Course authoring tools with multimedia integration
- **🔍 Semantic Search**: Vector-based search across documents and content
- **📱 Responsive Design**: Mobile-first design with modern UI components

## 🗣️ Voice Query Feature

NeuroLearn includes an advanced voice input system that enhances accessibility and provides a seamless hands-free learning experience.

### Voice Recognition Technologies
- **Web Speech API**: Browser-native speech recognition for real-time voice input
- **Whisper Integration**: OpenAI's Whisper API for enhanced accuracy and multilingual support
- **Dual Recognition System**: Fallback mechanism ensuring reliable voice input across different environments

### Key Capabilities
- **Real-time Voice Input**: Instant speech-to-text conversion with visual feedback
- **Multilingual Support**: Voice recognition in 20+ languages matching translation capabilities
- **Enhanced Accuracy**: Whisper API integration for improved transcription quality
- **Accessibility Features**: Voice commands for navigation and content interaction
- **Error Handling**: Robust error recovery with user-friendly feedback

### Voice Input Components
- **VoiceInputButton**: Interactive microphone button with recording states
- **Audio Visualization**: Real-time audio level indicators during recording
- **Speech Processing**: Advanced speech-to-text conversion with noise reduction
- **Query Integration**: Seamless integration with the RAG chatbot system

### Browser Compatibility
- Chrome/Edge: Full Web Speech API support
- Firefox: Whisper API fallback
- Safari: Limited support with graceful degradation
- Mobile browsers: Optimized for touch and voice interaction

## 📊 Intelligent Quiz System

NeuroLearn features a comprehensive AI-powered quiz system that generates adaptive assessments from educational content, providing personalized learning experiences with real-time feedback and performance analytics.

### Quiz Generation Features
- **Content-Based Generation**: Automatically creates quizzes from uploaded documents, videos, and audio content
- **Multiple Question Types**: Support for multiple choice, true/false, short answer, and essay questions
- **Difficulty Adaptation**: Dynamic difficulty adjustment based on student performance
- **Source Integration**: Questions linked to specific content sources for contextual learning

### Assessment Capabilities
- **Real-time Feedback**: Instant scoring and explanations for submitted answers
- **Question Flagging**: Students can flag difficult or unclear questions for review
- **Progress Tracking**: Comprehensive tracking of quiz attempts, scores, and improvement over time
- **Performance Analytics**: Detailed insights into learning patterns and knowledge gaps

### Quiz Management
- **Educator Dashboard**: Tools for creating, editing, and managing quiz content
- **Question Bank**: Centralized repository of questions with tagging and categorization
- **Batch Operations**: Bulk quiz generation and management capabilities
- **Export Options**: Quiz results and analytics export in multiple formats

### Adaptive Learning
- **Personalized Pathways**: Quiz results inform personalized learning recommendations
- **Spaced Repetition**: Integration with flashcard system for reinforced learning
- **Knowledge Mapping**: Visual representation of student understanding across topics
- **Remediation Suggestions**: Targeted content recommendations based on quiz performance

### Quiz Database Schema
- **quiz_questions**: Question content, types, difficulty levels, and metadata
- **quiz_attempts**: Student quiz submissions and scoring history
- **quiz_progress**: Detailed progress tracking and analytics
- **question_flags**: Student-reported question issues and educator responses

## 🏗️ Architecture

### Technology Stack
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: Supabase (PostgreSQL with vector extensions)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage for file uploads
- **AI Services**: 
  - OpenAI GPT for text processing, quiz generation, and intelligent responses
  - Google Generative AI for advanced Q&A and content analysis
  - Google Cloud Translate for translations
  - Whisper API for enhanced audio transcription and voice recognition
  - Web Speech API for real-time voice input
- **Voice Recognition & Audio Processing**:
  - Web Speech API for browser-native speech recognition
  - Whisper Integration for advanced AI-powered speech-to-text
  - Dual Recognition System with fallback mechanism for enhanced accuracy
  - Audio Visualization with real-time audio waveform and level indicators
  - Multilingual Support for voice input in multiple languages
  - Enhanced Error Handling for robust voice recognition error management
- **Media Processing**: FFmpeg for video/audio processing, Canvas API for video frame extraction, Web Audio API for advanced audio analysis, MediaRecorder API for audio recording
- **UI Components**: Radix UI, Lucide React icons
- **State Management**: Zustand, React Query

### Project Structure

```
NeuroLearn-main/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── admin/             # Admin dashboard and management
│   │   ├── analytics/         # Analytics and reporting dashboard
│   │   ├── api/               # API routes (comprehensive REST API)
│   │   │   ├── chat/          # AI chat and conversation endpoints
│   │   │   ├── documents/     # Document processing and management
│   │   │   ├── flashcards/    # Flashcard generation and export
│   │   │   ├── quizzes/       # Quiz system endpoints
│   │   │   ├── summarize/     # Comprehensive summarization services
│   │   │   ├── transcribe/    # Audio transcription services
│   │   │   ├── translate/     # Translation services
│   │   │   └── user/          # User management and preferences
│   │   ├── assess/            # Assessment and quiz platform
│   │   ├── assignments/       # Assignment management system
│   │   ├── auth/              # Authentication and authorization
│   │   ├── collaboration/     # Real-time collaboration tools
│   │   ├── courses/           # Course creation and management
│   │   ├── create/            # Content creation studio
│   │   ├── dashboard/         # Main user dashboard
│   │   ├── gamification/      # Gamification and achievement system
│   │   ├── learn/             # Interactive learning interface
│   │   ├── notebooks/         # Notebook management with voice features
│   │   ├── profile/           # User profiles and settings
│   │   ├── quiz/              # Quiz interface and management
│   │   ├── schedule/          # AI-powered smart scheduling
│   │   └── summarize/         # Document and media summarization
│   ├── components/            # Reusable React components
│   │   ├── ui/                # Base UI components (Radix UI based)
│   │   ├── video-summarization/ # Video processing components
│   │   ├── audio/             # Audio processing and visualization
│   │   ├── voice/             # Voice input and recognition components
│   │   └── quiz/              # Quiz-specific UI components
│   ├── contexts/              # React contexts for state management
│   ├── hooks/                 # Custom React hooks
│   │   ├── useVoiceRecognition.ts # Voice recognition hook
│   │   └── useVoiceRecognitionEnhanced.ts # Enhanced voice with Whisper
│   ├── services/              # Business logic and API services
│   │   ├── quizService.ts     # Quiz generation and management
│   │   ├── whisperService.ts  # Whisper API integration
│   │   └── translationService.ts # Translation services
│   ├── types/                 # TypeScript type definitions
│   │   ├── quiz.ts            # Quiz-related types
│   │   └── voice.ts           # Voice recognition types
│   └── utils/                 # Utility functions and helpers
├── supabase/
│   ├── migrations/            # Database migrations
│   └── storage_setup.sql      # Storage configuration
├── .trae/
│   └── documents/             # Project documentation (PRDs, Technical Architecture)
└── test-files/                # Test data and sample files
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- Supabase account and project
- OpenAI API key
- Google Cloud API credentials (for translation)
- FFmpeg (for media processing)

### Environment Variables
Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Google Cloud Configuration
GOOGLE_APPLICATION_CREDENTIALS=path_to_service_account_json
GOOGLE_CLOUD_PROJECT_ID=your_project_id

# Google Generative AI
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key

# Application Configuration
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd NeuroLearn-main
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase database**
   ```bash
   # Run migrations in order
   supabase db reset
   # Or manually run each migration file in supabase/migrations/
   ```

4. **Configure storage buckets**
   ```bash
   # Run the storage setup script
   psql -f supabase/storage_setup.sql
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Configure voice features (optional)**
   ```bash
   # Ensure microphone permissions are enabled in your browser
   # For Whisper API integration, verify OpenAI API key is configured
   ```

7. **Access the application**
   Open [http://localhost:3000](http://localhost:3000) in your browser

## 📊 Database Schema

### Core Tables
- **notebooks**: User notebooks and learning materials with metadata
- **files**: Uploaded documents and media files with processing status
- **conversations**: AI chat interactions and conversation history
- **embeddings**: Vector embeddings for semantic search and RAG
- **documents**: Document metadata, processing status, and content analysis
- **summaries**: Generated summaries with various types and formats
- **notes**: AI-generated notes in multiple formats (outline, mind map, etc.)
- **flashcards**: Spaced repetition flashcard system with difficulty tracking
- **quiz_questions**: Quiz questions, answers, types, and difficulty levels
- **quiz_attempts**: Student quiz submissions and scoring history
- **quiz_progress**: Detailed progress tracking and performance analytics
- **question_flags**: Student-reported question issues and educator responses
- **video_summaries**: Video processing, analysis results, and transcripts
- **audio_summaries**: Audio transcription, summaries, and speaker identification
- **translation_cache**: Translation caching for performance optimization
- **user_translation_preferences**: User language preferences and settings
- **user_preferences**: Comprehensive user settings and customizations
- **progress_tracking**: Learning progress across all modules and features
- **error_logs**: System error tracking and diagnostics

### Key Features by Migration
- `001_initial_schema.sql`: Core tables and vector search
- `002_translation_feature.sql`: Multi-language support
- `004_summarization_module.sql`: Document summarization
- `008_flashcard_generator_feature.sql`: Flashcard system
- `009_video_summarization_feature.sql`: Video processing
- `011_audio_storage_feature.sql`: Audio processing
- `014_quiz_module_tables.sql`: Quiz and assessment system

## 🎯 Key Components

### Summarization System
- **Document Processing**: Supports PDF, DOCX, TXT, CSV, MD files
- **Summary Types**: Brief, detailed, bullet points, executive, academic
- **Language Support**: 20+ languages with auto-detection
- **Export Formats**: PDF, DOCX, TXT, Markdown, JSON

### Video Processing
- **YouTube Integration**: Direct URL processing with transcript extraction
- **Upload Support**: Local video file processing
- **Frame Analysis**: Key frame extraction and visual analysis
- **Transcript Generation**: Automatic speech-to-text with timestamps

### Audio Processing
- **Format Support**: WAV, MP3, WebM, and other common formats
- **Transcription**: High-accuracy speech recognition
- **Speaker Identification**: Multi-speaker audio processing
- **Summary Generation**: Intelligent audio content summarization

### Translation Engine
- **Real-time Translation**: Instant text translation
- **Batch Processing**: Bulk document translation
- **Language Detection**: Automatic source language identification
- **Caching System**: Performance optimization for repeated translations

## 🔧 API Endpoints

NeuroLearn provides a comprehensive REST API with the following endpoints:

### Authentication & User Management
- `POST /api/user/preferences` - Update user preferences
- `GET /api/user/quiz-stats` - Get user quiz statistics
- `POST /api/validate-email` - Validate email addresses

### Document Processing
- `POST /api/documents/upload` - Upload and process documents
- `GET /api/documents/retrieve` - Retrieve document details
- `GET /api/documents/download` - Download processed documents

### Summarization Services
- `POST /api/summarize/document` - Generate document summaries
- `POST /api/summarize/text` - Summarize text content
- `POST /api/summarize/audio` - Generate audio summaries
- `POST /api/summarize/video` - Create video summaries
- `POST /api/summarize/multi-doc` - Multi-document summarization
- `POST /api/summarize/batch` - Batch summarization processing
- `POST /api/summarize/generate` - Generate custom summaries
- `POST /api/summarize/upload` - Upload content for summarization
- `GET /api/summarize/history` - Get summarization history
- `GET /api/summarize/library` - Access summary library
- `GET /api/summarize/search` - Search summaries
- `POST /api/summarize/export` - Export summaries
- `POST /api/summarize/notes` - Generate notes from summaries

### Quiz System
- `POST /api/quizzes/generate` - Generate quizzes from content
- `POST /api/quizzes/submit` - Submit quiz answers
- `POST /api/quizzes/flag` - Flag quiz questions
- `POST /api/quizzes/save-progress` - Save quiz progress
- `GET /api/quiz-documents` - Get quiz-related documents

### Flashcard System
- `POST /api/flashcards/generate` - Generate flashcards
- `POST /api/flashcards/export` - Export flashcard sets

### Audio & Voice Processing
- `POST /api/transcribe` - Transcribe audio files
- `POST /api/files` - Handle file uploads

### Translation Services
- `POST /api/translate` - Translate text content
- `GET /api/languages` - Get supported languages

### Chat & Conversations
- `POST /api/chat` - Chat with AI assistant
- `GET /api/conversations` - Get conversation history

### Course Management
- `GET /api/courses` - Get course listings
- `POST /api/notebooks` - Create and manage notebooks
- `GET /api/progress` - Track learning progress

### File Management
- `POST /api/reprocess-files` - Reprocess uploaded files
- `GET /api/errors` - Get error logs and diagnostics

### Testing & Diagnostics
- `GET /api/test` - General API health check
- `GET /api/test-ai` - Test AI service connectivity
- `GET /api/test-db` - Test database connectivity
- `GET /api/test-gemini` - Test Google Gemini integration

## 🧪 Testing

The project includes comprehensive test files:
- `test-*.js` files for API endpoint testing
- `test-files/` directory with sample documents
- Database testing scripts for data validation

Run tests:
```bash
# API tests
node test-translation.js
node test-video-processing.js
node test-whisper.js

# Database tests
node test-video-db.js
node debug_db.js
```

## 📚 Documentation

Detailed documentation is available in the `.trae/documents/` directory:
- **NeuroLearn_PRD.md**: Product Requirements Document
- **NeuroLearn_Technical_Architecture.md**: Technical specifications
- **Feature-specific PRDs**: Individual feature documentation
- **Implementation Plans**: Step-by-step development guides

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Setup
- Configure production environment variables
- Set up Supabase production database
- Configure CDN for media files
- Set up monitoring and logging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔧 Troubleshooting

### Voice Recognition Issues

**Microphone Not Working**
- Ensure browser has microphone permissions enabled
- Check system microphone settings and privacy permissions
- Verify microphone is not being used by other applications
- Try refreshing the page and granting permissions again

**Poor Voice Recognition Accuracy**
- Speak clearly and at a moderate pace
- Ensure minimal background noise
- Check internet connection for Whisper API calls
- Verify OpenAI API key is properly configured
- Try using Chrome or Edge for better Web Speech API support

**Voice Input Not Responding**
- Check browser console for JavaScript errors
- Verify API endpoints are accessible
- Ensure HTTPS is enabled (required for Web Speech API)
- Try the Whisper fallback if Web Speech API fails

**Browser Compatibility Issues**
- Chrome/Edge: Full feature support recommended
- Firefox: Limited Web Speech API, relies on Whisper
- Safari: Partial support, may require fallback methods
- Mobile: Ensure touch-friendly voice input is enabled

### Common API Issues

**OpenAI API Errors**
- Verify API key is valid and has sufficient credits
- Check rate limits and usage quotas
- Ensure proper environment variable configuration

**Database Connection Issues**
- Verify Supabase credentials are correct
- Check network connectivity to Supabase
- Run database health check: `GET /api/test-db`

**File Upload Problems**
- Check file size limits (default: 10MB)
- Verify supported file formats
- Ensure storage bucket permissions are configured

## 🆘 Support

For support and questions:
- Check the documentation in `.trae/documents/`
- Review test files for usage examples
- Use the troubleshooting guide above for common issues
- Check browser console for detailed error messages
- Open an issue for bug reports or feature requests

## 🔮 Roadmap

- [ ] Mobile app development
- [ ] Advanced analytics dashboard
- [ ] Integration with LMS platforms
- [ ] Offline mode support
- [ ] Advanced AI tutoring features
- [ ] Collaborative learning spaces
- [ ] Assessment proctoring
- [ ] Content marketplace

---

**NeuroLearn** - Transforming education through AI-powered personalized learning experiences.
