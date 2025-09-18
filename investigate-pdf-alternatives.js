const fs = require('fs');
const path = require('path');

async function investigatePDFAlternatives() {
  console.log('Investigating PDF parsing alternatives...');
  
  // Test different approaches to PDF parsing
  const testPDFPath = path.join(__dirname, 'test-files', 'simple-test.pdf');
  const buffer = fs.readFileSync(testPDFPath);
  
  console.log('\n1. Testing current pdf-parse approach...');
  try {
    const pdf = await import('pdf-parse');
    const result = await pdf.default(buffer);
    console.log('✅ pdf-parse succeeded:', result.text.length, 'characters');
  } catch (error) {
    console.log('❌ pdf-parse failed:', error.message);
  }
  
  console.log('\n2. Testing pdf-parse with different options...');
  try {
    const pdf = await import('pdf-parse');
    const result = await pdf.default(buffer, {
      // Try with different options
      normalizeWhitespace: false,
      disableCombineTextItems: false
    });
    console.log('✅ pdf-parse with options succeeded:', result.text.length, 'characters');
  } catch (error) {
    console.log('❌ pdf-parse with options failed:', error.message);
  }
  
  console.log('\n3. Checking if pdf2pic or other alternatives are available...');
  try {
    // Check what PDF-related packages are installed
    const { execSync } = require('child_process');
    const result = execSync('npm list | findstr pdf', { encoding: 'utf8' });
    console.log('Installed PDF packages:', result);
  } catch (error) {
    console.log('No additional PDF packages found');
  }
  
  console.log('\n4. Testing with a real PDF from the internet...');
  try {
    // Let's try to download a simple PDF and test with it
    const https = require('https');
    const url = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
    
    console.log('Downloading test PDF...');
    const response = await new Promise((resolve, reject) => {
      https.get(url, resolve).on('error', reject);
    });
    
    const chunks = [];
    for await (const chunk of response) {
      chunks.push(chunk);
    }
    const pdfBuffer = Buffer.concat(chunks);
    
    console.log('Downloaded PDF size:', pdfBuffer.length, 'bytes');
    
    // Test with downloaded PDF
    const pdf = await import('pdf-parse');
    const result = await pdf.default(pdfBuffer);
    console.log('✅ Downloaded PDF extraction succeeded!');
    console.log('Pages:', result.numpages);
    console.log('Text length:', result.text.length);
    console.log('Text preview:', result.text.substring(0, 100));
    
    // Save the working PDF for future tests
    const workingPDFPath = path.join(__dirname, 'test-files', 'working-test.pdf');
    fs.writeFileSync(workingPDFPath, pdfBuffer);
    console.log('Saved working PDF to:', workingPDFPath);
    
  } catch (error) {
    console.log('❌ Downloaded PDF test failed:', error.message);
  }
  
  console.log('\n5. Recommendations:');
  console.log('- The issue appears to be with the PDF structure/format');
  console.log('- pdf-parse library is working but sensitive to PDF format');
  console.log('- Consider adding better error handling and fallback options');
  console.log('- May need to validate PDF files before processing');
}

investigatePDFAlternatives().catch(console.error);