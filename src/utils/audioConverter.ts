/**
 * Audio format converter utility for OpenAI Whisper compatibility
 * Always outputs: mono, 16kHz, 16-bit PCM WAV
 */

export class AudioConverter {
  /**
   * Convert any audio Blob to mono 16kHz WAV Blob
   */
  async convertToWav(audioBlob: Blob): Promise<Blob> {
    const mimeType = audioBlob.type.toLowerCase();
    
    // Handle WebM format specially - it can't be decoded by Web Audio API
    if (mimeType.includes('webm') || mimeType.includes('opus')) {
      return await this.convertWebMToWav(audioBlob);
    }
    
    // For other formats, use Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    try {
      // Decode the input audio
      const arrayBuffer = await audioBlob.arrayBuffer();
      const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Resample to 16kHz mono
      const wavBuffer = await AudioConverter.resampleTo16kMono(decodedBuffer, 16000);

      // Create WAV Blob
      return new Blob([wavBuffer], { type: "audio/wav" });
    } catch (error) {
      console.warn('Web Audio API conversion failed, trying offline context method:', error);
      // Fallback to offline context method
      return await this.convertWithOfflineContext(audioBlob);
    } finally {
      audioContext.close();
    }
  }

  /**
   * Convert WebM audio to WAV using direct format handling
   */
  private async convertWebMToWav(webmBlob: Blob): Promise<Blob> {
    try {
      // Validate input audio before processing
      if (!webmBlob || webmBlob.size === 0) {
        throw new Error('Invalid WebM audio: Blob is empty or undefined');
      }

      // Try to use Web Audio API for proper decoding
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      try {
        const arrayBuffer = await webmBlob.arrayBuffer();
        const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // Resample to 16kHz mono for OpenAI compatibility
        const wavBuffer = await AudioConverter.resampleTo16kMono(decodedBuffer, 16000);
        
        audioContext.close();
        return new Blob([wavBuffer], { type: "audio/wav" });
        
      } catch (decodeError) {
        console.log('WebM direct decoding failed, trying offline context approach:', decodeError);
        
        // Try offline context approach
        try {
          const convertedBlob = await this.convertWithOfflineContext(webmBlob);
          audioContext.close();
          return convertedBlob;
        } catch (offlineError) {
          console.error('Offline context conversion also failed:', offlineError);
          audioContext.close();
          
          // If all conversion attempts fail, throw an error instead of creating invalid WAV
          throw new Error(`WebM conversion failed: ${decodeError.message}. Offline fallback also failed: ${offlineError.message}`);
        }
      }
      
    } catch (error) {
      console.error('WebM to WAV conversion completely failed:', error);
      
      // Instead of creating invalid WAV, suggest recording in a different format
      throw new Error(`Unable to convert WebM to WAV: ${error.message}. Please try recording again or use a different browser.`);
    }
  }

  /**
   * Convert using OfflineAudioContext (more reliable for some formats)
   */
  private async convertWithOfflineContext(audioBlob: Blob): Promise<Blob> {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const offlineCtx = new OfflineAudioContext(
        1, // mono
        Math.ceil(decodedBuffer.duration * 16000),
        16000
      );
      
      const source = offlineCtx.createBufferSource();
      source.buffer = decodedBuffer;
      source.connect(offlineCtx.destination);
      source.start(0);
      
      const renderedBuffer = await offlineCtx.startRendering();
      const wavBuffer = AudioConverter.audioBufferToWav(renderedBuffer);
      
      return new Blob([wavBuffer], { type: 'audio/wav' });
    } finally {
      audioContext.close();
    }
  }

  /**
   * Create a simple WAV file from array buffer data
   * This is a fallback method that may not produce perfect WAV files
   */
  private static createSimpleWavFromArrayBuffer(arrayBuffer: ArrayBuffer, sampleRate: number): Blob {
    const numChannels = 1;
    const bytesPerSample = 2; // 16-bit
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = arrayBuffer.byteLength;
    
    // Create WAV header
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    
    // RIFF identifier
    this.writeString(view, 0, 'RIFF');
    // RIFF chunk size
    view.setUint32(4, 36 + dataSize, true);
    // RIFF type
    this.writeString(view, 8, 'WAVE');
    // Format chunk identifier
    this.writeString(view, 12, 'fmt ');
    // Format chunk length
    view.setUint32(16, 16, true);
    // Sample format (raw PCM)
    view.setUint16(20, 1, true);
    // Channel count
    view.setUint16(22, numChannels, true);
    // Sample rate
    view.setUint32(24, sampleRate, true);
    // Byte rate (sample rate * block align)
    view.setUint32(28, byteRate, true);
    // Block align (channel count * bytes per sample)
    view.setUint16(32, blockAlign, true);
    // Bits per sample
    view.setUint16(34, bytesPerSample * 8, true);
    // Data chunk identifier
    this.writeString(view, 36, 'data');
    // Data chunk length
    view.setUint32(40, dataSize, true);
    
    // Combine header and data
    const wavBuffer = new Uint8Array(44 + dataSize);
    wavBuffer.set(new Uint8Array(header), 0);
    wavBuffer.set(new Uint8Array(arrayBuffer), 44);
    
    return new Blob([wavBuffer], { type: 'audio/wav' });
  }

  /**
   * Helper method to write string to DataView
   */
  private static writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  /**
   * Resample AudioBuffer to mono 16kHz WAV PCM
   */
  private static async resampleTo16kMono(audioBuffer: AudioBuffer, targetSampleRate: number): Promise<ArrayBuffer> {
    const offlineCtx = new OfflineAudioContext(
      1, // mono
      Math.ceil(audioBuffer.duration * targetSampleRate),
      targetSampleRate
    );

    // Create source and connect
    const bufferSource = offlineCtx.createBufferSource();
    bufferSource.buffer = audioBuffer;

    // Mix down to mono if needed
    const channelMerger = offlineCtx.createChannelMerger(1);
    bufferSource.connect(channelMerger);
    channelMerger.connect(offlineCtx.destination);

    bufferSource.start(0);

    // Render resampled audio
    const renderedBuffer = await offlineCtx.startRendering();

    return this.audioBufferToWav(renderedBuffer);
  }

  /**
   * Convert AudioBuffer → WAV ArrayBuffer (16-bit PCM)
   */
  private static audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
    const numChannels = 1; // mono enforced
    const sampleRate = buffer.sampleRate;
    const length = buffer.length * numChannels * 2; // 16-bit
    const bufferOut = new ArrayBuffer(44 + length);
    const view = new DataView(bufferOut);

    let offset = 0;
    const writeString = (s: string) => {
      for (let i = 0; i < s.length; i++) {
        view.setUint8(offset++, s.charCodeAt(i));
      }
    };

    // RIFF chunk
    writeString("RIFF");
    view.setUint32(offset, 36 + length, true); offset += 4;
    writeString("WAVE");

    // fmt subchunk
    writeString("fmt ");
    view.setUint32(offset, 16, true); offset += 4; // SubChunk1Size
    view.setUint16(offset, 1, true); offset += 2; // PCM
    view.setUint16(offset, numChannels, true); offset += 2;
    view.setUint32(offset, sampleRate, true); offset += 4;
    view.setUint32(offset, sampleRate * numChannels * 2, true); offset += 4;
    view.setUint16(offset, numChannels * 2, true); offset += 2;
    view.setUint16(offset, 16, true); offset += 2; // bits per sample

    // data subchunk
    writeString("data");
    view.setUint32(offset, length, true); offset += 4;

    // Write samples
    const channelData = buffer.getChannelData(0); // mono
    for (let i = 0; i < channelData.length; i++) {
      const s = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }

    return bufferOut;
  }

  /**
   * Quick environment check
   */
  static isConversionSupported(): boolean {
    return typeof window !== "undefined" && !!(window.AudioContext || (window as any).webkitAudioContext);
  }

  /**
   * Add detailed error messages for user feedback
   */
  static notifyUserOfConversionFailure(): void {
    console.error('Audio conversion failed. Please try recording again with a different microphone or environment.');
  }
}
