#!/usr/bin/env node

/**
 * Script de teste para simular sincronização de dados dos 3 tablets
 * Envia dados de teste para o servidor e verifica o dashboard
 */

const http = require("http");

const API_URL = "http://localhost:3000";

// Dados de teste para simular 3 tablets
const testChecklists = [
  // Tablet 1 - Travessas
  {
    tabletId: "tablet-001",
    checklistType: "CL-ENG-1029",
    checklistCode: "travessa-001",
    checklistData: {
      modelo: "5.1/2x10",
      executante: "João Silva",
      dataInicio: new Date().toISOString(),
      resultado: "OK",
    },
  },
  {
    tabletId: "tablet-001",
    checklistType: "CL-ENG-1029",
    checklistCode: "travessa-002",
    checklistData: {
      modelo: "6.1/2x9",
      executante: "João Silva",
      dataInicio: new Date().toISOString(),
      resultado: "OK",
    },
  },
  // Tablet 2 - Laterais
  {
    tabletId: "tablet-002",
    checklistType: "CL-ENG-1030",
    checklistCode: "lateral-001",
    checklistData: {
      modelo: "Ride Master",
      executante: "Maria Santos",
      dataInicio: new Date().toISOString(),
      resultado: "OK",
    },
  },
  {
    tabletId: "tablet-002",
    checklistType: "CL-ENG-1030",
    checklistCode: "lateral-002",
    checklistData: {
      modelo: "Motion Control",
      executante: "Maria Santos",
      dataInicio: new Date().toISOString(),
      resultado: "NÃO OK",
    },
  },
  // Tablet 3 - Travessas
  {
    tabletId: "tablet-003",
    checklistType: "CL-ENG-1031",
    checklistCode: "travessa-003",
    checklistData: {
      modelo: "Barber",
      executante: "Pedro Costa",
      dataInicio: new Date().toISOString(),
      resultado: "OK",
    },
  },
  {
    tabletId: "tablet-003",
    checklistType: "CL-ENG-1031",
    checklistCode: "travessa-004",
    checklistData: {
      modelo: "Ride Control",
      executante: "Pedro Costa",
      dataInicio: new Date().toISOString(),
      resultado: "OK",
    },
  },
];

async function sendTestData() {
  console.log("🚀 Iniciando teste de sincronização...\n");

  for (const checklist of testChecklists) {
    try {
      console.log(`📤 Enviando: ${checklist.checklistCode} (${checklist.tabletId})`);

      const response = await new Promise((resolve, reject) => {
        const postData = JSON.stringify(checklist);

        const options = {
          hostname: "localhost",
          port: 3000,
          path: "/api/sync-checklist",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(postData),
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

        req.write(postData);
        req.end();
      });

      if (response.status === 200) {
        console.log(`✅ Sucesso!\n`);
      } else {
        console.log(`❌ Erro: ${response.status}\n`);
      }
    } catch (error) {
      console.error(`❌ Erro ao enviar: ${error.message}\n`);
    }
  }

  console.log("\n✅ Teste concluído!");
  console.log("\n📊 Acesse o dashboard em:");
  console.log("http://localhost:3000/api/dashboard/link/Z2V6aWVsc2V2ZXJpYW5vQGdtYWlsLmNvbToxNzcxODk1OTU5Mzk5");
}

sendTestData();
