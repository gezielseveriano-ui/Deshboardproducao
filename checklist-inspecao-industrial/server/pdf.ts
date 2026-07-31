import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
// pdfmake's Node build has no ESM/type-safe entry point; the documented
// server-side usage is requiring src/printer directly. createRequire is
// needed because the production server bundle is ESM, where the bare
// `require` global esbuild would otherwise leave behind doesn't exist.
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PdfPrinter = require("pdfmake/src/printer");

// __dirname isn't a real ESM global (unlike the CJS output tsx uses in
// dev) — derive it from import.meta.url so it works in both.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const fonts = {
  DejaVu: {
    normal: path.join(__dirname, "fonts", "DejaVuSans.ttf"),
    bold: path.join(__dirname, "fonts", "DejaVuSans-Bold.ttf"),
    italics: path.join(__dirname, "fonts", "DejaVuSans.ttf"),
    bolditalics: path.join(__dirname, "fonts", "DejaVuSans-Bold.ttf"),
  },
};

/**
 * Renderiza um docDefinition do pdfmake para bytes de PDF, em memória,
 * sem depender de navegador/Chromium — só PDFKit (puro Node).
 */
export function renderPdfBuffer(docDefinition: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const printer = new PdfPrinter(fonts);
      const doc = printer.createPdfKitDocument(docDefinition);
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
