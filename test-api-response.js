const http = require('http');
const { URL } = require('url');

// Test with a valid UUID format
const testUserId = '550e8400-e29b-41d4-a716-446655440000';
const apiUrl = `http://localhost:3000/api/summarize/audio/list?userId=${testUserId}`;

console.log('Testing API endpoint:', apiUrl);
console.log('Making request to:', apiUrl);

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET'
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
}

async function testApi() {
  try {
    const response = await makeRequest(apiUrl);
    
    console.log('Response status:', response.statusCode);
    console.log('Response headers:', response.headers);
    
    const data = JSON.parse(response.body);
    
    console.log('Response data:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.audioSummaries) {
      console.log('\nAudio summaries found:', data.audioSummaries.length);
      data.audioSummaries.forEach((summary, index) => {
        console.log(`Summary ${index + 1}:`, {
          id: summary.id,
          title: summary.title,
          user_id: summary.user_id,
          created_at: summary.created_at
        });
      });
    } else {
      console.log('\nNo audio summaries found in response');
    }
    
    console.log('Count:', data.count);
    
    // Test without userId parameter
    console.log('\n\n=== Testing without userId parameter ===');
    const apiUrlNoUser = 'http://localhost:3000/api/summarize/audio/list';
    
    const response2 = await makeRequest(apiUrlNoUser);
    console.log('Response status:', response2.statusCode);
    
    const data2 = JSON.parse(response2.body);
    console.log('Response data:');
    console.log(JSON.stringify(data2, null, 2));
    
    if (data2.audioSummaries) {
      console.log('\nAudio summaries found:', data2.audioSummaries.length);
      data2.audioSummaries.forEach((summary, index) => {
        console.log(`Summary ${index + 1}:`, {
          id: summary.id,
          title: summary.title,
          user_id: summary.user_id,
          created_at: summary.created_at
        });
      });
    } else {
      console.log('\nNo audio summaries found in response');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testApi();