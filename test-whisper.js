// Simple test script to verify OpenAI Whisper API connectivity
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// Load environment variables manually
function loadEnvFile() {
  try {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const lines = envContent.split('\n');
    for (const line of lines) {
      if (line.includes('OPENAI_API_KEY=')) {
        const key = line.split('OPENAI_API_KEY=')[1];
        process.env.OPENAI_API_KEY = key;
        break;
      }
    }
  } catch (error) {
    console.error('Could not load .env.local file');
  }
}

loadEnvFile();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testWhisperAPI() {
  console.log('Testing OpenAI Whisper API...');
  console.log('API Key:', process.env.OPENAI_API_KEY ? 'Present' : 'Missing');
  
  try {
    // Create a simple test audio file (silence)
    const testAudioBuffer = Buffer.alloc(1024, 0); // 1KB of silence
    const testFile = path.join(__dirname, 'test-audio.wav');
    
    // Write a minimal WAV header + silence
    const wavHeader = Buffer.from([
      0x52, 0x49, 0x46, 0x46, // "RIFF"
      0x24, 0x08, 0x00, 0x00, // File size - 8
      0x57, 0x41, 0x56, 0x45, // "WAVE"
      0x66, 0x6D, 0x74, 0x20, // "fmt "
      0x10, 0x00, 0x00, 0x00, // Subchunk1Size (16)
      0x01, 0x00,             // AudioFormat (PCM)
      0x01, 0x00,             // NumChannels (1)
      0x44, 0xAC, 0x00, 0x00, // SampleRate (44100)
      0x88, 0x58, 0x01, 0x00, // ByteRate
      0x02, 0x00,             // BlockAlign
      0x10, 0x00,             // BitsPerSample (16)
      0x64, 0x61, 0x74, 0x61, // "data"
      0x00, 0x08, 0x00, 0x00  // Subchunk2Size
    ]);
    
    const fullWav = Buffer.concat([wavHeader, testAudioBuffer]);
    fs.writeFileSync(testFile, fullWav);
    
    console.log('Created test WAV file:', testFile);
    console.log('File size:', fs.statSync(testFile).size, 'bytes');
    
    // Test the API
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(testFile),
      model: 'whisper-1',
      response_format: 'text',
    });
    
    console.log('Success! Transcription:', transcription);
    
    // Clean up
    fs.unlinkSync(testFile);
    
  } catch (error) {
    console.error('Error testing Whisper API:');
    console.error('Message:', error.message);
    console.error('Status:', error.status);
    console.error('Code:', error.code);
    console.error('Type:', error.type);
    if (error.error) {
      console.error('API Error Details:', error.error);
    }
  }
}

testWhisperAPI();