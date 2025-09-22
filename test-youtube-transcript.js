const { YoutubeTranscript } = require('youtube-transcript');

async function testYouTubeTranscript() {
  const testUrl = 'https://www.youtube.com/watch?v=T-D1KVIuvjA'; // IBM RAG video
  
  console.log('Testing YouTube transcript extraction...');
  console.log('URL:', testUrl);
  
  try {
    console.log('Attempting to fetch transcript...');
    const transcript = await YoutubeTranscript.fetchTranscript(testUrl);
    
    console.log('Success! Transcript fetched.');
    console.log('Number of segments:', transcript.length);
    
    if (transcript.length > 0) {
      console.log('\nFirst 3 segments:');
      transcript.slice(0, 3).forEach((item, index) => {
        console.log(`${index + 1}. [${item.offset}s] ${item.text}`);
      });
      
      console.log('\nSample processed segment:');
      const processed = transcript.map(item => ({
        start: Math.floor(item.offset / 1000),
        duration: Math.floor(item.duration / 1000),
        text: item.text
      }));
      console.log(processed[0]);
    } else {
      console.log('No transcript segments found');
    }
    
  } catch (error) {
    console.error('Error fetching transcript:', error.message);
    console.error('Error details:', error);
  }
}

testYouTubeTranscript();