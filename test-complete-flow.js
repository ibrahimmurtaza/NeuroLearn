// Test the complete video processing flow
const path = require('path');

// Mock the database and other dependencies
const mockDb = {
  video: {
    create: async (data) => {
      console.log('📝 Mock database create:', data);
      return { id: 'mock-video-id', ...data };
    }
  }
};

// Mock uploadcare
const mockUploadcare = {
  uploadFile: async (file) => {
    console.log('📤 Mock uploadcare upload:', file.name);
    return { cdnUrl: `https://mock-cdn.com/${file.name}` };
  }
};

// Mock the service methods directly
class MockVideoProcessingService {
  constructor() {
    this.db = mockDb;
    this.uploadcare = mockUploadcare;
  }

  extractYouTubeVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : '';
  }

  parseVTTTimestamp(timestamp) {
    try {
      const parts = timestamp.split(':');
      if (parts.length === 3) {
        const hours = parseInt(parts[0]);
        const minutes = parseInt(parts[1]);
        const seconds = parseFloat(parts[2]);
        return hours * 3600 + minutes * 60 + seconds;
      }
      return -1;
    } catch {
      return -1;
    }
  }

  parseVTTContent(vttContent) {
    const lines = vttContent.split('\n');
    const segments = [];
    
    let i = 0;
    while (i < lines.length) {
      const line = lines[i].trim();
      
      if (line.includes('-->')) {
        const [startStr, endStr] = line.split('-->').map(s => s.trim());
        const startTime = this.parseVTTTimestamp(startStr);
        const endTime = this.parseVTTTimestamp(endStr);
        
        i++;
        let text = '';
        while (i < lines.length && lines[i].trim() && !lines[i].includes('-->')) {
          if (text) text += ' ';
          text += lines[i].trim();
          i++;
        }
        
        if (text && startTime >= 0 && endTime >= 0) {
          segments.push({
            start_time: Math.floor(startTime),
            end_time: Math.floor(endTime),
            text: text.replace(/<[^>]*>/g, '').trim(),
            confidence: 0.9
          });
        }
      } else {
        i++;
      }
    }
    
    return segments;
  }

  async extractTranscriptWithYtDlp(videoUrl) {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const fs = require('fs');
    const os = require('os');

    const execAsync = promisify(exec);

    try {
      const videoId = this.extractYouTubeVideoId(videoUrl);
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }

      console.log('🎬 Extracting transcript for video ID:', videoId);

      const tempDir = os.tmpdir();
      const outputPath = path.join(tempDir, `${videoId}.%(ext)s`);

      const command = `yt-dlp --write-auto-sub --write-sub --sub-lang en --skip-download --sub-format vtt -o "${outputPath}" "${videoUrl}"`;
      
      console.log('⚡ Executing yt-dlp command...');
      const { stdout, stderr } = await execAsync(command);

      const vttFiles = [
        path.join(tempDir, `${videoId}.en.vtt`),
        path.join(tempDir, `${videoId}.en-US.vtt`),
        path.join(tempDir, `${videoId}.en-GB.vtt`)
      ];

      let vttContent = '';
      for (const vttFile of vttFiles) {
        if (fs.existsSync(vttFile)) {
          vttContent = fs.readFileSync(vttFile, 'utf8');
          fs.unlinkSync(vttFile);
          break;
        }
      }

      if (!vttContent) {
        throw new Error('No subtitle files found');
      }

      const segments = this.parseVTTContent(vttContent);
      console.log('✅ Extracted', segments.length, 'transcript segments');
      
      return segments;
    } catch (error) {
      console.error('❌ yt-dlp transcript extraction failed:', error.message);
      return [];
    }
  }

  async getYouTubeTranscript(videoUrl) {
    console.log('📝 Getting YouTube transcript for:', videoUrl);
    
    try {
      const transcript = await this.extractTranscriptWithYtDlp(videoUrl);
      
      if (transcript.length > 0) {
        console.log('✅ Successfully got transcript with', transcript.length, 'segments');
        return transcript;
      }
      
      console.log('⚠️ No transcript segments found');
      return [];
    } catch (error) {
      console.error('❌ Transcript extraction failed:', error.message);
      return [];
    }
  }

  async extractAndUploadFrames(videoUrl) {
    console.log('🖼️ Extracting frames for:', videoUrl);
    
    // Mock frame extraction - in real implementation this would use FFmpeg
    const videoId = this.extractYouTubeVideoId(videoUrl);
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    
    console.log('✅ Mock frame extraction complete, thumbnail:', thumbnailUrl);
    return [thumbnailUrl];
  }

  async saveToDatabase(videoData) {
    console.log('💾 Saving to database...');
    const result = await this.db.video.create(videoData);
    console.log('✅ Saved to database with ID:', result.id);
    return result;
  }

  async processYouTubeVideo(videoUrl, userId) {
    console.log('\n🚀 Starting complete YouTube video processing...');
    console.log('📹 Video URL:', videoUrl);
    console.log('👤 User ID:', userId);

    try {
      // Step 1: Extract transcript
      console.log('\n--- Step 1: Extract Transcript ---');
      const transcript = await this.getYouTubeTranscript(videoUrl);
      
      if (transcript.length === 0) {
        throw new Error('Could not extract transcript from video');
      }

      // Step 2: Extract frames
      console.log('\n--- Step 2: Extract Frames ---');
      const frameUrls = await this.extractAndUploadFrames(videoUrl);

      // Step 3: Save to database
      console.log('\n--- Step 3: Save to Database ---');
      const videoData = {
        url: videoUrl,
        userId: userId,
        transcript: transcript,
        frameUrls: frameUrls,
        status: 'completed',
        createdAt: new Date()
      };

      const savedVideo = await this.saveToDatabase(videoData);

      console.log('\n🎉 Video processing completed successfully!');
      console.log('📊 Summary:');
      console.log('  - Transcript segments:', transcript.length);
      console.log('  - Frame URLs:', frameUrls.length);
      console.log('  - Database ID:', savedVideo.id);

      return savedVideo;

    } catch (error) {
      console.error('\n❌ Video processing failed:', error.message);
      throw error;
    }
  }
}

async function testCompleteFlow() {
  console.log('🧪 Testing complete video processing flow...\n');

  const service = new MockVideoProcessingService();
  
  // Test with a video that we know has transcripts
  const testUrl = 'https://www.youtube.com/watch?v=aircAruvnKk'; // 3Blue1Brown
  const testUserId = 'test-user-123';

  try {
    const result = await service.processYouTubeVideo(testUrl, testUserId);
    console.log('\n✅ Complete flow test PASSED!');
    return result;
  } catch (error) {
    console.error('\n❌ Complete flow test FAILED:', error.message);
    throw error;
  }
}

testCompleteFlow().catch(console.error);