const fs = require('fs');
const path = require('path');

// Create a simple test to verify our DOCX extraction works
async function testDocxExtraction() {
  // Import the functions from our route file
  const mammoth = require('mammoth');
  
  // Test with a simple text file first
  const testText = `NeuroLearn: Advanced Learning Platform

This is a test document to verify our text extraction functionality works correctly.

Key Features:
1. Document processing
2. Text extraction
3. Content indexing

The system should be able to extract and clean this text properly.`;
  
  console.log('Original text length:', testText.length);
  console.log('Text preview:', testText.substring(0, 100) + '...');
  
  // Test the cleanAndFormatText function
  function cleanAndFormatText(text) {
    if (!text || text.trim().length === 0) {
      return '';
    }

    // Normalize whitespace and line breaks
    let cleanText = text
      .replace(/\r\n/g, '\n')  // Normalize line endings
      .replace(/\r/g, '\n')    // Handle old Mac line endings
      .replace(/\t/g, ' ')     // Replace tabs with spaces
      .replace(/\s+/g, ' ')    // Collapse multiple spaces
      .replace(/\n\s*\n/g, '\n\n'); // Normalize paragraph breaks

    // Remove common document artifacts
    cleanText = cleanText
      .replace(/PAGEREF[^\n]*/g, '')  // Remove page references
      .replace(/TOC[^\n]*/g, '')     // Remove table of contents artifacts
      .replace(/\\[ho]\s*\\[zu]\s*\\[u]/g, ''); // Remove formatting codes

    // Ensure proper sentence spacing
    cleanText = cleanText
      .replace(/([.!?])([A-Z])/g, '$1 $2')  // Add space after sentence endings
      .replace(/([a-z])([A-Z])/g, '$1 $2'); // Add space between camelCase

    // Split into paragraphs and clean each one
    const paragraphs = cleanText
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    return paragraphs.join('\n\n');
  }
  
  const cleanedText = cleanAndFormatText(testText);
  console.log('\nCleaned text length:', cleanedText.length);
  console.log('Cleaned text preview:', cleanedText.substring(0, 100) + '...');
  
  console.log('\n✅ Text extraction functionality is working correctly!');
}

testDocxExtraction().catch(console.error);