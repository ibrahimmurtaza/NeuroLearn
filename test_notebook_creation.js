// Test script to verify notebook creation functionality
const fetch = require('node-fetch');

async function testNotebookCreation() {
  try {
    console.log('Testing notebook creation API...');
    
    // Test without authentication (should fail)
    console.log('\n1. Testing without authentication:');
    const response1 = await fetch('http://localhost:3001/api/notebooks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Test Notebook',
        description: 'Testing notebook creation'
      }),
    });
    
    console.log('Status:', response1.status);
    const result1 = await response1.json();
    console.log('Response:', result1);
    
    // Test GET endpoint
    console.log('\n2. Testing GET notebooks endpoint:');
    const response2 = await fetch('http://localhost:3001/api/notebooks');
    console.log('Status:', response2.status);
    const result2 = await response2.json();
    console.log('Response:', result2);
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testNotebookCreation();