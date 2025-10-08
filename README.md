# NeuroLearn - AI-Powered Educational Platform

NeuroLearn is an innovative AI-driven educational platform that revolutionizes learning experiences through intelligent features, personalized content delivery, and adaptive technologies. The platform serves students, educators, and educational institutions seeking enhanced, data-driven learning outcomes.

## 🚀 Features

### Core Learning Features
- **📚 Document Summarization**: AI-powered summarization of PDFs, DOCX, TXT, CSV, and MD files with multiple summary types (brief, detailed, bullet points, academic, executive)
- **🎥 Video Summarization**: YouTube video processing and uploaded video analysis with transcript generation, frame extraction, and key moment identification
- **🎵 Audio Processing**: Audio file transcription and summarization with speaker identification, timestamp extraction, and multi-format support (WAV, MP3, WebM)
- **🗣️ Voice Query Feature**: Advanced voice input system with Web Speech API and Whisper integration for enhanced accessibility and user experience
- **🌐 Language Translation**: Multi-language support with 20+ languages, real-time translation, language detection, and user preference management
- **📝 Smart Note-Taking**: AI-generated notes in multiple formats with export capabilities
- **🎯 Flashcard Generation**: Automated flashcard creation with export functionality and difficulty levels
- **📊 Intelligent Quiz System**: AI-powered quiz generation from educational content with adaptive testing, real-time feedback, question flagging, progress tracking, and comprehensive performance analytics
- **📅 Smart Scheduling**: AI-powered task and goal management with calendar integration, analytics, and intelligent due date calculation

### Advanced Features
- **🤖 AI Q&A Assistant**: Contextual help and instant answers using Google's Generative AI
- **📈 Analytics Dashboard**: Learning progress tracking, performance insights, and predictive analytics
- **👥 Collaboration Tools**: Real-time messaging and project management
- **🎨 Content Creation Studio**: Course authoring tools with multimedia integration
- **🔍 Semantic Search**: Vector-based search across documents and content with embeddings
- **📱 Responsive Design**: Mobile-first design with modern UI components using Radix UI and Tailwind CSS

### New Modules & Features
- **🤝 Peer Networking Module**: Connect with fellow learners, study groups, and subject matter experts
- **👤 User Profiles System**: Comprehensive user profiles with academic background, interests, and learning preferences
- **🎓 Dual-Role Authentication**: Support for both student and tutor roles with role switching capabilities
- **🔍 Advanced Profile Management**: Detailed profile customization with education, interests, and availability settings
- **💬 Real-time Communication**: Integrated messaging and chat system for peer collaboration
- **📊 Interest-Based Matching**: AI-powered matching based on academic interests and learning goals
- **🎯 Smart Recommendations**: Personalized course and peer recommendations based on profile data

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
- **Frontend**: Next.js 14.2.0, React 18.3.1, TypeScript 5.0.0, Tailwind CSS 3.4.17
- **Backend**: Next.js API Routes, Node.js 20+
- **Database**: Supabase (PostgreSQL with pgvector extensions for embeddings)
- **Authentication**: Supabase Auth with SSR support
- **Storage**: Supabase Storage for file uploads and media processing
- **AI Services**: 
  - OpenAI GPT-4 (v5.20.2) for text processing, quiz generation, and intelligent responses
  - Google Generative AI (v0.24.1) for advanced Q&A and content analysis
  - Google Cloud Translate (v9.2.0) for multi-language translation
  - Whisper API for enhanced audio transcription and voice recognition
  - Web Speech API for real-time voice input
- **Voice Recognition & Audio Processing**:
  - Web Speech API for browser-native speech recognition
  - Whisper Integration for advanced AI-powered speech-to-text
  - Dual Recognition System with fallback mechanism for enhanced accuracy
  - Audio Visualization with real-time audio waveform and level indicators
  - Multilingual Support for voice input in multiple languages
  - Enhanced Error Handling for robust voice recognition error management
- **Media Processing**: FFmpeg (v5.2.0) for video/audio processing, Canvas API for video frame extraction, Web Audio API for advanced audio analysis, MediaRecorder API for audio recording
- **UI Components**: Radix UI components, Lucide React icons (v0.511.0), Framer Motion (v11.0.0)
- **State Management**: Zustand (v5.0.3), TanStack React Query (v5.0.0)
- **Document Processing**: Mammoth (DOCX), PDF-parse, Sharp (image processing), PPTX2JSON
- **Development Tools**: ESLint, TypeScript, PostCSS, Autoprefixer, Cross-env

