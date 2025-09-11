const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

// Test DOCX extraction functionality
async function testDocxExtraction() {
  try {
    console.log('Testing DOCX extraction with NeuroLearn_V1.docx...');
    
    // Read the DOCX file
    const filePath = path.join(__dirname, 'NeuroLearn_V1.docx');
    
    if (!fs.existsSync(filePath)) {
      console.error('File not found:', filePath);
      return;
    }
    
    const buffer = fs.readFileSync(filePath);
    console.log('File size:', buffer.length, 'bytes');
    
    // Test raw text extraction
    console.log('\n--- Testing Raw Text Extraction ---');
    const rawResult = await mammoth.extractRawText({ buffer });
    console.log('Raw text length:', rawResult.value.length);
    console.log('Raw text preview (first 200 chars):', rawResult.value.substring(0, 200));
    
    // Test HTML extraction
    console.log('\n--- Testing HTML Extraction ---');
    const htmlResult = await mammoth.convertToHtml({ buffer });
    console.log('HTML length:', htmlResult.value.length);
    
    // Strip HTML tags to get plain text
    const textFromHtml = htmlResult.value.replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    console.log('Text from HTML length:', textFromHtml.length);
    console.log('Text from HTML preview (first 200 chars):', textFromHtml.substring(0, 200));
    
    // Clean and format the text
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
    
    // Use the better extraction method
    const bestContent = textFromHtml.length > rawResult.value.length ? textFromHtml : rawResult.value;
    const cleanedText = cleanAndFormatText(bestContent);
    
    console.log('\n--- Final Results ---');
    console.log('Best extraction method:', textFromHtml.length > rawResult.value.length ? 'HTML' : 'Raw Text');
    console.log('Final cleaned text length:', cleanedText.length);
    console.log('Final text preview (first 300 chars):', cleanedText.substring(0, 300));
    
    // Save the extracted content to a file
    const outputPath = path.join(__dirname, 'extracted_docx_content.txt');
    fs.writeFileSync(outputPath, cleanedText);
    console.log('\n✅ Extracted content saved to:', outputPath);
    
    // Show some statistics
    const words = cleanedText.split(/\s+/).filter(w => w.length > 0).length;
    const paragraphs = cleanedText.split('\n\n').length;
    console.log('\n📊 Statistics:');
    console.log('- Characters:', cleanedText.length);
    console.log('- Words:', words);
    console.log('- Paragraphs:', paragraphs);
    
  } catch (error) {
    console.error('Error during DOCX extraction:', error);
  }
}

testDocxExtraction();