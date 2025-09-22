const { VideoProcessingService } = require('./src/services/videoProcessingService');

async function testVideoProcessing() {
  console.log('Testing complete video processing flow...');
  
  const videoProcessingService = new VideoProcessingService();
  
  // Test with a popular YouTube video that should have transcripts
  const testUrls = [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Rick Roll
    'https://www.youtube.com/watch?v=jNQXAC9IVRw', // Me at the zoo
    'https://www.youtube.com/watch?v=9bZkp7q19f0'  // Gangnam Style
  ];
  
  for (const videoUrl of testUrls) {
    console.log(`\n=== Testing: ${videoUrl} ===`);
    
    try {
      const result = await videoProcessingService.processYouTubeVideo(videoUrl, {
        onProgress: (progress) => {
          console.log(`[${progress.stage}] ${progress.progress}% - ${progress.message}`);
        },
        extractFrames: false, // Skip frame extraction for now
        summaryLength: 'short'
      });
      
      console.log('Processing completed successfully!');
      console.log('Title:', result.title);
      console.log('Summary length:', result.summary.length);
      console.log('Transcript segments:', result.transcripts.length);
      
      if (result.transcripts.length > 0) {
        console.log('First transcript segment:', result.transcripts[0]);
        break; // Found working video, stop testing
      }
      
    } catch (error) {
      console.error('Processing failed:', error.message);
      console.error('Error details:', error);
    }
  }
}

testVideoProcessing().catch(console.error);