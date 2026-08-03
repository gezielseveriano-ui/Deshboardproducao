import * as FileSystem from "expo-file-system/legacy";
import JSZip from "jszip";

/**
 * Dispara um clique num <a> real no próximo tick, em vez de síncrono
 * dentro do onPress do React Native Web (que se mostrou pouco confiável
 * para disparar downloads aqui).
 */
function clickDeferred(configure: (link: HTMLAnchorElement) => void) {
  setTimeout(() => {
    const link = document.createElement("a");
    configure(link);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, 0);
}

/**
 * Dispara o download de uma URL (ou blob: URL) no navegador. Só faz
 * sentido no Platform.OS "web" - não há DOM em nativo.
 */
export function downloadUrlOnWeb(url: string, filename: string) {
  clickDeferred((link) => {
    link.href = url;
    link.download = filename;
    link.rel = "noopener";
  });
}

/**
 * Baixa várias URLs de PDF e monta um .zip no próprio navegador
 * (não existe filesystem local de verdade no web para montar isso como
 * nas plataformas nativas). Retorna uma blob: URL pronta para
 * downloadUrlOnWeb - quem chamar deve revogar com URL.revokeObjectURL
 * depois de usar.
 */
export async function buildZipBlobUrlOnWeb(
  files: { url: string; name: string }[]
): Promise<string> {
  const zip = new JSZip();
  for (const file of files) {
    const response = await fetch(file.url);
    const blob = await response.blob();
    zip.file(file.name, blob);
  }
  const zipBlob = await zip.generateAsync({ type: "blob" });
  return URL.createObjectURL(zipBlob);
}

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
