import mammoth from 'mammoth';
import pdf from 'pdf-parse';

export interface DocumentMetadata {
  fileName: string;
  fileSize: number;
  contentLength: number;
  extractionSuccess: boolean;
  error?: string;
}

export interface ProcessingResult {
  content: string;
  metadata: DocumentMetadata;
}

export class DocumentProcessor {
  private supportedFormats = ['.pdf', '.docx', '.doc', '.txt', '.md'];

  /**
   * Enhanced DOCX extraction using mammoth with better configuration
   */
  private async extractDocxContent(buffer: Buffer): Promise<string> {
    try {
      // Use mammoth with enhanced options for better text extraction
      const result = await mammoth.extractRawText({ 
        buffer,
        // Enhanced options for better extraction
        options: {
          includeEmbeddedStyleMap: true,
          includeDefaultStyleMap: true
        }
      });
      
      let content = result.value;
      
      // If mammoth extraction is too short, try alternative approach
      if (content.length < 500) {
        console.log('Mammoth extraction seems incomplete, trying alternative approach');
        
        // Try with different mammoth options
        const alternativeResult = await mammoth.convertToHtml({ buffer });
        const htmlContent = alternativeResult.value;
        
        // Strip HTML tags to get plain text
        const textContent = htmlContent.replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (textContent.length > content.length) {
          content = textContent;
        }
      }
      
      // Clean and format the extracted text
      return this.cleanAndFormatText(content);
      
    } catch (error) {
      console.error('Error extracting DOCX content:', error);
      throw new Error(`DOCX extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text from PDF files
   */
  private async extractPdfContent(buffer: Buffer): Promise<string> {
    try {
      const pdfData = await pdf(buffer);
      return this.cleanAndFormatText(pdfData.text);
    } catch (error) {
      console.error('Error extracting PDF content:', error);
      throw new Error(`PDF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text from plain text files
   */
  private async extractTextContent(buffer: Buffer): Promise<string> {
    try {
      const content = new TextDecoder('utf-8').decode(buffer);
      return this.cleanAndFormatText(content);
    } catch (error) {
      console.error('Error extracting text content:', error);
      throw new Error(`Text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clean and format extracted text for better readability
   */
  private cleanAndFormatText(text: string): string {
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

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    return filename.toLowerCase().split('.').pop() || '';
  }

  /**
   * Check if file format is supported
   */
  public isSupported(filename: string): boolean {
    const extension = `.${this.getFileExtension(filename)}`;
    return this.supportedFormats.includes(extension);
  }

  /**
   * Process a document buffer and extract text content
   */
  public async processDocument(buffer: Buffer, filename: string): Promise<ProcessingResult> {
    const metadata: DocumentMetadata = {
      fileName: filename,
      fileSize: buffer.length,
      contentLength: 0,
      extractionSuccess: false
    };

    try {
      if (!this.isSupported(filename)) {
        throw new Error(`Unsupported file format: ${this.getFileExtension(filename)}`);
      }

      const extension = this.getFileExtension(filename);
      let content = '';

      switch (extension) {
        case 'pdf':
          content = await this.extractPdfContent(buffer);
          break;
        
        case 'docx':
          content = await this.extractDocxContent(buffer);
          break;
        
        case 'doc':
          // For .doc files, try mammoth (limited support)
          try {
            const docResult = await mammoth.extractRawText({ buffer });
            content = this.cleanAndFormatText(docResult.value);
          } catch {
            content = await this.extractTextContent(buffer);
          }
          break;
        
        case 'txt':
        case 'md':
          content = await this.extractTextContent(buffer);
          break;
        
        default:
          throw new Error(`Unsupported file extension: ${extension}`);
      }

      // Update metadata
      metadata.contentLength = content.length;
      metadata.extractionSuccess = content.length > 0;

      // Log extraction results
      console.log(`Document processing completed for ${filename}:`, {
        fileSize: metadata.fileSize,
        contentLength: metadata.contentLength,
        extractionSuccess: metadata.extractionSuccess
      });

      return {
        content,
        metadata
      };

    } catch (error) {
      console.error(`Error processing document ${filename}:`, error);
      
      metadata.error = error instanceof Error ? error.message : 'Unknown error';
      metadata.extractionSuccess = false;
      
      return {
        content: '',
        metadata
      };
    }
  }
}

// Export a singleton instance
export const documentProcessor = new DocumentProcessor();

// Convenience function for backward compatibility
export async function extractTextFromBuffer(buffer: Buffer, filename: string): Promise<string> {
  const result = await documentProcessor.processDocument(buffer, filename);
  return result.content;
}