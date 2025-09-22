const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

async function testFrameExtractionDebug() {
  try {
    console.log('🔧 Testing frame extraction with debug info...');
    
    // Create a temporary directory for frames
    const tempDir = path.join(os.tmpdir(), `frames_debug_${Date.now()}`);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    console.log('📁 Temp directory:', tempDir);
    
    // Test YouTube video URL (short video for testing)
    const testVideoUrl = 'https://www.youtube.com/watch?v=T-D1OfcDW1M';
    
    // Use the correct ffmpeg path
    const ffmpegPath = 'C:\\Users\\PC\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.0-full_build\\bin\\ffmpeg.exe';
    
    // First, download the video to a temp file
    const tempVideoPath = path.join(tempDir, 'temp_video.mp4');
    
    console.log('📥 Downloading video...');
    const downloadCommand = `yt-dlp -f "best[height<=720]" --no-playlist "${testVideoUrl}" -o "${tempVideoPath}"`;
    
    exec(downloadCommand, { timeout: 60000 }, (downloadError, downloadStdout, downloadStderr) => {
      if (downloadError) {
        console.error('❌ Video download failed:', downloadError.message);
        return;
      }
      
      console.log('✅ Video downloaded successfully!');
      console.log('📊 Download stdout:', downloadStdout);
      
      // Now extract frames using the same method as the upload route
      const frameCommand = `"${ffmpegPath}" -i "${tempVideoPath}" -vf "fps=1/30" -q:v 2 "${tempDir}/frame_%03d.jpg"`;
      
      console.log('🎬 Extracting frames...');
      console.log('🚀 Frame command:', frameCommand);
      
      exec(frameCommand, { timeout: 60000 }, (frameError, frameStdout, frameStderr) => {
        if (frameError) {
          console.error('❌ Frame extraction failed:', frameError.message);
          console.error('❌ Frame stderr:', frameStderr);
          return;
        }
        
        console.log('✅ Frame extraction completed!');
        console.log('📊 Frame stdout:', frameStdout);
        if (frameStderr) {
          console.log('⚠️ Frame stderr:', frameStderr);
        }
        
        // Check extracted frames
        try {
          const files = fs.readdirSync(tempDir);
          const frameFiles = files.filter(file => file.startsWith('frame_') && file.endsWith('.jpg'));
          
          console.log(`🖼️ Extracted ${frameFiles.length} frames:`);
          frameFiles.forEach((file, index) => {
            const filePath = path.join(tempDir, file);
            const stats = fs.statSync(filePath);
            console.log(`  ${index + 1}. ${file} (${Math.round(stats.size / 1024)}KB)`);
          });
          
          if (frameFiles.length > 0) {
            console.log('✅ Frame extraction test PASSED!');
          } else {
            console.log('❌ Frame extraction test FAILED - no frames extracted');
          }
          
          // Clean up
          console.log('🧹 Cleaning up temporary files...');
          frameFiles.forEach(file => {
            fs.unlinkSync(path.join(tempDir, file));
          });
          if (fs.existsSync(tempVideoPath)) {
            fs.unlinkSync(tempVideoPath);
          }
          fs.rmdirSync(tempDir);
          console.log('✅ Cleanup completed');
          
        } catch (readError) {
          console.error('❌ Error reading frames directory:', readError);
        }
      });
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testFrameExtractionDebug();