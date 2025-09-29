# NeuroLearn - AI-Powered Educational Platform

NeuroLearn is an innovative AI-driven educational platform that revolutionizes learning experiences through intelligent features, personalized content delivery, and adaptive technologies. The platform serves students, educators, and educational institutions seeking enhanced, data-driven learning outcomes.

## 🚀 Features

### Core Learning Features
- **📚 Document Summarization**: AI-powered summarization of PDFs, DOCX, and text files with multiple summary types (brief, detailed, bullet points, academic)
- **🎥 Video Summarization**: YouTube video processing and uploaded video analysis with transcript generation and key moment extraction
- **🎵 Audio Processing**: Audio file transcription and summarization with speaker identification and timestamp extraction
- **🗣️ Voice Recognition**: Real-time voice input with enhanced speech recognition capabilities
- **🌐 Language Translation**: Multi-language support with 20+ languages, real-time translation, and user preference management
- **📝 Smart Note-Taking**: AI-generated notes in multiple formats (outline, mind map, Cornell, linear, concept map)
- **🎯 Flashcard Generation**: Automated flashcard creation with spaced repetition algorithm and difficulty levels
- **📊 Quiz Module**: Interactive quiz generation with adaptive testing and performance analytics
- **🎮 Gamification**: Achievement system, badges, leaderboards, and learning challenges

### Advanced Features
- **🤖 AI Q&A Assistant**: Contextual help and instant answers using Google's Generative AI
- **📈 Analytics Dashboard**: Learning progress tracking, performance insights, and predictive analytics
- **👥 Collaboration Tools**: Discussion forums, group projects, and real-time messaging
- **📅 Smart Scheduling**: AI-powered study scheduling with calendar integration
- **🎨 Content Creation Studio**: Course authoring tools with multimedia integration
- **🔍 Semantic Search**: Vector-based search across documents and content
- **📱 Responsive Design**: Mobile-first design with modern UI components

## 🏗️ Architecture

### Technology Stack
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: Supabase (PostgreSQL with vector extensions)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage for file uploads
- **AI Services**: 
  - OpenAI GPT for text processing
  - Google Generative AI for Q&A
  - Google Cloud Translate for translations
  - Whisper for audio transcription
- **Media Processing**: FFmpeg for video/audio processing
- **UI Components**: Radix UI, Lucide React icons
- **State Management**: Zustand, React Query

### Project Structure

```
NeuroLearn-main/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── admin/             # Admin dashboard
│   │   ├── analytics/         # Analytics and reporting
│   │   ├── api/               # API routes
│   │   ├── assess/            # Assessment platform
│   │   ├── assignments/       # Assignment management
│   │   ├── auth/              # Authentication pages
│   │   ├── collaboration/     # Collaboration tools
│   │   ├── courses/           # Course management
│   │   ├── create/            # Content creation
│   │   ├── dashboard/         # Main dashboard
│   │   ├── gamification/      # Gamification features
│   │   ├── learn/             # Learning interface
│   │   ├── notebooks/         # Notebook management
│   │   ├── profile/           # User profiles
│   │   ├── schedule/          # Smart scheduling
│   │   └── summarize/         # Summarization features
│   ├── components/            # Reusable React components
│   │   ├── ui/                # Base UI components
│   │   └── video-summarization/ # Video-specific components
│   ├── contexts/              # React contexts
│   ├── hooks/                 # Custom React hooks
│   ├── services/              # Business logic services
│   ├── types/                 # TypeScript type definitions
│   └── utils/                 # Utility functions
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

6. **Access the application**
   Open [http://localhost:3000](http://localhost:3000) in your browser

## 📊 Database Schema

### Core Tables
- **notebooks**: User notebooks and learning materials
- **files**: Uploaded documents and media files
- **conversations**: AI chat interactions
- **embeddings**: Vector embeddings for semantic search
- **documents**: Document metadata and processing status
- **summaries**: Generated summaries with various types
- **notes**: AI-generated notes in multiple formats
- **flashcards**: Spaced repetition flashcard system
- **quiz_questions**: Quiz questions and answers
- **video_summaries**: Video processing and analysis results
- **audio_summaries**: Audio transcription and summaries
- **translation_cache**: Translation caching for performance
- **user_translation_preferences**: User language preferences

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

### Document Processing
- `POST /api/documents/upload` - Upload and process documents
- `GET /api/documents/[id]` - Retrieve document details
- `POST /api/documents/[id]/summarize` - Generate summaries

### Video Processing
- `POST /api/video/process` - Process video files or YouTube URLs
- `GET /api/video/[id]` - Get video summary details
- `POST /api/video/[id]/frames` - Extract and analyze frames

### Audio Processing
- `POST /api/audio/upload` - Upload and process audio files
- `POST /api/audio/transcribe` - Generate transcriptions
- `GET /api/audio/[id]` - Retrieve audio summary

### Translation
- `POST /api/translate` - Translate text
- `GET /api/translate/languages` - Get supported languages
- `POST /api/translate/batch` - Batch translation

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

## 🆘 Support

For support and questions:
- Check the documentation in `.trae/documents/`
- Review test files for usage examples
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
