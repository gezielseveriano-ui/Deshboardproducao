/**
 * Script de teste para validar sincronização com servidor de produção
 */

const API_URL = "https://gateway03.us-east-1.prod.aws.tidcloud.com:4000";

async function testSync() {
  console.log("🧪 Testando sincronização com servidor de produção...\n");
  
  const testData = {
    tabletId: "tablet-prod-test-001",
    checklistType: "Lateral",
    checklistCode: "CL-ENG-1030",
    checklistData: {
      modelo: "Lateral Swing Motion 6.1/2x9",
      executante: "Alex",
      executanteMatricula: "10",
      dataInicio: new Date().toISOString(),
      resultado: "OK",
      categoria: "Lateral"
    }
  };

  try {
    console.log("📤 Enviando dados para:", `${API_URL}/api/sync-checklist`);
    console.log("📋 Dados:", JSON.stringify(testData, null, 2));
    
    const response = await fetch(`${API_URL}/api/sync-checklist`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testData),
    });

    console.log("\n✅ Status:", response.status, response.statusText);
    
    if (response.ok) {
      const result = await response.json();
      console.log("✅ Resposta:", JSON.stringify(result, null, 2));
      console.log("\n🎉 Sincronização bem-sucedida!");
    } else {
      const error = await response.text();
      console.log("❌ Erro:", error);
    }
  } catch (error) {
    console.error("❌ Erro ao sincronizar:", error);
  }
}

testSync();