### Project Structure

```
NeuroLearn-main/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── admin/             # Admin dashboard and management
│   │   ├── analytics/         # Analytics and reporting dashboard
│   │   ├── api/               # API routes (comprehensive REST API)
│   │   │   ├── auth/          # Authentication endpoints
│   │   │   ├── chat/          # AI chat and conversation endpoints
│   │   │   ├── check-email/   # Email validation and availability
│   │   │   ├── conversations/ # Conversation management
│   │   │   ├── documents/     # Document processing and management
│   │   │   ├── files/         # File upload and processing
│   │   │   ├── flashcards/    # Flashcard generation and export
│   │   │   ├── interests/     # User interests and preferences
│   │   │   ├── languages/     # Language support endpoints
│   │   │   ├── networking/    # Peer networking and connections
│   │   │   ├── notebooks/     # Notebook management
│   │   │   ├── profile/       # User profile management
│   │   │   ├── progress/      # Progress tracking
│   │   │   ├── quiz-documents/# Quiz document management
│   │   │   ├── quizzes/       # Quiz system endpoints
│   │   │   ├── schedule/      # Smart scheduling system
│   │   │   ├── summarize/     # Comprehensive summarization services
│   │   │   ├── transcribe/    # Audio transcription services
│   │   │   ├── translate/     # Translation services
│   │   │   ├── tutor/         # Tutor-specific endpoints
│   │   │   ├── user/          # User management and preferences
│   │   │   ├── user/update-role/ # Role management (student/tutor)
│   │   │   └── validate-email/# Email validation
│   │   ├── assess/            # Assessment and quiz platform
│   │   ├── assignments/       # Assignment management system
│   │   ├── auth/              # Authentication pages (login, register, forgot-password)
│   │   ├── collaboration/     # Real-time collaboration tools
│   │   ├── courses/           # Course creation and management
│   │   ├── create/            # Content creation studio
│   │   ├── dashboard/         # Main user dashboard
│   │   ├── gamification/      # Gamification and achievement system
│   │   ├── learn/             # Interactive learning interface
│   │   ├── networking/        # Peer networking and connections hub
│   │   ├── notebooks/         # Notebook management with voice features
│   │   ├── onboarding/        # User onboarding flow
│   │   ├── profile/           # User profiles and settings
│   │   ├── quiz/              # Quiz interface and management
│   │   ├── schedule/          # AI-powered smart scheduling with analytics, calendar, goals, tasks
│   │   ├── summarize/         # Document and media summarization with analysis, audio, video, text
│   │   └── tutor/             # Tutor-specific interface and management
│   ├── components/            # Reusable React components
│   │   ├── ui/                # Base UI components (Radix UI based)
│   │   ├── calendar/          # Calendar components
│   │   ├── quiz/              # Quiz-specific UI components
│   │   ├── video-summarization/ # Video processing components
│   │   ├── AudioSummaryDetail.tsx # Audio summary detail view
│   │   ├── AudioSummaryList.tsx # Audio summary list
│   │   ├── AudioVisualization.tsx # Audio visualization
│   │   ├── FlashcardModal.tsx # Flashcard modal component
│   │   ├── LanguageSelector.tsx # Language selection
│   │   ├── TranslationControls.tsx # Translation controls
│   │   ├── VoiceInputButton.tsx # Voice input button
│   │   └── [other components] # Various utility components
│   ├── contexts/              # React contexts for state management
│   │   └── AuthContext.tsx    # Authentication context
│   ├── hooks/                 # Custom React hooks
│   │   ├── useDocuments.ts    # Document management hook
│   │   ├── useLanguagePreferences.ts # Language preferences
│   │   ├── useMediaProcessing.ts # Media processing
│   │   ├── useNotes.ts        # Notes management
│   │   ├── useSummarization.ts # Summarization hook
│   │   ├── useTheme.ts        # Theme management
│   │   ├── useTranslation.ts  # Translation hook
│   │   ├── useVoiceRecognition.ts # Voice recognition hook
│   │   └── useVoiceRecognitionEnhanced.ts # Enhanced voice with Whisper
│   ├── services/              # Business logic and API services
│   │   ├── errorHandlingService.ts # Error handling
│   │   ├── frameExtractionService.ts # Video frame extraction
│   │   ├── quizService.ts     # Quiz generation and management
│   │   ├── videoProcessingService.ts # Video processing
│   │   └── whisperService.ts  # Whisper API integration
│   ├── types/                 # TypeScript type definitions
│   │   ├── dependencies.d.ts  # Dependency type definitions
│   │   ├── pptx2json.d.ts     # PPTX processing types
│   │   ├── profile.ts         # User profile and onboarding types
│   │   ├── quiz.ts            # Quiz-related types
│   │   ├── schedule.ts        # Scheduling types
│   │   ├── summarization.ts   # Summarization types
│   │   ├── translation.ts     # Translation types
│   │   ├── video-summarization.ts # Video processing types
│   │   └── voice.ts           # Voice recognition types
│   ├── utils/                 # Utility functions and helpers
│   │   ├── audioConverter.ts  # Audio conversion utilities
│   │   ├── audioUtils.ts      # Audio processing utilities
│   │   └── webAudioRecorder.ts # Web audio recording
│   ├── constants/             # Application constants
│   │   └── analytics.ts       # Analytics constants
│   ├── styles/                # Custom styles
│   │   └── translation.css    # Translation-specific styles
│   └── middleware.ts          # Next.js middleware for caching
├── supabase/
│   ├── migrations/            # Database migrations (30+ migration files)
│   │   ├── 001_initial_schema.sql # Core tables and vector search
│   │   ├── 002_translation_feature.sql # Multi-language support
│   │   ├── 004_summarization_module.sql # Document summarization
│   │   ├── 021_corrected_quiz_schema.sql # Quiz system
│   │   ├── 022_smart_schedule_planner_tables.sql # Scheduling system
│   │   ├── 025_smart_task_scheduling_enhancement.sql # Enhanced scheduling
│   │   ├── 027_user_profiles_system.sql # User profiles system
│   │   ├── 028_dual_role_authentication_system.sql # Dual-role auth
│   │   ├── peer_networking_schema.sql # Peer networking module
│   │   └── 031_eliminate_tutor_subjects_table.sql # Schema optimization
│   └── storage_setup.sql      # Storage configuration
├── .trae/
│   └── documents/             # Project documentation (PRDs, Technical Architecture)
│       ├── NeuroLearn_PRD.md  # Main product requirements
│       ├── Quiz_Module_PRD.md # Quiz module specifications
│       ├── Voice_Query_Feature_PRD.md # Voice feature specifications
│       ├── Peer_Networking_Module_PRD.md # Peer networking specifications
│       ├── Peer_Networking_Technical_Architecture.md # Networking technical docs
│       ├── dual-role-authentication-prd.md # Dual-role auth requirements
│       ├── dual-role-authentication-technical-architecture.md # Dual-role tech docs
│       ├── user_profiles_system_prd.md # User profiles specifications
│       └── user_profiles_technical_architecture.md # Profiles technical docs
├── test-files/                # Test data and sample files
├── public/                    # Static assets
│   └── favicon.svg           # Application favicon
├── package.json              # Dependencies and scripts
├── next.config.js            # Next.js configuration
├── tailwind.config.js        # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration
├── eslint.config.js          # ESLint configuration
└── [various test and utility files] # Testing and debugging scripts
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- Supabase account and project
- OpenAI API key
- Google Cloud API key (for translation and Gemini AI)
- FFmpeg (for audio/video processing)

### Environment Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/neurolearn.git
   cd neurolearn
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Configuration:**
   Create a `.env.local` file in the root directory:
   ```env
   # Database
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

   # AI Services
   OPENAI_API_KEY=your_openai_api_key
   GOOGLE_API_KEY=your_google_api_key
   ANTHROPIC_API_KEY=your_anthropic_api_key

   # Google Cloud Services
   GOOGLE_CLOUD_PROJECT_ID=your_project_id
   GOOGLE_CLOUD_TRANSLATE_KEY=your_translate_key

   # Application
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_nextauth_secret

   # File Upload
   MAX_FILE_SIZE=50000000
   UPLOAD_DIR=./uploads

   # Networking Module Configuration
   NETWORKING_API_TIMEOUT=30000
   NETWORKING_MAX_SUGGESTIONS=50
   NETWORKING_MIN_COMPATIBILITY_SCORE=70
   NETWORKING_CACHE_TTL=300000

   # Feature Flags
   ENABLE_AI_MATCHING=true
   ENABLE_ADVANCED_FILTERS=true
   ENABLE_REAL_TIME_CHAT=true
   ENABLE_NOTIFICATIONS=true

   # External Services
   STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
   STRIPE_SECRET_KEY=your_stripe_secret_key_here

   # Email Configuration
   SMTP_HOST=your_smtp_host_here
   SMTP_PORT=587
   SMTP_USER=your_smtp_user_here
   SMTP_PASS=your_smtp_password_here

   # Analytics
   GOOGLE_ANALYTICS_ID=your_ga_id_here
   MIXPANEL_TOKEN=your_mixpanel_token_here
   ```

4. **Database Setup:**
   ```bash
   # Initialize Supabase (if not already done)
   npx supabase init

   # Run database migrations
   npx supabase db push

   # Or apply migrations manually
   npx supabase db reset
   ```

5. **Install FFmpeg (for audio/video processing):**
   - **Windows:** Download from [FFmpeg website](https://ffmpeg.org/download.html)
   - **macOS:** `brew install ffmpeg`
   - **Linux:** `sudo apt install ffmpeg`

6. **Start the development server:**
   ```bash
   npm run dev
   ```

7. **Open your browser:**
   Navigate to `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run check` - Run type checking

### Production Deployment

For production deployment on Vercel:

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Deploy to Vercel:**
   ```bash
   vercel --prod
   ```

3. **Configure environment variables** in your Vercel dashboard with all variables from `.env.local`

4. **Set up your production database** with Supabase and run migrations

5. **Configure file upload limits** and storage solutions for production use

### Troubleshooting

- **Voice input not working:** Ensure HTTPS is enabled (required for Web Speech API)
- **File upload issues:** Check `MAX_FILE_SIZE` and `UPLOAD_DIR` environment variables
- **AI services failing:** Verify all API keys are correctly set and have sufficient credits
- **Database connection issues:** Ensure Supabase URL and keys are correct and project is active

## 📊 Database Schema

The application uses Supabase (PostgreSQL) with the following main tables:

### Core Tables
- **users** - User profiles and authentication data
- **user_preferences** - User settings and customization options
- **documents** - Uploaded document metadata and processing status
- **conversations** - Chat history and AI conversation context

### User Profiles & Authentication
- **profiles** - Extended user profiles with academic info and interests
- **user_interests** - User learning interests and preferences
- **tutor_profiles** - Tutor-specific information and expertise
- **tutor_subjects** - Tutor-subject relationships
- **role_switch_requests** - User role change requests (student/tutor)
- **onboarding_progress** - User onboarding completion tracking

### Summarization Module
- **document_summaries** - Document-specific summaries with metadata
- **audio_summaries** - Audio file summaries and transcriptions
- **video_summaries** - Video content summaries with frame analysis
- **summary_exports** - Export history and format preferences
- **multi_document_summaries** - Cross-document analysis results

### Quiz System
- **quizzes** - Quiz metadata and configuration
- **quiz_questions** - Individual quiz questions with options
- **quiz_attempts** - User quiz attempts and scoring
- **quiz_progress** - Progress tracking for ongoing quizzes
- **quiz_question_flags** - Flagged questions for review

### Flashcard System
- **flashcard_sets** - Flashcard collection metadata
- **flashcards** - Individual flashcard content
- **flashcard_progress** - User progress on flashcard sets

### Smart Scheduling System
- **tasks** - User tasks with priorities and deadlines
- **goals** - Long-term goals and objectives
- **calendar_events** - Scheduled events and appointments
- **task_dependencies** - Task relationship mapping
- **scheduling_analytics** - Performance metrics and insights

### Translation System
- **translations** - Translation history and cached results
- **supported_languages** - Available language pairs and detection

### File Management
- **file_uploads** - File upload tracking and metadata
- **processing_jobs** - Background job status and results

### Analytics & Tracking
- **user_analytics** - Learning progress and performance metrics
- **system_logs** - Application logs and error tracking

### Peer Networking Module
- **networking_profiles** - Extended profiles for networking features
- **networking_connections** - User connections and relationships
- **networking_groups** - Study groups and communities
- **networking_interests** - Interest-based matching categories
- **networking_messages** - Private messaging system
- **networking_notifications** - Connection requests and updates

### Migration History
- `001_initial_schema.sql` - Core tables and vector search foundation
- `002_translation_feature.sql` - Multi-language support and translation cache
- `004_summarization_module.sql` - Document and media summarization system
- `006_update_summarization_tables.sql` - Enhanced summarization features and exports
- `021_corrected_quiz_schema.sql` - Quiz system with progress tracking and flagging
- `025_smart_task_scheduling_enhancement.sql` - Advanced scheduling with analytics
- `027_user_profiles_system.sql` - Comprehensive user profiles system
- `028_dual_role_authentication_system.sql` - Student/tutor dual-role support
- `peer_networking_schema.sql` - Peer networking and connections system
- Additional migrations for flashcards, file management, and system optimization

For detailed schema information and relationships, see the migration files in `supabase/migrations/` and the schema analysis report.

## 🎯 Key Components

### Frontend Components
- **Navigation.tsx** - Main navigation and routing system
- **DocumentUpload.tsx** - File upload and processing interface
- **SummaryDisplay.tsx** - Summary visualization and export options
- **QuizInterface.tsx** - Interactive quiz taking experience
- **FlashcardModal.tsx** - Spaced repetition flashcard system
- **VoiceInputButton.tsx** - Voice recording and transcription
- **LanguageSelector.tsx** - Multi-language interface support
- **AudioSummaryDetail.tsx** - Audio analysis and playback controls
- **VideoSummaryList.tsx** - Video content management and display
- **Calendar Components** - Smart scheduling and task management
- **Analytics Dashboard** - Learning progress visualization

### Backend Services
- **Summarization Service** - Multi-format content analysis (text, audio, video)
- **Quiz Generation Service** - Automated assessment creation from content
- **Translation Service** - Multi-language content support with detection
- **Voice Processing Service** - Speech-to-text and audio analysis
- **File Processing Service** - Document parsing and metadata extraction
- **Progress Tracking Service** - Learning analytics and performance insights
- **Scheduling Service** - Smart task and goal management
- **Notification Service** - Real-time updates and reminders

### AI Integration
- **OpenAI GPT-4** - Advanced text analysis, generation, and conversation
- **Google Gemini** - Multi-modal content understanding and analysis
- **Whisper API** - High-quality speech transcription and processing
- **Google Translate** - Real-time language translation with detection
- **Custom Embeddings** - Semantic search and content similarity matching
- **Frame Analysis** - Video content extraction and visual understanding

### Core System Features

#### Summarization System
- **Document Processing**: Supports PDF, DOCX, TXT, CSV, MD files with metadata extraction
- **Audio Analysis**: WAV, MP3, WebM with speaker identification and transcription
- **Video Processing**: Frame extraction, transcript generation, YouTube integration
- **Multi-Document**: Cross-document analysis and comparison capabilities
- **Export Options**: Multiple formats including executive summaries and structured notes

#### Quiz Generation
- **Adaptive Difficulty**: Questions adjust based on user performance and content complexity
- **Multiple Formats**: Multiple choice, true/false, short answer, and topic-based generation
- **Progress Tracking**: Detailed analytics with flagging system for problematic questions
- **Content Integration**: Generated from uploaded documents, summaries, and custom topics

#### Smart Scheduling
- **Task Management**: Priority-based task organization with dependency tracking
- **Goal Setting**: Long-term objective planning with milestone tracking
- **Calendar Integration**: Event scheduling with external calendar sync capabilities
- **Analytics Dashboard**: Performance insights and productivity metrics
- **Intelligent Scheduling**: AI-powered due date calculation and workload optimization

#### Advanced Features
- **Voice Input**: Web Speech API integration with Whisper API fallback
- **Real-time Translation**: Instant content translation with automatic language detection
- **Semantic Search**: Vector-based content discovery using embeddings
- **Progress Analytics**: Comprehensive learning progress tracking across all modules
- **Export Capabilities**: Multiple format support for summaries, flashcards, and notes
- **File Management**: Robust upload system with processing status tracking



## 🔧 API Endpoints

NeuroLearn provides a comprehensive REST API with the following endpoints:

### Authentication & User Management
- `POST /api/user/preferences` - Update user preferences
- `GET /api/user/quiz-stats` - Get user quiz statistics
- `POST /api/validate-email` - Validate email addresses
- `POST /api/auth/google/callback` - Google OAuth callback

### User Profiles & Networking
- `GET /api/profile` - Get user profile information
- `POST /api/profile` - Update user profile
- `GET /api/check-email` - Check email availability
- `POST /api/user/update-role` - Switch between student/tutor roles
- `GET /api/networking/connections` - Get user connections
- `POST /api/networking/connect` - Connect with other users
- `GET /api/interests` - Get available interest categories
- `POST /api/interests` - Update user interests

### Document Processing
- `POST /api/documents/upload` - Upload and process documents
- `GET /api/documents/retrieve` - Retrieve document details
- `GET /api/documents/[id]/download` - Download specific documents
- `GET /api/documents/[id]/view` - View document details
- `GET /api/documents/[id]` - Get document by ID

### Summarization Services
- `POST /api/summarize/document` - Generate document summaries
- `POST /api/summarize/text` - Summarize text content
- `POST /api/summarize/audio` - Generate audio summaries
- `GET /api/summarize/audio/[id]` - Get specific audio summary
- `GET /api/summarize/audio/list` - List audio summaries
- `POST /api/summarize/video` - Create video summaries
- `GET /api/summarize/video/[id]` - Get specific video summary
- `POST /api/summarize/video/frames` - Extract and analyze video frames
- `POST /api/summarize/video/transcript` - Get video transcripts
- `POST /api/summarize/video/upload` - Upload videos for processing
- `POST /api/summarize/video/youtube` - Process YouTube videos
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
- `POST /api/quizzes/generate-from-topic` - Generate quizzes from topics
- `POST /api/quizzes/[id]/submit` - Submit quiz answers
- `POST /api/quizzes/[id]/flag` - Flag quiz questions
- `POST /api/quizzes/[id]/save-progress` - Save quiz progress
- `GET /api/quizzes/[id]` - Get specific quiz
- `GET /api/quiz-documents` - Get quiz-related documents
- `POST /api/quiz-documents/upload` - Upload quiz documents

### Flashcard System
- `POST /api/flashcards/generate` - Generate flashcards
- `POST /api/flashcards/export` - Export flashcard sets
- `GET /api/flashcards/[id]` - Get specific flashcard set

### Smart Scheduling System
- `GET /api/schedule/tasks` - Get scheduled tasks
- `POST /api/schedule/tasks` - Create new tasks
- `GET /api/schedule/tasks/[id]` - Get specific task
- `PUT /api/schedule/tasks/[id]` - Update task
- `DELETE /api/schedule/tasks/[id]` - Delete task
- `GET /api/schedule/goals` - Get goals
- `POST /api/schedule/goals` - Create new goals
- `GET /api/schedule/goals/[id]` - Get specific goal
- `PUT /api/schedule/goals/[id]` - Update goal
- `DELETE /api/schedule/goals/[id]` - Delete goal
- `GET /api/schedule/calendar` - Get calendar data
- `POST /api/schedule/calendar` - Create calendar events
- `GET /api/schedule/calendar/[id]` - Get specific calendar event
- `POST /api/schedule/calendar/sync` - Sync with external calendars
- `GET /api/schedule/calendar/tasks` - Get calendar tasks
- `GET /api/schedule/analytics` - Get scheduling analytics
- `GET /api/schedule/notifications` - Get notifications

### Audio & Voice Processing
- `POST /api/transcribe` - Transcribe audio files
- `POST /api/files` - Handle file uploads

### Translation Services
- `POST /api/translate` - Translate text content
- `GET /api/languages` - Get supported languages

### Chat & Conversations
- `POST /api/chat` - Chat with AI assistant
- `POST /api/conversations/clear` - Clear conversation history

### Notebook Management
- `POST /api/notebooks` - Create and manage notebooks

### Progress Tracking
- `GET /api/progress/[operationId]` - Track operation progress

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

### Completed Features ✅
- [x] AI-powered document summarization
- [x] Video and audio processing with transcription
- [x] Intelligent quiz generation system
- [x] Voice input with speech recognition
- [x] Multi-language translation support
- [x] Smart scheduling and task management
- [x] User profiles and onboarding system
- [x] Peer networking and connections
- [x] Dual-role authentication (student/tutor)

### Current Development 🚧
- [ ] Advanced analytics dashboard improvements
- [ ] Enhanced collaboration features
- [ ] Mobile app development
- [ ] Real-time chat and video conferencing

### Future Plans 📋
- [ ] Integration with LMS platforms (Canvas, Moodle, Blackboard)
- [ ] Offline mode support
- [ ] Advanced AI tutoring features
- [ ] Collaborative learning spaces
- [ ] Assessment proctoring system
- [ ] Content marketplace
- [ ] Advanced personalization algorithms
- [ ] Blockchain-based credential verification
- [ ] AR/VR learning environments

---

**NeuroLearn** - Transforming education through AI-powered personalized learning experiences.
