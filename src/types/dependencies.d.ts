// Type declarations for video summarization dependencies
// This file provides TypeScript support for external libraries

// YouTube Transcript API types
declare module 'youtube-transcript-api' {
  export interface TranscriptItem {
    text: string;
    start: number;
    duration: number;
  }

  export interface TranscriptConfig {
    lang?: string;
    country?: string;
  }

  export class YoutubeTranscript {
    static fetchTranscript(
      videoId: string,
      config?: TranscriptConfig
    ): Promise<TranscriptItem[]>;
  }

  export default YoutubeTranscript;
}

// YTDL Core types
declare module 'ytdl-core' {
  export interface VideoInfo {
    videoDetails: {
      videoId: string;
      title: string;
      lengthSeconds: string;
      description: string;
      author: {
        name: string;
        channel_url: string;
      };
      viewCount: string;
      publishDate: string;
      uploadDate: string;
    };
    formats: VideoFormat[];
  }

  export interface VideoFormat {
    itag: number;
    url: string;
    mimeType: string;
    bitrate: number;
    audioBitrate?: number;
    width?: number;
    height?: number;
    fps?: number;
    qualityLabel?: string;
    audioQuality?: string;
    hasVideo: boolean;
    hasAudio: boolean;
    container: string;
    codecs: string;
    audioCodec?: string;
    videoCodec?: string;
  }

  export interface DownloadOptions {
    quality?: 'lowest' | 'highest' | 'highestaudio' | 'lowestaudio' | string;
    filter?: 'audioonly' | 'videoonly' | 'audioandvideo' | ((format: VideoFormat) => boolean);
    format?: VideoFormat;
    range?: {
      start?: number;
      end?: number;
    };
    begin?: string | number | Date;
    liveBuffer?: number;
    requestOptions?: any;
    IPv6Block?: string;
    lang?: string;
  }

  export function getInfo(url: string, options?: any): Promise<VideoInfo>;
  export function downloadFromInfo(info: VideoInfo, options?: DownloadOptions): NodeJS.ReadableStream;
  export function download(url: string, options?: DownloadOptions): NodeJS.ReadableStream;
  export function validateID(id: string): boolean;
  export function validateURL(url: string): boolean;
  export function getURLVideoID(url: string): string | false;
  export function getVideoID(str: string): string | false;

  export default {
    getInfo,
    downloadFromInfo,
    download,
    validateID,
    validateURL,
    getURLVideoID,
    getVideoID
  };
}

// Sharp types (enhanced)
declare module 'sharp' {
  export interface SharpOptions {
    failOnError?: boolean;
    density?: number;
    ignoreIcc?: boolean;
    limitInputPixels?: number | boolean;
    sequentialRead?: boolean;
    unlimited?: boolean;
  }

  export interface ResizeOptions {
    width?: number;
    height?: number;
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    position?: string | number;
    background?: string | object;
    kernel?: 'nearest' | 'cubic' | 'mitchell' | 'lanczos2' | 'lanczos3';
    withoutEnlargement?: boolean;
    withoutReduction?: boolean;
    fastShrinkOnLoad?: boolean;
  }

  export interface JpegOptions {
    quality?: number;
    progressive?: boolean;
    chromaSubsampling?: string;
    trellisQuantisation?: boolean;
    overshootDeringing?: boolean;
    optimiseScans?: boolean;
    optimizeScans?: boolean;
    optimiseCoding?: boolean;
    optimizeCoding?: boolean;
    quantisationTable?: number;
    quantizationTable?: number;
    force?: boolean;
  }

  export interface PngOptions {
    progressive?: boolean;
    compressionLevel?: number;
    adaptiveFiltering?: boolean;
    force?: boolean;
    palette?: boolean;
    quality?: number;
    effort?: number;
    bitdepth?: number;
    dither?: number;
  }

  export interface WebpOptions {
    quality?: number;
    alphaQuality?: number;
    lossless?: boolean;
    nearLossless?: boolean;
    smartSubsample?: boolean;
    effort?: number;
    force?: boolean;
  }

  export interface Metadata {
    format?: string;
    width?: number;
    height?: number;
    space?: string;
    channels?: number;
    depth?: string;
    density?: number;
    chromaSubsampling?: string;
    isProgressive?: boolean;
    hasProfile?: boolean;
    hasAlpha?: boolean;
    orientation?: number;
    exif?: Buffer;
    icc?: Buffer;
    iptc?: Buffer;
    xmp?: Buffer;
  }

  export interface Sharp {
    // Input methods
    metadata(): Promise<Metadata>;
    stats(): Promise<any>;
    
    // Resize methods
    resize(width?: number, height?: number, options?: ResizeOptions): Sharp;
    resize(options: ResizeOptions): Sharp;
    
    // Output methods
    jpeg(options?: JpegOptions): Sharp;
    png(options?: PngOptions): Sharp;
    webp(options?: WebpOptions): Sharp;
    
    // Processing methods
    rotate(angle?: number): Sharp;
    flip(flip?: boolean): Sharp;
    flop(flop?: boolean): Sharp;
    
    // Buffer/Stream methods
    toBuffer(): Promise<Buffer>;
    toBuffer(callback: (err: Error | null, data: Buffer, info: any) => void): Sharp;
    toFile(fileOut: string): Promise<any>;
    toFile(fileOut: string, callback: (err: Error | null, info: any) => void): Sharp;
    
    // Clone
    clone(): Sharp;
  }

  function sharp(input?: string | Buffer | Uint8Array | Uint8ClampedArray, options?: SharpOptions): Sharp;
  
  export default sharp;
}

// FFmpeg types for video processing
declare module 'fluent-ffmpeg' {
  export interface FfmpegCommand {
    input(source: string | NodeJS.ReadableStream): FfmpegCommand;
    output(target: string | NodeJS.WritableStream): FfmpegCommand;
    audioCodec(codec: string): FfmpegCommand;
    videoCodec(codec: string): FfmpegCommand;
    audioChannels(channels: number): FfmpegCommand;
    audioFrequency(frequency: number): FfmpegCommand;
    screenshot(options: any): FfmpegCommand;
    seekInput(timestamp: number): FfmpegCommand;
    frames(count: number): FfmpegCommand;
    size(size: string): FfmpegCommand;
    outputOptions(options: string[]): FfmpegCommand;
    format(format: string): FfmpegCommand;
    on(event: string, callback: Function): FfmpegCommand;
    save(filename: string): FfmpegCommand;
  }

  function ffmpeg(input?: string | NodeJS.ReadableStream): FfmpegCommand;
  
  namespace ffmpeg {
    function setFfmpegPath(path: string): void;
    function ffprobe(file: string, callback: (err: any, metadata: any) => void): void;
  }
  
  export default ffmpeg;
}