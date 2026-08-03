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

// API: Obter dados completos para o Dashboard
router.post("/api/dashboard/data", async (req: Request, res: Response) => {
  try {
    const {
      dbCredentials,
      tableName = "checklists_inspecao",
      dataInicio,
      dataFim,
    } = req.body;

    if (!dbCredentials) {
      return res.status(400).json({ error: "Credenciais não fornecidas" });
    }

    const connection = await connectToCompanyDb(dbCredentials);

    // Total geral
    let countQuery = `SELECT COUNT(*) as total FROM ${tableName}`;
    let params: any[] = [];

    if (dataInicio && dataFim) {
      countQuery += ` WHERE DATE(completed_at) BETWEEN ? AND ?`;
      params = [dataInicio, dataFim];
    }

    const [countResult] = await connection.execute(countQuery, params);
    const totalGeral = (countResult as any)[0]?.total || 0;

    // Travessas vs Laterais
    let typeQuery = `
      SELECT 
        CASE 
          WHEN categoria LIKE '%Travessa%' THEN 'Travessa'
          WHEN categoria LIKE '%Lateral%' THEN 'Lateral'
          ELSE 'Outro'
        END as tipo,
        COUNT(*) as quantidade
      FROM ${tableName}
    `;

    if (dataInicio && dataFim) {
      typeQuery += ` WHERE DATE(completed_at) BETWEEN ? AND ?`;
    }

    typeQuery += ` GROUP BY tipo`;

    const [typeResult] = await connection.execute(typeQuery, params);

    // Produção por executante (quem fez)
    let executanteQuery = `
      SELECT 
        inspector_name as executante,
        COUNT(*) as quantidade,
        MAX(completed_at) as ultima_atividade
      FROM ${tableName}
      WHERE inspector_name IS NOT NULL
    `;

    if (dataInicio && dataFim) {
      executanteQuery += ` AND DATE(completed_at) BETWEEN ? AND ?`;
    }

    executanteQuery += ` GROUP BY inspector_name ORDER BY quantidade DESC`;

    const [executanteResult] = await connection.execute(
      executanteQuery,
      dataInicio && dataFim ? [dataInicio, dataFim] : []
    );

    // Produção diária (últimos 7 dias)
    let dailyQuery = `
      SELECT 
        DATE(completed_at) as data,
        CASE 
          WHEN categoria LIKE '%Travessa%' THEN 'Travessa'
          WHEN categoria LIKE '%Lateral%' THEN 'Lateral'
          ELSE 'Outro'
        END as tipo,
        COUNT(*) as quantidade
      FROM ${tableName}
      WHERE completed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `;

    if (dataInicio && dataFim) {
      dailyQuery = `
        SELECT 
          DATE(completed_at) as data,
          CASE 
            WHEN categoria LIKE '%Travessa%' THEN 'Travessa'
            WHEN categoria LIKE '%Lateral%' THEN 'Lateral'
            ELSE 'Outro'
          END as tipo,
          COUNT(*) as quantidade
        FROM ${tableName}
        WHERE DATE(completed_at) BETWEEN ? AND ?
      `;
    }

    dailyQuery += ` GROUP BY data, tipo ORDER BY data DESC`;

    const [dailyResult] = await connection.execute(
      dailyQuery,
      dataInicio && dataFim ? [dataInicio, dataFim] : []
    );

    // Checklists recentes
    let recentQuery = `
      SELECT 
        id,
        checklist_code,
        categoria,
        inspector_name,
        completed_at,
        pdf_file_path,
        resultado,
        checklist_data
      FROM ${tableName}
    `;

    if (dataInicio && dataFim) {
      recentQuery += ` WHERE DATE(completed_at) BETWEEN ? AND ?`;
    }

    recentQuery += ` ORDER BY completed_at DESC LIMIT 50`;

    const [recentResult] = await connection.execute(
      recentQuery,
      dataInicio && dataFim ? [dataInicio, dataFim] : []
    );

    await connection.end();

    // Processar dados para o frontend
    const typeData = typeResult as any[];
    let travessas = 0;
    let laterais = 0;

    typeData.forEach((item: any) => {
      if (item.tipo === "Travessa") travessas = item.quantidade;
      if (item.tipo === "Lateral") laterais = item.quantidade;
    });

    res.json({
      success: true,
      data: {
        stats: {
          totalGeral,
          travessas,
          laterais,
        },
        executantes: executanteResult,
        diaria: dailyResult,
        checklists: recentResult,
      },
    });
  } catch (error) {
    console.error("Erro ao obter dados do dashboard:", error);
    res.status(500).json({ error: "Falha ao obter dados do dashboard" });
  }
});

// API: Baixar checklists em período específico
router.post("/api/dashboard/download-checklists", async (req: Request, res: Response) => {
  try {
    const {
      dbCredentials,
      tableName = "checklists_inspecao",
      dataInicio,
      dataFim,
    } = req.body;

    if (!dbCredentials || !dataInicio || !dataFim) {
      return res.status(400).json({ error: "Parâmetros incompletos" });
    }

    const connection = await connectToCompanyDb(dbCredentials);

    const query = `
      SELECT 
        id,
        categoria,
        inspector_name,
        completed_at,
        checklist_data
      FROM ${tableName}
      WHERE DATE(completed_at) BETWEEN ? AND ?
      ORDER BY completed_at DESC
    `;

    const [results] = await connection.execute(query, [dataInicio, dataFim]);

    await connection.end();

    res.json({
      success: true,
      checklists: results,
      count: (results as any[]).length,
      periodo: {
        inicio: dataInicio,
        fim: dataFim,
      },
    });
  } catch (error) {
    console.error("Erro ao baixar checklists:", error);
    res.status(500).json({ error: "Falha ao baixar checklists" });
  }
});

// API: Obter dados filtrados por executante
router.post("/api/dashboard/executante-stats", async (req: Request, res: Response) => {
  try {
    const {
      dbCredentials,
      tableName = "checklists_inspecao",
      executante,
      dataInicio,
      dataFim,
    } = req.body;

    if (!dbCredentials || !executante) {
      return res.status(400).json({ error: "Parâmetros incompletos" });
    }

    const connection = await connectToCompanyDb(dbCredentials);

    let query = `
      SELECT 
        CASE 
          WHEN categoria LIKE '%Travessa%' THEN 'Travessa'
          WHEN categoria LIKE '%Lateral%' THEN 'Lateral'
          ELSE 'Outro'
        END as tipo,
        COUNT(*) as quantidade
      FROM ${tableName}
      WHERE inspector_name = ?
    `;

    let params: any[] = [executante];

    if (dataInicio && dataFim) {
      query += ` AND DATE(completed_at) BETWEEN ? AND ?`;
      params.push(dataInicio, dataFim);
    }

    query += ` GROUP BY tipo`;

    const [results] = await connection.execute(query, params);

    await connection.end();

    res.json({
      success: true,
      executante,
      stats: results,
    });
  } catch (error) {
    console.error("Erro ao obter stats do executante:", error);
    res.status(500).json({ error: "Falha ao obter stats do executante" });
  }
});

export default router;
