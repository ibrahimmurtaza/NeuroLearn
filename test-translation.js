const axios = require('axios');

async function testTranslation() {
  try {
    console.log('Testing translation API...');
    
    const response = await axios.post('http://localhost:3000/api/translate', {
      text: 'Hello! I am ready to help. Please ask your question about the NeuroLearn project proposal',
      targetLanguage: 'es',
      sourceLanguage: 'en'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('Error testing translation:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
  }
}

testTranslation();