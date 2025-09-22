const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');

const execAsync = promisify(exec);

function extractYouTubeVideoId(url) {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : '';
}

function parseVTTTimestamp(timestamp) {
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

function parseVTTContent(vttContent) {
  const lines = vttContent.split('\n');
  const segments = [];
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    
    // Look for timestamp lines (format: 00:00:00.000 --> 00:00:05.000)
    if (line.includes('-->')) {
      const [startStr, endStr] = line.split('-->').map(s => s.trim());
      const startTime = parseVTTTimestamp(startStr);
      const endTime = parseVTTTimestamp(endStr);
      
      // Get the text content (next non-empty lines until empty line or next timestamp)
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
          text: text.replace(/<[^>]*>/g, '').trim(), // Remove HTML tags
          confidence: 0.9
        });
      }
    } else {
      i++;
    }
  }
  
  return segments;
}

async function testYtDlpTranscript() {
  console.log('Testing yt-dlp transcript extraction...');
  
  // Test with educational videos that are likely to have subtitles
  const testUrls = [
    'https://www.youtube.com/watch?v=T-D1KVIuvjA', // IBM RAG video
    'https://www.youtube.com/watch?v=aircAruvnKk', // 3Blue1Brown
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ'  // Rick Roll
  ];
  
  for (const videoUrl of testUrls) {
    console.log(`\n=== Testing: ${videoUrl} ===`);
    
    try {
      const videoId = extractYouTubeVideoId(videoUrl);
      if (!videoId) {
        console.log('❌ Invalid YouTube URL');
        continue;
      }
      
      console.log('Video ID:', videoId);
      
      // Use yt-dlp to extract subtitles in VTT format
      const tempDir = os.tmpdir();
      const outputPath = path.join(tempDir, `${videoId}.%(ext)s`);
      
      const command = `yt-dlp --write-auto-sub --write-sub --sub-lang en --skip-download --sub-format vtt -o "${outputPath}" "${videoUrl}"`;
      
      console.log('Executing command:', command);
      const { stdout, stderr } = await execAsync(command);
      
      console.log('yt-dlp output:', stdout);
      if (stderr) console.log('yt-dlp stderr:', stderr);
      
      // Look for generated VTT files
      const vttFiles = [
        path.join(tempDir, `${videoId}.en.vtt`),
        path.join(tempDir, `${videoId}.en-US.vtt`),
        path.join(tempDir, `${videoId}.en-GB.vtt`)
      ];
      
      let vttContent = '';
      let foundFile = '';
      for (const vttFile of vttFiles) {
        if (fs.existsSync(vttFile)) {
          vttContent = fs.readFileSync(vttFile, 'utf8');
          foundFile = vttFile;
          fs.unlinkSync(vttFile); // Clean up
          break;
        }
      }
      
      if (!vttContent) {
        console.log('❌ No VTT subtitle files found');
        continue;
      }
      
      console.log('✅ Found VTT file:', foundFile);
      console.log('VTT content length:', vttContent.length);
      
      // Parse VTT content
      const segments = parseVTTContent(vttContent);
      console.log('Parsed segments:', segments.length);
      
      if (segments.length > 0) {
        console.log('\nFirst 3 segments:');
        segments.slice(0, 3).forEach((segment, index) => {
          console.log(`${index + 1}. [${segment.start_time}s-${segment.end_time}s] ${segment.text}`);
        });
        
        console.log('\n✅ Successfully extracted transcript with yt-dlp!');
        break; // Found working video
      } else {
        console.log('❌ No segments parsed from VTT content');
      }
      
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }
}

testYtDlpTranscript().catch(console.error);