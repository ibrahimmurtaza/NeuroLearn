/**
 * Web Audio API based WAV recorder
 * Fallback for when MediaRecorder doesn't support WAV or conversion fails
 */

export class WebAudioRecorder {
  private audioContext: AudioContext | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private recording = false;
  private buffers: Float32Array[] = [];
  private sampleRate = 16000; // OpenAI Whisper preferred sample rate

  async startRecording(stream: MediaStream): Promise<void> {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.sampleRate
      });
      
      this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream);
      
      // Use ScriptProcessorNode for older browser compatibility
      // Note: This is deprecated but more widely supported than AudioWorklet
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.buffers = [];
      this.recording = true;
      
      this.processor.onaudioprocess = (event) => {
        if (!this.recording) return;
        
        const inputBuffer = event.inputBuffer;
        const inputData = inputBuffer.getChannelData(0);
        
        // Copy the data to avoid issues with buffer reuse
        const buffer = new Float32Array(inputData.length);
        buffer.set(inputData);
        this.buffers.push(buffer);
      };
      
      this.mediaStreamSource.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      
      console.log('Web Audio API recording started');
    } catch (error) {
      console.error('Failed to start Web Audio API recording:', error);
      throw error;
    }
  }

  stopRecording(): Blob {
    this.recording = false;
    
    if (!this.buffers.length) {
      console.warn('No audio data recorded');
      return new Blob([], { type: 'audio/wav' });
    }
    
    // Calculate total length
    const totalLength = this.buffers.reduce((acc, buffer) => acc + buffer.length, 0);
    
    // Merge all buffers
    const mergedBuffer = new Float32Array(totalLength);
    let offset = 0;
    for (const buffer of this.buffers) {
      mergedBuffer.set(buffer, offset);
      offset += buffer.length;
    }
    
    // Convert to WAV
    const wavBlob = this.floatArrayToWav(mergedBuffer, this.sampleRate);
    
    // Cleanup
    this.cleanup();
    
    console.log(`Web Audio API recording completed: ${wavBlob.size} bytes`);
    return wavBlob;
  }

  private floatArrayToWav(floatArray: Float32Array, sampleRate: number): Blob {
    // Convert float samples to 16-bit PCM
    const length = floatArray.length;
    const buffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(buffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);
    
    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, floatArray[i]));
      view.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
  }

  private cleanup(): void {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    
    if (this.mediaStreamSource) {
      this.mediaStreamSource.disconnect();
      this.mediaStreamSource = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.buffers = [];
  }

  isRecording(): boolean {
    return this.recording;
  }
}