import { AdminConfig } from "./admin-config-context";

export interface ChecklistDataForDb {
  checklistCode: string;
  checklistName: string;
  categoria: string;
  modelo: string;
  resultado: string;
  inspectorName: string;
  inspectorMatricula: string;
  dataRecuperacao: string;
  dataFabricacao: string;
  numeroOP: string;
  numeroSerie: string;
  etapas: any[];
  assinaturas: any;
  timestamp: number;
}

/**
 * Salva um checklist completado no banco de dados da empresa
 * @param checklist - Dados do checklist completado
 * @param adminConfig - Configuração do administrador com credenciais do banco
 * @returns Promise com resultado da operação
 */
export async function saveChecklistToCompanyDb(
  checklistData: ChecklistDataForDb,
  adminConfig: AdminConfig
): Promise<{ success: boolean; message: string; id?: number }> {
  try {
    // Validar se as credenciais do banco estão configuradas
    if (!adminConfig.network.host || !adminConfig.network.port || !adminConfig.network.database) {
      return {
        success: false,
        message: "Credenciais do banco de dados não configuradas. Configure na Área do Administrador.",
      };
    }

    // Chamar API do servidor para salvar no banco
    const response = await fetch("/api/save-checklist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dbCredentials: {
          host: adminConfig.network.host,
          port: parseInt(adminConfig.network.port),
          user: adminConfig.network.usuario,
          password: adminConfig.network.senha,
          database: adminConfig.network.database,
        },
        checklist: checklistData,
        tableName: "checklists_inspecao",
      }),
    });

    // Validar status HTTP
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro HTTP ao salvar checklist:", response.status, errorText);
      return {
        success: false,
        message: `Erro HTTP ${response.status}: ${errorText || "Erro desconhecido"}`,
      };
    }

    // Tentar fazer parse do JSON com validação
    let result;
    try {
      const responseText = await response.text();
      console.log("Resposta bruta do servidor:", responseText);
      
      if (!responseText || responseText === "null" || responseText === "undefined") {
        return {
          success: false,
          message: "Servidor retornou resposta vazia ou inválida",
        };
      }
      
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Erro ao fazer parse do JSON:", parseError);
      return {
        success: false,
        message: `Erro ao processar resposta do servidor: ${parseError instanceof Error ? parseError.message : "Desconhecido"}`,
      };
    }

    if (result.success) {
      return {
        success: true,
        message: "Checklist salvo no banco de dados com sucesso!",
        id: result.id,
      };
    } else {
      return {
        success: false,
        message: result.error || "Erro desconhecido ao salvar checklist",
      };
    }
  } catch (error) {
    console.error("Erro ao salvar checklist no banco:", error);
    return {
      success: false,
      message: `Erro ao conectar ao banco de dados: ${error instanceof Error ? error.message : "Desconhecido"}`,
    };
  }
}

/**
 * Testa a conexão com o banco de dados da empresa
 * @param adminConfig - Configuração do administrador com credenciais do banco
 * @returns Promise com resultado do teste
 */
export async function testCompanyDbConnection(
  adminConfig: AdminConfig
): Promise<{ success: boolean; message: string }> {
  try {
    if (!adminConfig.network.host || !adminConfig.network.port || !adminConfig.network.database) {
      return {
        success: false,
        message: "Credenciais do banco de dados não configuradas.",
      };
    }

    const response = await fetch("/api/test-company-db", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        host: adminConfig.network.host,
        port: parseInt(adminConfig.network.port),
        user: adminConfig.network.usuario,
        password: adminConfig.network.senha,
        database: adminConfig.network.database,
      }),
    });

    // Validar status HTTP
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro HTTP ao testar conexão:", response.status, errorText);
      return {
        success: false,
        message: `Erro HTTP ${response.status}: ${errorText || "Erro desconhecido"}`,
      };
    }

    // Tentar fazer parse do JSON com validação
    let result;
    try {
      const responseText = await response.text();
      console.log("Resposta bruta do teste:", responseText);
      
      if (!responseText || responseText === "null" || responseText === "undefined") {
        return {
          success: false,
          message: "Servidor retornou resposta vazia ou inválida",
        };
      }
      
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Erro ao fazer parse do JSON:", parseError);
      return {
        success: false,
        message: `Erro ao processar resposta do servidor: ${parseError instanceof Error ? parseError.message : "Desconhecido"}`,
      };
    }

    if (result.success) {
      return {
        success: true,
        message: "Conexão com banco de dados bem-sucedida!",
      };
    } else {
      return {
        success: false,
        message: result.error || "Erro ao conectar ao banco de dados",
      };
    }
  } catch (error) {
    console.error("Erro ao testar conexão:", error);
    return {
      success: false,
      message: `Erro ao testar conexão: ${error instanceof Error ? error.message : "Desconhecido"}`,
    };
  }
}
