import { Router, Request, Response } from "express";
import * as mysql from "mysql2/promise";

const router = Router();

// Interface para credenciais do banco da empresa
interface CompanyDbCredentials {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

// Função para conectar ao banco da empresa
async function connectToCompanyDb(credentials: CompanyDbCredentials) {
  try {
    const connection = await mysql.createConnection({
      host: credentials.host,
      port: credentials.port,
      user: credentials.user,
      password: credentials.password,
      database: credentials.database,
    });
    return connection;
  } catch (error) {
    console.error("Erro ao conectar ao banco da empresa:", error);
    throw error;
  }
}

// Função para decodificar credenciais do hash
function decodeCredentialsFromHash(hash: string): CompanyDbCredentials | null {
  try {
    // O hash é: email:timestamp (base64 encoded)
    // Precisamos armazenar as credenciais em um mapa em memória ou banco de dados
    // Por enquanto, vamos usar um mapa simples
    const decoded = Buffer.from(hash, "base64").toString("utf-8");
    console.log("Hash decodificado:", decoded);
    
    // Aqui você precisaria buscar as credenciais do banco de dados usando o email
    // Por enquanto, retornamos null e deixamos o usuário configurar
    return null;
  } catch (error) {
    console.error("Erro ao decodificar hash:", error);
    return null;
  }
}

// Rota: Dashboard HTML que lê dados do banco em tempo real
router.get("/dashboard/:hash", async (req: Request, res: Response) => {
  try {
    const { hash } = req.params;

    // Decodificar hash para obter credenciais
    const dbCredentials = decodeCredentialsFromHash(hash);

    const htmlContent = `<!DOCTYPE html>
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
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    
    header {
      background: white;
      padding: 30px;
      border-radius: 12px;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    h1 {
      color: #333;
      margin-bottom: 10px;
      font-size: 28px;
    }
    
    .subtitle {
      color: #666;
      font-size: 14px;
    }
    
    .config-section {
      background: white;
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .config-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 15px;
      color: #333;
    }
    
    .form-group {
      margin-bottom: 15px;
    }
    
    label {
      display: block;
      margin-bottom: 5px;
      color: #555;
      font-weight: 500;
      font-size: 14px;
    }
    
    input[type="text"],
    input[type="number"],
    input[type="password"] {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      font-family: inherit;
    }
    
    input[type="text"]:focus,
    input[type="number"]:focus,
    input[type="password"]:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
    
    .form-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
    }
    
    button {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(102, 126, 234, 0.4);
    }
    
    button:active {
      transform: translateY(0);
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .stat-card {
      background: white;
      padding: 25px;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      text-align: center;
    }
    
    .stat-value {
      font-size: 36px;
      font-weight: 700;
      color: #667eea;
      margin-bottom: 10px;
    }
    
    .stat-label {
      color: #666;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .chart-container {
      background: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .chart-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 15px;
      color: #333;
    }
    
    .table-container {
      background: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      overflow-x: auto;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    
    thead {
      background: #f8f9fa;
      border-bottom: 2px solid #e0e0e0;
    }
    
    th {
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #333;
    }
    
    td {
      padding: 12px;
      border-bottom: 1px solid #e0e0e0;
      color: #666;
    }
    
    tr:hover {
      background: #f8f9fa;
    }
    
    .status-ok {
      color: #22c55e;
      font-weight: 600;
    }
    
    .status-nok {
      color: #ef4444;
      font-weight: 600;
    }
    
    .loading {
      text-align: center;
      padding: 40px;
      color: #666;
    }
    
    .error {
      background: #fee;
      color: #c33;
      padding: 15px;
      border-radius: 6px;
      margin-bottom: 20px;
      border-left: 4px solid #c33;
    }
    
    .success {
      background: #efe;
      color: #3c3;
      padding: 15px;
      border-radius: 6px;
      margin-bottom: 20px;
      border-left: 4px solid #3c3;
    }
    
    .connection-status {
      display: inline-block;
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      margin-top: 10px;
    }
    
    .connection-status.connected {
      background: #d4edda;
      color: #155724;
    }
    
    .connection-status.disconnected {
      background: #f8d7da;
      color: #721c24;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>📊 Dashboard de Controle de Produção</h1>
      <p class="subtitle">Acompanhe a produção de contas laterais/travessas em tempo real</p>
    </header>
    
    <div class="config-section">
      <div class="config-title">⚙️ Configuração do Banco de Dados</div>
      <div class="form-row">
        <div class="form-group">
          <label>Host</label>
          <input type="text" id="dbHost" placeholder="localhost" value="localhost">
        </div>
        <div class="form-group">
          <label>Porta</label>
          <input type="number" id="dbPort" placeholder="3306" value="3306">
        </div>
        <div class="form-group">
          <label>Usuário</label>
          <input type="text" id="dbUser" placeholder="root">
        </div>
        <div class="form-group">
          <label>Senha</label>
          <input type="password" id="dbPassword" placeholder="senha">
        </div>
        <div class="form-group">
          <label>Banco de Dados</label>
          <input type="text" id="dbDatabase" placeholder="checklist_db">
        </div>
      </div>
      <button onclick="connectAndLoadData()">🔗 Conectar e Carregar Dados</button>
      <div id="connectionStatus" class="connection-status disconnected">● Desconectado</div>
    </div>
    
    <div id="messageContainer"></div>
    
    <div id="statsContainer" style="display: none;">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value" id="totalValue">0</div>
          <div class="stat-label">Total Produzido</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" id="travessasValue">0</div>
          <div class="stat-label">Travessas</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" id="lateraisValue">0</div>
          <div class="stat-label">Laterais</div>
        </div>
      </div>
      
      <div class="charts-grid">
        <div class="chart-container">
          <div class="chart-title">Travessas vs Laterais</div>
          <canvas id="typeChart"></canvas>
        </div>
        <div class="chart-container">
          <div class="chart-title">Produção Diária (Últimos 7 dias)</div>
          <canvas id="dailyChart"></canvas>
        </div>
      </div>
      
      <div class="table-container">
        <div class="chart-title">Últimos Checklists</div>
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Categoria</th>
              <th>Inspetor</th>
              <th>Data</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="tableBody">
            <tr>
              <td colspan="5" style="text-align: center; padding: 40px;">Carregando...</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
  
  <script>
    let typeChart = null;
    let dailyChart = null;
    
    async function connectAndLoadData() {
      const host = document.getElementById('dbHost').value;
      const port = document.getElementById('dbPort').value;
      const user = document.getElementById('dbUser').value;
      const password = document.getElementById('dbPassword').value;
      const database = document.getElementById('dbDatabase').value;
      
      if (!host || !port || !user || !password || !database) {
        showMessage('Por favor, preencha todos os campos', 'error');
        return;
      }
      
      try {
        const response = await fetch('/api/dashboard/data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dbCredentials: { host, port: parseInt(port), user, password, database },
            tableName: 'checklists_inspecao'
          })
        });
        
        if (!response.ok) {
          throw new Error('Erro ao conectar ao banco de dados');
        }
        
        const data = await response.json();
        updateDashboard(data);
        updateConnectionStatus(true);
        showMessage('Conexão bem-sucedida!', 'success');
      } catch (error) {
        console.error('Erro:', error);
        showMessage('Erro ao conectar: ' + error.message, 'error');
        updateConnectionStatus(false);
      }
    }
    
    function updateDashboard(data) {
      // Atualizar estatísticas
      document.getElementById('totalValue').textContent = data.totalGeral || 0;
      
      const typeData = data.porTipo || [];
      const travessas = typeData.find(t => t.tipo === 'Travessa')?.quantidade || 0;
      const laterais = typeData.find(t => t.tipo === 'Lateral')?.quantidade || 0;
      
      document.getElementById('travessasValue').textContent = travessas;
      document.getElementById('lateraisValue').textContent = laterais;
      
      // Mostrar container de dados
      document.getElementById('statsContainer').style.display = 'block';
      
      // Atualizar gráfico de tipos
      updateTypeChart(typeData);
      
      // Atualizar gráfico de produção diária
      updateDailyChart(data.producaoDiaria || []);
      
      // Atualizar tabela
      updateTable(data.checklists || []);
    }
    
    function updateTypeChart(data) {
      const ctx = document.getElementById('typeChart').getContext('2d');
      
      if (typeChart) {
        typeChart.destroy();
      }
      
      typeChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: data.map(d => d.tipo),
          datasets: [{
            data: data.map(d => d.quantidade),
            backgroundColor: ['#667eea', '#764ba2', '#f59e0b'],
            borderColor: ['#667eea', '#764ba2', '#f59e0b'],
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              position: 'bottom'
            }
          }
        }
      });
    }
    
    function updateDailyChart(data) {
      const ctx = document.getElementById('dailyChart').getContext('2d');
      
      if (dailyChart) {
        dailyChart.destroy();
      }
      
      // Agrupar por data
      const groupedByDate = {};
      data.forEach(d => {
        if (!groupedByDate[d.data]) {
          groupedByDate[d.data] = { Travessa: 0, Lateral: 0 };
        }
        groupedByDate[d.data][d.tipo] = d.quantidade;
      });
      
      const dates = Object.keys(groupedByDate).sort();
      const travessas = dates.map(d => groupedByDate[d].Travessa);
      const laterais = dates.map(d => groupedByDate[d].Lateral);
      
      dailyChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: dates,
          datasets: [
            {
              label: 'Travessas',
              data: travessas,
              borderColor: '#667eea',
              backgroundColor: 'rgba(102, 126, 234, 0.1)',
              tension: 0.4,
              fill: true
            },
            {
              label: 'Laterais',
              data: laterais,
              borderColor: '#764ba2',
              backgroundColor: 'rgba(118, 75, 162, 0.1)',
              tension: 0.4,
              fill: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              position: 'bottom'
            }
          },
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    }
    
    function updateTable(checklists) {
      const tbody = document.getElementById('tableBody');
      
      if (checklists.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px;">Nenhum checklist encontrado</td></tr>';
        return;
      }
      
      tbody.innerHTML = checklists.slice(0, 10).map(c => \`
        <tr>
          <td>\${c.checklist_code || '-'}</td>
          <td>\${c.categoria || '-'}</td>
          <td>\${c.inspector_name || '-'}</td>
          <td>\${new Date(c.completed_at).toLocaleDateString('pt-BR')}</td>
          <td><span class="status-ok">✓ OK</span></td>
        </tr>
      \`).join('');
    }
    
    function updateConnectionStatus(connected) {
      const status = document.getElementById('connectionStatus');
      if (connected) {
        status.textContent = '● Conectado';
        status.className = 'connection-status connected';
      } else {
        status.textContent = '● Desconectado';
        status.className = 'connection-status disconnected';
      }
    }
    
    function showMessage(message, type) {
      const container = document.getElementById('messageContainer');
      const div = document.createElement('div');
      div.className = type;
      div.textContent = message;
      container.innerHTML = '';
      container.appendChild(div);
      
      setTimeout(() => {
        div.remove();
      }, 5000);
    }
  </script>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(htmlContent);
  } catch (error) {
    console.error("Erro ao renderizar dashboard:", error);
    res.status(500).send("Erro ao carregar o dashboard");
  }
});

export default router;
