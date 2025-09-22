const { YoutubeTranscript } = require('youtube-transcript');

async function testMultipleVideos() {
  const testVideos = [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Rick Roll - popular video
    'https://www.youtube.com/watch?v=jNQXAC9IVRw', // Me at the zoo - first YouTube video
    'https://www.youtube.com/watch?v=9bZkp7q19f0', // PSY - Gangnam Style
  ];
  
  for (const url of testVideos) {
    console.log(`\n=== Testing: ${url} ===`);
    
    try {
      console.log('Attempting to fetch transcript...');
      const transcript = await YoutubeTranscript.fetchTranscript(url);
      
      console.log('Success! Transcript fetched.');
      console.log('Number of segments:', transcript.length);
      
      if (transcript.length > 0) {
        console.log('First segment:', transcript[0]);
        break; // Found working video, stop testing
      } else {
        console.log('No transcript segments found');
      }
      
    } catch (error) {
      console.error('Error:', error.message);
    }
  }
}

testMultipleVideos();