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

// API: Testar conexão com banco da empresa
router.post("/api/test-company-db", async (req: Request, res: Response) => {
  try {
    const { host, port, user, password, database } = req.body;

    if (!host || !port || !user || !password || !database) {
      return res.status(400).json({ error: "Credenciais incompletas" });
    }

    const connection = await connectToCompanyDb({
      host,
      port: parseInt(port),
      user,
      password,
      database,
    });

    await connection.end();
    res.json({ success: true, message: "Conexão bem-sucedida!" });
  } catch (error) {
    console.error("Erro ao testar conexão:", error);
    res.status(500).json({ error: "Falha ao conectar ao banco de dados" });
  }
});

// API: Salvar checklist no banco da empresa
router.post("/api/save-checklist", async (req: Request, res: Response) => {
  try {
    const {
      dbCredentials,
      checklist,
      tableName = "checklists_inspecao",
    } = req.body;

    if (!dbCredentials || !checklist) {
      return res.status(400).json({ error: "Dados incompletos" });
    }

    const connection = await connectToCompanyDb(dbCredentials);

    // Verificar se a tabela existe, se não, criar
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        checklist_code VARCHAR(50),
        categoria VARCHAR(50),
        inspector_name VARCHAR(100),
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        checklist_data JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await connection.execute(createTableQuery);

    // Inserir checklist
    const insertQuery = `
      INSERT INTO ${tableName} (
        checklist_code,
        categoria,
        inspector_name,
        checklist_data
      ) VALUES (?, ?, ?, ?)
    `;

    const [result] = await connection.execute(insertQuery, [
      checklist.checklistCode || null,
      checklist.categoria || null,
      checklist.inspectorName || null,
      JSON.stringify(checklist),
    ]);

    await connection.end();

    res.json({
      success: true,
      message: "Checklist salvo com sucesso!",
      id: (result as any).insertId,
    });
  } catch (error) {
    console.error("Erro ao salvar checklist:", error);
    res.status(500).json({ error: "Falha ao salvar checklist" });
  }
});

// API: Obter checklists do banco da empresa
router.post("/api/get-checklists", async (req: Request, res: Response) => {
  try {
    const {
      dbCredentials,
      tableName = "checklists_inspecao",
      limit = 100,
    } = req.body;

    if (!dbCredentials) {
      return res.status(400).json({ error: "Credenciais não fornecidas" });
    }

    const connection = await connectToCompanyDb(dbCredentials);

    const query = `
      SELECT * FROM ${tableName}
      ORDER BY completed_at DESC
      LIMIT ?
    `;

    const [rows] = await connection.execute(query, [limit]);

    await connection.end();

    res.json({
      success: true,
      checklists: rows,
    });
  } catch (error) {
    console.error("Erro ao obter checklists:", error);
    res.status(500).json({ error: "Falha ao obter checklists" });
  }
});

// API: Obter estatísticas do banco da empresa
router.post("/api/get-stats", async (req: Request, res: Response) => {
  try {
    const { dbCredentials, tableName = "checklists_inspecao" } = req.body;

    if (!dbCredentials) {
      return res.status(400).json({ error: "Credenciais não fornecidas" });
    }

    const connection = await connectToCompanyDb(dbCredentials);

    const countQuery = `SELECT COUNT(*) as total FROM ${tableName}`;
    const [countResult] = await connection.execute(countQuery);
    const total = (countResult as any)[0]?.total || 0;

    const lastQuery = `
      SELECT * FROM ${tableName}
      ORDER BY completed_at DESC
      LIMIT 1
    `;
    const [lastResult] = await connection.execute(lastQuery);
    const lastChecklist = (lastResult as any)[0] || null;

    await connection.end();

    res.json({
      success: true,
      stats: {
        total,
        lastChecklist,
      },
    });
  } catch (error) {
    console.error("Erro ao obter estatísticas:", error);
    res.status(500).json({ error: "Falha ao obter estatísticas" });
  }
});

export default router;
