import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import { getApiBaseUrl } from "@/constants/oauth";
import { CategoriaResumo, ExecutanteCategoriaResumo, ModeloResumo } from "./reports-types";
import { downloadUrlOnWeb } from "./pdf-local-cache";

interface ProductionReportData {
  periodo: string;
  dataGeracao: string;
  categoriaResumo: CategoriaResumo[];
  modeloResumo: ModeloResumo[];
  executanteCategoriaResumo: ExecutanteCategoriaResumo[];
  totalChecklists: number;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/**
 * Gera o PDF do relatório de produção no servidor (pdfmake, o mesmo motor
 * usado pro PDF de checklist) - não usa expo-print, que no web só sabe
 * imprimir a tela atual do app (window.print()) e não sabe renderizar o
 * HTML do relatório de verdade.
 *
 * No web, dispara o download direto no navegador. Em nativo, salva
 * localmente e abre o menu de compartilhar.
 */
export async function generateProductionReportPDF(data: ProductionReportData): Promise<void> {
  const response = await fetch(`${getApiBaseUrl()}/api/relatorio-producao/pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Erro ao gerar PDF do relatório (HTTP ${response.status})`);
  }

  const fileName = `relatorio-producao-${Date.now()}.pdf`;

  if (Platform.OS === "web") {
    const blob = await response.blob();

    // No share nativo do celular (Web Share API com um File de verdade), o
    // resultado é só o PDF, sem nada mais junto. O caminho antigo (link
    // <a download> de uma blob: URL) faz o Safari/iOS abrir o PDF numa
    // pré-visualização própria e, ao compartilhar dali, anexar a blob: URL
    // como texto/link junto do arquivo - por isso preferimos isso aqui
    // sempre que o navegador suportar, e só cai pro download direto (sem
    // share, mais comum em desktop) quando não suportar.
    const file = new File([blob], fileName, { type: "application/pdf" });
    const nav = typeof navigator !== "undefined" ? (navigator as any) : null;
    if (nav?.canShare?.({ files: [file] })) {
      try {
        await nav.share({ files: [file], title: "Relatório de Produção" });
        return;
      } catch (err) {
        if ((err as any)?.name === "AbortError") return; // usuário cancelou o compartilhamento
        // Qualquer outro erro: cai pro download direto abaixo.
      }
    }

    const blobUrl = URL.createObjectURL(blob);
    downloadUrlOnWeb(blobUrl, fileName);
    // Só revoga depois de dar tempo do navegador iniciar o download de fato.
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
    return;
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64 = arrayBufferToBase64(arrayBuffer);
  const filePath = `${FileSystem.documentDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(filePath, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(filePath, {
      mimeType: "application/pdf",
      dialogTitle: "Compartilhar Relatorio de Producao",
    });
  }
}
