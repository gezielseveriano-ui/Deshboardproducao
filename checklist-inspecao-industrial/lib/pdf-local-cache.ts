import * as FileSystem from "expo-file-system/legacy";

export async function validatePdfExists(pdfPath: string): Promise<boolean> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(pdfPath);
    return fileInfo.exists && (fileInfo as any).size > 0;
  } catch {
    return false;
  }
}

/**
 * `pdfFileName` pode ser um caminho local (checklist gerado neste aparelho,
 * em versões antigas do app) ou uma URL pública do Supabase Storage (agora o
 * caso normal, já que o PDF é gerado no servidor). Resolve sempre para um
 * arquivo local utilizável por Sharing/FileSystem, baixando da nuvem quando
 * necessário.
 */
export async function resolveLocalPdfPath(pdfFileNameOrUrl: string): Promise<string | null> {
  const isRemote = /^https?:\/\//i.test(pdfFileNameOrUrl);
  if (!isRemote) {
    const exists = await validatePdfExists(pdfFileNameOrUrl);
    return exists ? pdfFileNameOrUrl : null;
  }

  try {
    const fileName = pdfFileNameOrUrl.split("/").pop()?.split("?")[0] || `checklist_${Date.now()}.pdf`;
    const localPath = `${FileSystem.cacheDirectory}${fileName}`;

    // Reaproveita cópia já baixada nesta sessão, se existir
    if (await validatePdfExists(localPath)) {
      return localPath;
    }

    const { status } = await FileSystem.downloadAsync(pdfFileNameOrUrl, localPath);
    if (status !== 200) {
      console.warn("[pdf-local-cache] Falha ao baixar PDF remoto, status:", status);
      return null;
    }
    return (await validatePdfExists(localPath)) ? localPath : null;
  } catch (error) {
    console.error("[pdf-local-cache] Erro ao baixar PDF remoto:", error);
    return null;
  }
}
