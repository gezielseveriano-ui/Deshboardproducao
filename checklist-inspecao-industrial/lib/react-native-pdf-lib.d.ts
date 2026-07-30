declare module "react-native-pdf-lib" {
  export interface PDFPageOptions {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    color?: string;
    fontSize?: number;
    fontName?: string;
  }

  export interface DrawTextOptions extends PDFPageOptions {
    align?: "left" | "center" | "right";
  }

  export interface DrawRectOptions {
    x: number;
    y: number;
    width: number;
    height: number;
    color?: string;
  }

  export class PDFPage {
    static create(): PDFPage;
    drawText(text: string, options: DrawTextOptions): void;
    drawRect(options: DrawRectOptions): void;
  }

  export class PDFDocument {
    static create(): PDFDocument;
    addPage(page: PDFPage): PDFPage;
    save(fileName: string): Promise<string>;
  }
}
