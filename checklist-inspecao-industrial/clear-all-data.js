#!/usr/bin/env node

/**
 * Script para LIMPAR TODOS OS DADOS
 * - Limpa banco de dados do servidor
 * - Zera todos os checklists sincronizados
 * - Zera dashboard
 */

const http = require("http");

async function clearAllData() {
  console.log("🧹 Limpando TODOS os dados...\n");

  try {
    // 1. Limpar banco de dados do servidor
    console.log("1️⃣ Limpando banco de dados do servidor...");
    
    const response = await new Promise((resolve, reject) => {
      const options = {
        hostname: "localhost",
        port: 3000,
        path: "/api/admin/clear-all-data",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      };

      const req = http.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          resolve({ status: res.statusCode, data });
        });
      });

      req.on("error", (error) => {
        reject(error);
      });

      req.write(JSON.stringify({}));
      req.end();
    });

    if (response.status === 200) {
      console.log("✅ Banco de dados limpo com sucesso!\n");
    } else {
      console.log(`⚠️ Status: ${response.status}\n`);
    }

    // 2. Verificar dados após limpeza
    console.log("2️⃣ Verificando dados após limpeza...");
    
    const checkResponse = await new Promise((resolve, reject) => {
      const options = {
        hostname: "localhost",
        port: 3000,
        path: "/api/dashboard-realtime",
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      };

      const req = http.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          resolve(JSON.parse(data));
        });
      });

      req.on("error", (error) => {
        reject(error);
      });

      req.end();
    });

    console.log("📊 Status do Dashboard:");
    console.log(`   Total Produzido: ${checkResponse.totalProducido}`);
    console.log(`   Travessas: ${checkResponse.travessas}`);
    console.log(`   Laterais: ${checkResponse.laterais}`);
    console.log(`   Executantes: ${Object.keys(checkResponse.porExecutante).length}`);
    console.log(`   Modelos: ${Object.keys(checkResponse.porModelo).length}`);

    console.log("\n✅ LIMPEZA CONCLUÍDA!");
    console.log("\n📱 Próximas ações:");
    console.log("   1. Abra o Expo Go");
    console.log("   2. Limpe o cache do app (Settings > App Settings > Clear Cache)");
    console.log("   3. Gere novos checklists com dados reais");
    console.log("   4. Os dados aparecerão automaticamente no Dashboard");

  } catch (error) {
    console.error("❌ Erro:", error.message);
  }
}

clearAllData();
