import { Router, Request, Response } from "express";
import { getDb } from "../db";
import { completedChecklists } from "../../drizzle/schema";
import { and, gte, lte, eq, sql } from "drizzle-orm";

const router = Router();

// Rota para obter dados do dashboard com filtros
router.get("/api/dashboard-realtime", async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, email } = req.query;
    const db = await getDb();
    
    if (!db) {
      return res.status(500).json({ error: "Banco de dados não disponível" });
    }

    let whereConditions: any[] = [];

    // Filtrar por email se fornecido
    if (email) {
      whereConditions.push(eq(completedChecklists.email, email as string));
    }

    // Filtrar por data se fornecido (usando DATE() para comparar apenas a data, ignorando hora)
    if (startDate) {
      whereConditions.push(sql`DATE(${completedChecklists.createdAt}) >= ${startDate}`);
    }

    if (endDate) {
      whereConditions.push(sql`DATE(${completedChecklists.createdAt}) <= ${endDate}`);
    }

    // Buscar checklists do banco de dados
    let query: any = db.select().from(completedChecklists);
    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions));
    }

    const allChecklists: any[] = await query;

    // Calcular estatísticas
    const totalProducido = allChecklists.length;

    // Contar travessas e laterais baseado na categoria
    const travessas = allChecklists.filter((item: any) => {
      const categoria = item.categoria?.toLowerCase() || "";
      return categoria.includes("travessa");
    }).length;
    const laterais = totalProducido - travessas;

    // Agrupar por executante
    const porExecutante: { [key: string]: number } = {};
    allChecklists.forEach((item: any) => {
      const executante = item.executante || "Desconhecido";
      porExecutante[executante] = (porExecutante[executante] || 0) + 1;
    });

    // Agrupar por modelo
    const porModelo: { [key: string]: number } = {};
    allChecklists.forEach((item: any) => {
      const modelo = item.modelo || "Desconhecido";
      porModelo[modelo] = (porModelo[modelo] || 0) + 1;
    });

    // Agrupar por data
    const porData: { [key: string]: { travessas: number; laterais: number } } = {};
    allChecklists.forEach((item: any) => {
      const data = new Date(item.createdAt).toLocaleDateString("pt-BR");
      if (!porData[data]) {
        porData[data] = { travessas: 0, laterais: 0 };
      }

      const categoria = item.categoria?.toLowerCase() || "";
      if (categoria.includes("travessa")) {
        porData[data].travessas++;
      } else {
        porData[data].laterais++;
      }
    });

    res.json({
      totalProducido,
      travessas,
      laterais,
      porExecutante,
      porModelo,
      porData,
      checklists: allChecklists.slice(0, 100), // Limitar a 100 para não sobrecarregar
    });
  } catch (error) {
    console.error("Erro ao obter dados do dashboard:", error);
    res.status(500).json({ error: "Erro ao obter dados" });
  }
});

