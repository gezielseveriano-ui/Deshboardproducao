import { Router, Request, Response } from "express";
import { buildProductionReportPdfDocDefinition } from "../../shared/production-report-pdf-content";
import { renderPdfBuffer } from "../pdf";

// Gera o PDF do Relatório de Produção (aba Relatórios) no servidor - no
// web, expo-print não sabe renderizar HTML pra PDF (cai pra
// window.print(), que imprime a tela do app em vez do relatório), então
// o PDF de verdade precisa ser montado aqui, do mesmo jeito que o PDF de
// checklist já é.
const router = Router();

router.post("/api/relatorio-producao/pdf", async (req: Request, res: Response) => {
  try {
    const { periodo, dataGeracao, totalChecklists, categoriaResumo, modeloResumo, executanteCategoriaResumo } = req.body || {};

    if (!Array.isArray(categoriaResumo) || !Array.isArray(modeloResumo) || !Array.isArray(executanteCategoriaResumo)) {
      res.status(400).json({ error: "Dados do relatório inválidos" });
      return;
    }

    const docDefinition = buildProductionReportPdfDocDefinition({
      periodo: periodo || "",
      dataGeracao: dataGeracao || "",
      totalChecklists: Number(totalChecklists) || 0,
      categoriaResumo,
      modeloResumo,
      executanteCategoriaResumo,
    });

    const pdfBuffer = await renderPdfBuffer(docDefinition);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="relatorio-producao-${Date.now()}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error("[RelatorioProducaoPDF] Erro ao gerar PDF:", error);
    res.status(500).json({ error: "Erro ao gerar PDF do relatório" });
  }
});

export default router;
