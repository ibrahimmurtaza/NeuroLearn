declare module 'pptx2json' {
  interface SlideContent {
    text?: string;
    [key: string]: any;
  }

  interface Slide {
    content?: SlideContent[];
    [key: string]: any;
  }

  interface PptxData {
    slides?: Slide[];
    [key: string]: any;
  }

  export function toJson(buffer: Buffer): Promise<PptxData>;
  export default { toJson };
}