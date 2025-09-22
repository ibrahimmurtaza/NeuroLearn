const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function testFrameExtraction() {
  try {
    console.log('🎬 Testing ffmpeg frame extraction...');
    
    // Create a temporary directory for frames
    const tempDir = path.join(os.tmpdir(), `frames_test_${Date.now()}`);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    console.log('📁 Temp directory:', tempDir);
    
    // Test YouTube video URL (short video for testing)
    const testVideoUrl = 'https://www.youtube.com/watch?v=T-D1OfcDW1M';
    
    // Command to extract frames using yt-dlp and ffmpeg
    const command = `yt-dlp -f "best[height<=720]" --no-playlist "${testVideoUrl}" -o - | ffmpeg -i pipe:0 -vf "fps=1/30" -q:v 2 "${tempDir}/frame_%03d.jpg"`;
    
    console.log('🚀 Executing command:', command);
    
    const startTime = Date.now();
    
    exec(command, { timeout: 60000 }, (error, stdout, stderr) => {
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      console.log(`⏱️ Command completed in ${duration}s`);
      
      if (error) {
        console.error('❌ Frame extraction failed:', error.message);
        console.error('❌ Error code:', error.code);
        console.error('❌ Stderr:', stderr);
        return;
      }
      
      console.log('✅ Command executed successfully!');
      console.log('📊 Stdout:', stdout);
      if (stderr) {
        console.log('⚠️ Stderr:', stderr);
      }
      
      // Check how many frames were extracted
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
        fs.rmdirSync(tempDir);
        console.log('✅ Cleanup completed');
        
      } catch (readError) {
        console.error('❌ Error reading extracted frames:', readError);
      }
    });
    
  } catch (error) {
    console.error('💥 Test failed with error:', error);
  }
}

testFrameExtraction();