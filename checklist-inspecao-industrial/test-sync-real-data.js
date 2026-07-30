#!/usr/bin/env node

/**
 * Script de teste com dados REAIS (Alex e Altair)
 */

const http = require("http");

const testChecklists = [
  // Alex - Travessas
  {
    tabletId: "tablet-001",
    checklistType: "CL-ENG-1029",
    checklistCode: "travessa-alex-001",
    checklistData: {
      modelo: "5.1/2x10",
      executante: "Alex",
      executanteMatricula: "10",
      dataInicio: new Date().toISOString(),
      resultado: "OK",
      categoria: "Travessa",
    },
  },
  {
    tabletId: "tablet-001",
    checklistType: "CL-ENG-1029",
    checklistCode: "travessa-alex-002",
    checklistData: {
      modelo: "6.1/2x9",
      executante: "Alex",
      executanteMatricula: "10",
      dataInicio: new Date().toISOString(),
      resultado: "OK",
      categoria: "Travessa",
    },
  },
  // Altair - Laterais
  {
    tabletId: "tablet-002",
    checklistType: "CL-ENG-1030",
    checklistCode: "lateral-altair-001",
    checklistData: {
      modelo: "Ride Master",
      executante: "Altair",
      executanteMatricula: "4",
      dataInicio: new Date().toISOString(),
      resultado: "OK",
      categoria: "Lateral",
    },
  },
  {
    tabletId: "tablet-002",
    checklistType: "CL-ENG-1030",
    checklistCode: "lateral-altair-002",
    checklistData: {
      modelo: "Motion Control",
      executante: "Altair",
      executanteMatricula: "4",
      dataInicio: new Date().toISOString(),
      resultado: "NÃO OK",
      categoria: "Lateral",
    },
  },
  // Alex - Mais uma
  {
    tabletId: "tablet-001",
    checklistType: "CL-ENG-1031",
    checklistCode: "travessa-alex-003",
    checklistData: {
      modelo: "Barber",
      executante: "Alex",
      executanteMatricula: "10",
      dataInicio: new Date().toISOString(),
      resultado: "OK",
      categoria: "Travessa",
    },
  },
];

async function sendTestData() {
  console.log("🚀 Enviando dados REAIS (Alex e Altair)...\n");

  for (const checklist of testChecklists) {
    try {
      console.log(
        `📤 ${checklist.checklistData.executante} - ${checklist.checklistData.modelo}`
      );

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
        console.log(`✅\n`);
      } else {
        console.log(`❌ Erro: ${response.status}\n`);
      }
    } catch (error) {
      console.error(`❌ Erro: ${error.message}\n`);
    }
  }

  console.log("\n✅ Teste concluído!");
  console.log("\n📊 Acesse o dashboard em:");
  console.log(
    "http://localhost:3000/api/dashboard/link/Z2V6aWVsc2V2ZXJpYW5vQGdtYWlsLmNvbToxNzcxODk1OTU5Mzk5"
  );
}

sendTestData();
