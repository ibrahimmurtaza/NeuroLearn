const { YoutubeTranscript } = require('youtube-transcript');

async function testVideoWithTranscript() {
  console.log('Testing video processing with transcript extraction...');
  
  // Test with videos that are more likely to have transcripts
  const testUrls = [
    'https://www.youtube.com/watch?v=T-D1KVIuvjA', // IBM RAG video (tech content)
    'https://www.youtube.com/watch?v=aircAruvnKk', // 3Blue1Brown (educational)
    'https://www.youtube.com/watch?v=kJQ9Y06H2-A'  // TED Talk
  ];
  
  for (const videoUrl of testUrls) {
    console.log(`\n=== Testing: ${videoUrl} ===`);
    
    try {
      console.log('Attempting to fetch transcript...');
      const transcript = await YoutubeTranscript.fetchTranscript(videoUrl);
      
      console.log('Success! Transcript fetched.');
      console.log('Number of segments:', transcript.length);
      
      if (transcript.length > 0) {
        console.log('\nFirst 3 segments:');
        transcript.slice(0, 3).forEach((item, index) => {
          console.log(`${index + 1}. [${Math.floor(item.offset/1000)}s] ${item.text}`);
        });
        
        console.log('\nProcessed format:');
        const processed = transcript.slice(0, 2).map(item => ({
          start_time: Math.floor(item.offset / 1000),
          end_time: Math.floor((item.offset + item.duration) / 1000),
          text: item.text.trim(),
          confidence: 0.95
        }));
        console.log(processed);
        
        console.log('\n✅ Found working video with transcript!');
        break; // Found working video
      } else {
        console.log('❌ No transcript segments found');
      }
      
    } catch (error) {
      console.error('❌ Error fetching transcript:', error.message);
    }
  }
}

testVideoWithTranscript().catch(console.error);