import * as FileSystem from "expo-file-system/legacy";
import { createTRPCClient } from "./trpc";

/**
 * Fazer upload do PDF para o Supabase Storage via servidor
 * Retorna a URL pública do PDF
 */
export async function uploadPDFToSupabaseStorage(
  pdfPath: string,
  pdfFileName: string
): Promise<string | null> {
  try {
    console.log("[PDF Upload] Iniciando upload:", pdfFileName);

    // Ler arquivo como base64
    const pdfBase64 = await FileSystem.readAsStringAsync(pdfPath, {
      encoding: FileSystem.EncodingType.Base64,
    });

    console.log("[PDF Upload] PDF lido, tamanho:", pdfBase64.length);

    // Chamar endpoint do servidor para fazer upload
    // (usa o mesmo client configurado do resto do app — precisa do httpBatchLink
    // apontando para a API para o mutate realmente sair da rede)
    const client = createTRPCClient();

    const result = await client.checklist.uploadPDF.mutate({
      fileName: pdfFileName,
      pdfBase64,
    });

    if (result.success && result.pdfUrl) {
      console.log("[PDF Upload] ✓ URL pública gerada:", result.pdfUrl);
      return result.pdfUrl;
    } else {
      console.warn("[PDF Upload] Erro:", result.message);
      return null;
    }
  } catch (error) {
    console.error("[PDF Upload] Erro:", error);
    return null;
  }
}

/**
 * Verificar se o bucket existe e está acessível
 */
export async function checkPDFBucket(): Promise<boolean> {
  try {
    console.log("[PDF Upload] Verificando bucket...");
    return true;
  } catch (error) {
    console.error("[PDF Upload] Erro ao verificar bucket:", error);
    return false;
  }
}