// Rota para exibir o dashboard
router.get("/api/dashboard/link/:hash", (req: Request, res: Response) => {
  const { hash } = req.params;
  
  // Decodificar o email do hash (base64)
  let email = "";
  try {
    email = Buffer.from(hash, "base64").toString("utf-8");
    // Validar se eh um email valido
    if (!email || !email.includes("@")) {
      email = "";
    }
  } catch (error) {
    console.error("Erro ao decodificar hash:", error);
  }
  
  // Se nao conseguiu decodificar o email, retornar erro
  if (!email) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Erro - Dashboard</title>
        <style>
          body { font-family: Arial, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #f5f5f5; }
          .error-box { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
          h1 { color: #dc2626; margin-bottom: 10px; }
          p { color: #666; margin-bottom: 20px; }
          code { background: #f3f4f6; padding: 10px; border-radius: 4px; display: block; margin: 10px 0; word-break: break-all; }
        </style>
      </head>
      <body>
        <div class="error-box">
          <h1>Erro</h1>
          <p>Hash invalido ou email nao encontrado.</p>
          <p>Verifique se o link esta correto.</p>
          <code>${hash}</code>
        </div>
      </body>
      </html>
    `);
  }

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Dashboard de Controle de Produção</title>
      <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"></script>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 20px;
        }

        .container {
          max-width: 1400px;
          margin: 0 auto;
        }

        .header {
          background: white;
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 20px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .header h1 {
          color: #333;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .header p {
          color: #666;
          font-size: 14px;
        }

        .status {
          display: inline-block;
          background: #10b981;
          color: white;
          padding: 8px 12px;
          border-radius: 20px;
          font-size: 12px;
          margin-top: 10px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 20px;
        }

        .stat-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          border-radius: 12px;
          text-align: center;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .stat-card h3 {
          font-size: 32px;
          margin-bottom: 5px;
          font-weight: bold;
        }

        .stat-card p {
          font-size: 14px;
          opacity: 0.9;
        }

        .filters {
          background: white;
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 20px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .filters h3 {
          margin-bottom: 15px;
          color: #333;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .filter-buttons {
          display: flex;
          gap: 10px;
          margin-bottom: 15px;
          flex-wrap: wrap;
        }

        .filter-btn {
          padding: 8px 16px;
          border: 2px solid #ddd;
          border-radius: 20px;
          background: white;
          color: #333;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .filter-btn:hover {
          border-color: #4f46e5;
          color: #4f46e5;
        }

        .filter-btn.active {
          background: #4f46e5;
          color: white;
          border-color: #4f46e5;
        }

        .filter-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 15px;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
        }

        .filter-group label {
          font-size: 14px;
          color: #666;
          margin-bottom: 5px;
          font-weight: 500;
        }

        .filter-group input {
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 14px;
        }

        .button-group {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
        }

        button {
          padding: 12px 20px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-apply {
          background: #4f46e5;
          color: white;
        }

        .btn-apply:hover {
          background: #4338ca;
        }

        .btn-clear {
          background: #6b7280;
          color: white;
        }

        .btn-clear:hover {
          background: #4b5563;
        }

        .btn-download {
          background: #10b981;
          color: white;
          grid-column: 1 / -1;
        }

        .btn-download:hover {
          background: #059669;
        }

        .charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
          gap: 20px;
          margin-bottom: 20px;
        }

        .chart-card {
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .chart-card h3 {
          color: #333;
          margin-bottom: 15px;
          font-size: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .chart-container {
          position: relative;
          height: 300px;
        }

        .full-width {
          grid-column: 1 / -1;
        }

        .chart-container.full-width {
          height: 400px;
        }

        .table-section {
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          margin-top: 20px;
          overflow-x: auto;
        }

        .table-section h3 {
          color: #333;
          margin-bottom: 15px;
          font-size: 16px;
        }

        .checklists-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .checklists-table thead {
          background: #f3f4f6;
          border-bottom: 2px solid #e5e7eb;
        }

        .checklists-table th {
          padding: 10px;
          text-align: left;
          font-weight: 600;
          color: #333;
        }

        .checklists-table td {
          padding: 10px;
          border-bottom: 1px solid #e5e7eb;
          color: #666;
        }

        .checklists-table tbody tr:hover {
          background: #f9fafb;
        }

        .btn-ver-pdf {
          background: #3b82f6;
          color: white;
          padding: 5px 10px;
          border: none;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-ver-pdf:hover {
          background: #2563eb;
        }

        @media (max-width: 768px) {
          .charts-grid {
            grid-template-columns: 1fr;
          }

          .button-group {
            grid-template-columns: 1fr;
          }

          .filter-row {
            grid-template-columns: 1fr;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📊 Dashboard de Controle de Produção</h1>
          <p>Acompanhe a produção de contas laterais/travessas e desempenho dos inspetores</p>
          <div class="status">● Conectado em tempo real</div>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <h3 id="totalProducido">0</h3>
            <p>Total Produzido</p>
          </div>
          <div class="stat-card">
            <h3 id="travessas">0</h3>
            <p>Travessas</p>
          </div>
          <div class="stat-card">
            <h3 id="laterais">0</h3>
            <p>Laterais</p>
          </div>
        </div>

        <div class="filters">
          <h3>🔍 Filtros</h3>
          <div class="filter-buttons">
            <button class="filter-btn active" onclick="setFiltroRapido('hoje')">Hoje</button>
            <button class="filter-btn" onclick="setFiltroRapido('semana')">Semana</button>
            <button class="filter-btn" onclick="setFiltroRapido('mes')">Mês</button>
            <button class="filter-btn" onclick="setFiltroRapido('ano')">Ano</button>
            <button class="filter-btn" onclick="setFiltroRapido('periodo')">📅 Período</button>
          </div>
          <div class="filter-row" id="filtroPersonalizadoContainer" style="display: none;">
            <div class="filter-group">
              <label>Data Inicial</label>
              <input type="date" id="startDate" placeholder="dd/mm/aaaa">
            </div>
            <div class="filter-group">
              <label>Data Final</label>
              <input type="date" id="endDate" placeholder="dd/mm/aaaa">
            </div>
          </div>
          <div class="button-group">
            <button class="btn-apply" onclick="aplicarFiltros()">⚡ Aplicar Filtros</button>
            <button class="btn-clear" onclick="limparFiltros()">🗑️ Limpar Filtros</button>
            <button class="btn-download" onclick="baixarChecklists()">📥 Baixar Checklists</button>
          </div>
        </div>

        <div class="charts-grid">
          <div class="chart-card">
            <h3>📊 Travessas vs Laterais (Geral)</h3>
            <div class="chart-container">
              <canvas id="travessasVsLateraisChart"></canvas>
            </div>
          </div>

          <div class="chart-card">
            <h3>👷 Desempenho por Executante (Mão de Obra)</h3>
            <div class="chart-container">
              <canvas id="desempenhoExecutanteChart"></canvas>
            </div>
          </div>

          <div class="chart-card full-width">
            <h3>📦 Produção por Modelo</h3>
            <div class="chart-container full-width">
              <canvas id="producaoModeloChart"></canvas>
            </div>
          </div>
        </div>

        <div class="table-section">
          <h3>📋 Últimos Checklists</h3>
          <table class="checklists-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Categoria</th>
                <th>Inspetor</th>
                <th>Data</th>
                <th>Status</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody id="checklistsTableBody">
              <tr>
                <td colspan="6" style="text-align: center; color: #999;">Carregando...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <script>
        const email = "${email}";
        let chartInstances = {};

        async function carregarDados() {
          try {
            const params = new URLSearchParams();
            params.append("email", email);

            const startDate = document.getElementById("startDate").value;
            const endDate = document.getElementById("endDate").value;

            if (startDate) params.append("startDate", startDate);
            if (endDate) params.append("endDate", endDate);

            const response = await fetch(\`/api/dashboard-realtime?\${params}\`);
            const dados = await response.json();

            // Atualizar contadores
            document.getElementById("totalProducido").textContent = dados.totalProducido || 0;
            document.getElementById("travessas").textContent = dados.travessas || 0;
            document.getElementById("laterais").textContent = dados.laterais || 0;

            // Atualizar gráficos
            atualizarGraficos(dados);
            
            // Atualizar tabela
            atualizarTabela(dados);
          } catch (error) {
            console.error("Erro ao carregar dados:", error);
          }
        }

        function atualizarTabela(dados) {
          const tbody = document.getElementById('checklistsTableBody');
          
          if (!dados.checklists || dados.checklists.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #999;">Nenhum checklist encontrado</td></tr>';
            return;
          }

          tbody.innerHTML = dados.checklists.map((item, idx) => {
            const data = new Date(item.createdAt).toLocaleDateString('pt-BR');
            let statusText = '⊘ N/A';
            let statusColor = '#999';
            
            if (item.resultado === 'OK') {
              statusText = '✓ OK';
              statusColor = '#10b981';
            } else if (item.resultado === 'NAO_OK') {
              statusText = '✗ Não OK';
              statusColor = '#ef4444';
            }
            
            const pdfPath = item.pdfFileName || item.pdf_file_path || '';
            const btnDisabled = !pdfPath ? 'disabled' : '';
            const btnStyle = !pdfPath ? 'opacity: 0.5; cursor: not-allowed;' : '';
            
            return '<tr>' +
              '<td>' + (item.codigo || '-') + '</td>' +
              '<td>' + (item.categoria || '-') + '</td>' +
              '<td>' + (item.executante || '-') + '</td>' +
              '<td>' + data + '</td>' +
              '<td><span style="color: ' + statusColor + '; font-weight: 600;">' + statusText + '</span></td>' +
              '<td>' +
              '<button class="btn-ver-pdf" ' + btnDisabled + ' style="' + btnStyle + '" onclick="downloadChecklistPDF(' + idx + ')">📥 Ver</button>' +
              '</td>' +
              '</tr>';
          }).join('');
          
          window.checklistsCache = dados.checklists;
        }

        function downloadChecklistPDF(idx) {
          try {
            if (!window.checklistsCache || !window.checklistsCache[idx]) {
              alert('Checklist nao encontrado');
              return;
            }
            
            const item = window.checklistsCache[idx];
            const pdfPath = item.pdfFileName || item.pdf_file_path;
            
            if (!pdfPath) {
              alert('PDF nao disponivel para este checklist');
              return;
            }
            
            // Usar rota do servidor para download
            const downloadUrl = '/api/download-pdf?filePath=' + encodeURIComponent(pdfPath);
            const fileName = pdfPath.split('/').pop() || 'checklist.pdf';
            
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Mostrar mensagem de sucesso
            alert('Download iniciado: ' + fileName);
          } catch (e) {
            console.error('Erro ao baixar PDF:', e);
            alert('Erro ao baixar PDF: ' + e.message);
          }
        }

        function atualizarGraficos(dados) {
          // Gráfico Travessas vs Laterais
          const ctx1 = document.getElementById("travessasVsLateraisChart").getContext("2d");
          if (chartInstances.travessasVsLaterais) {
            chartInstances.travessasVsLaterais.destroy();
          }
          chartInstances.travessasVsLaterais = new Chart(ctx1, {
            type: "doughnut",
            data: {
              labels: ["Travessas", "Laterais"],
              datasets: [
                {
                  data: [dados.travessas || 0, dados.laterais || 0],
                  backgroundColor: ["#a855f7", "#3b82f6"],
                  borderColor: ["#fff", "#fff"],
                  borderWidth: 2,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: "bottom",
                },
              },
            },
          });

          // Gráfico Desempenho por Executante
          const executantes = Object.keys(dados.porExecutante || {});
          const quantidades = Object.values(dados.porExecutante || {});

          const ctx2 = document.getElementById("desempenhoExecutanteChart").getContext("2d");
          if (chartInstances.desempenhoExecutante) {
            chartInstances.desempenhoExecutante.destroy();
          }
          chartInstances.desempenhoExecutante = new Chart(ctx2, {
            type: "bar",
            data: {
              labels: executantes,
              datasets: [
                {
                  label: "Quantidade",
                  data: quantidades,
                  backgroundColor: "#10b981",
                  borderColor: "#059669",
                  borderWidth: 1,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              indexAxis: "y",
              plugins: {
                legend: {
                  display: true,
                },
              },
            },
          });

          // Gráfico Produção por Modelo
          const modelos = Object.keys(dados.porModelo || {});
          const modeloQuantidades = Object.values(dados.porModelo || {});

          const ctx3 = document.getElementById("producaoModeloChart").getContext("2d");
          if (chartInstances.producaoModelo) {
            chartInstances.producaoModelo.destroy();
          }
          chartInstances.producaoModelo = new Chart(ctx3, {
            type: "bar",
            data: {
              labels: modelos,
              datasets: [
                {
                  label: "Quantidade",
                  data: modeloQuantidades,
                  backgroundColor: "#f59e0b",
                  borderColor: "#d97706",
                  borderWidth: 1,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: true,
                },
              },
            },
          });
        }

        function setFiltroRapido(tipo) {
          const hoje = new Date();
          let startDate, endDate;

          // Atualizar botões ativos
          document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
          event.target.classList.add('active');

          // Mostrar/ocultar campo personalizado
          const container = document.getElementById('filtroPersonalizadoContainer');
          if (tipo === 'periodo') {
            container.style.display = 'grid';
            return;
          } else {
            container.style.display = 'none';
          }

          // Calcular datas
          switch(tipo) {
            case 'hoje':
              startDate = new Date(hoje);
              endDate = new Date(hoje);
              break;
            case 'semana':
              startDate = new Date(hoje);
              startDate.setDate(hoje.getDate() - 7);
              endDate = new Date(hoje);
              break;
            case 'mes':
              startDate = new Date(hoje);
              startDate.setMonth(hoje.getMonth() - 1);
              endDate = new Date(hoje);
              break;
            case 'ano':
              startDate = new Date(hoje);
              startDate.setFullYear(hoje.getFullYear() - 1);
              endDate = new Date(hoje);
              break;
          }

          if (startDate && endDate) {
            // Converter para data local (YYYY-MM-DD) sem timezone
            const startStr = startDate.getFullYear() + '-' + 
                            String(startDate.getMonth() + 1).padStart(2, '0') + '-' + 
                            String(startDate.getDate()).padStart(2, '0');
            const endStr = endDate.getFullYear() + '-' + 
                          String(endDate.getMonth() + 1).padStart(2, '0') + '-' + 
                          String(endDate.getDate()).padStart(2, '0');
            document.getElementById('startDate').value = startStr;
            document.getElementById('endDate').value = endStr;
            carregarDados();
          }
        }

        function aplicarFiltros() {
          carregarDados();
        }

        function limparFiltros() {
          document.getElementById("startDate").value = "";
          document.getElementById("endDate").value = "";
          document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
          document.querySelector('.filter-btn').classList.add('active');
          carregarDados();
        }

        function baixarChecklists() {
          const startDate = document.getElementById('startDate').value;
          const endDate = document.getElementById('endDate').value;
          const email = new URLSearchParams(window.location.search).get('email');

          if (!email) {
            alert('Email não encontrado!');
            return;
          }

          // Construir URL com parâmetros
          let url = '/api/download-checklists?email=' + encodeURIComponent(email);
          if (startDate) {
            url += '&startDate=' + encodeURIComponent(startDate);
          }
          if (endDate) {
            url += '&endDate=' + encodeURIComponent(endDate);
          }

          // Fazer download
          const link = document.createElement('a');
          link.href = url;
          link.download = 'checklists-' + new Date().getTime() + '.zip';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }

        // Carregar dados ao abrir a página
        carregarDados();

        // Atualizar a cada 60 segundos (1 minuto)
        setInterval(carregarDados, 60000);
      </script>
    </body>
    </html>
  `;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

// Rota para download de PDF individual
router.get("/api/download-pdf", async (req: Request, res: Response) => {
  try {
    const { filePath } = req.query;
    
    if (!filePath || typeof filePath !== 'string') {
      return res.status(400).json({ error: "filePath não fornecido" });
    }

    // Importar fs para ler arquivo
    const fs = await import('fs').then(m => m.promises);
    const path = await import('path');

    // Validar caminho para evitar directory traversal
    const normalizedPath = path.normalize(filePath);
    if (normalizedPath.includes('..')) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    try {
      // Tentar ler o arquivo
      const fileBuffer = await fs.readFile(normalizedPath);
      const fileName = path.basename(normalizedPath);
      
      // Configurar headers para download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', fileBuffer.length);
      
      // Enviar arquivo
      res.send(fileBuffer);
    } catch (fileError: any) {
      console.error("Erro ao ler arquivo:", fileError);
      return res.status(404).json({ error: "Arquivo não encontrado", path: normalizedPath });
    }
  } catch (error) {
    console.error("Erro ao fazer download de PDF:", error);
    res.status(500).json({ error: "Erro ao fazer download" });
  }
});

// Rota para upload de PDF
router.post("/api/upload-pdf", async (req: Request, res: Response) => {
  try {
    const { fileName, fileData } = req.body;
    
    if (!fileName || !fileData) {
      return res.status(400).json({ error: "fileName ou fileData nao fornecido" });
    }

    // Importar fs para salvar arquivo
    const fs = await import('fs').then(m => m.promises);
    const path = await import('path');
    const os = await import('os');

    // Criar diretorio /tmp/pdfs se nao existir
    const pdfDir = path.join(os.tmpdir(), 'pdfs');
    try {
      await fs.mkdir(pdfDir, { recursive: true });
    } catch (mkdirError) {
      console.warn("Aviso ao criar diretorio:", mkdirError);
    }

    // Salvar arquivo PDF
    const filePath = path.join(pdfDir, fileName);
    const buffer = Buffer.from(fileData, 'base64');
    await fs.writeFile(filePath, buffer);

    // Retornar URL para acesso
    const pdfUrl = `/api/download-pdf?filePath=${encodeURIComponent(filePath)}`;

    res.json({
      success: true,
      message: "PDF enviado com sucesso",
      pdfUrl,
      filePath,
    });
  } catch (error) {
    console.error("Erro ao fazer upload de PDF:", error);
    res.status(500).json({ error: "Erro ao fazer upload de PDF" });
  }
});

export default router;
