import { WebSocketServer, WebSocket } from "ws";
import { Server as HTTPServer } from "http";
import type { IncomingMessage } from "http";

interface DashboardClient {
  ws: WebSocket;
  hash: string;
  connectedAt: Date;
}

const clients: Map<string, DashboardClient[]> = new Map();

export function setupWebSocketServer(server: HTTPServer) {
  const wss = new WebSocketServer({ server, path: "/ws/dashboard" });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const hash = url.searchParams.get("hash") || "default";

    console.log(`[WebSocket] Nova conexão para dashboard: ${hash}`);

    // Registrar cliente
    if (!clients.has(hash)) {
      clients.set(hash, []);
    }
    clients.get(hash)!.push({
      ws,
      hash,
      connectedAt: new Date(),
    });

    // Enviar confirmação de conexão
    ws.send(
      JSON.stringify({
        type: "connected",
        message: "Conectado ao dashboard em tempo real",
        timestamp: new Date().toISOString(),
      })
    );

    // Lidar com mensagens
    ws.on("message", (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        console.log(`[WebSocket] Mensagem recebida:`, message);

        // Echo back
        ws.send(
          JSON.stringify({
            type: "echo",
            data: message,
            timestamp: new Date().toISOString(),
          })
        );
      } catch (error) {
        console.error("[WebSocket] Erro ao processar mensagem:", error);
      }
    });

    // Lidar com desconexão
    ws.on("close", () => {
      console.log(`[WebSocket] Desconexão para dashboard: ${hash}`);
      const dashboardClients = clients.get(hash);
      if (dashboardClients) {
        const index = dashboardClients.findIndex((c) => c.ws === ws);
        if (index !== -1) {
          dashboardClients.splice(index, 1);
        }
      }
    });

    ws.on("error", (error: Error) => {
      console.error("[WebSocket] Erro:", error);
    });
  });

  console.log("[WebSocket] Servidor WebSocket configurado em /ws/dashboard");

  return wss;
}

export function notifyDashboard(
  hash: string,
  notification: {
    type: string;
    title: string;
    message: string;
    data?: any;
  }
) {
  const dashboardClients = clients.get(hash);
  if (!dashboardClients || dashboardClients.length === 0) {
    console.log(`[WebSocket] Nenhum cliente conectado para dashboard: ${hash}`);
    return;
  }

  const payload = {
    ...notification,
    timestamp: new Date().toISOString(),
  };

  dashboardClients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(payload));
    }
  });

  console.log(
    `[WebSocket] Notificação enviada para ${dashboardClients.length} cliente(s)`
  );
}

export function broadcastToAllDashboards(notification: {
  type: string;
  title: string;
  message: string;
  data?: any;
}) {
  clients.forEach((dashboardClients, hash) => {
    notifyDashboard(hash, notification);
  });
}

export function getConnectedClients(hash: string): number {
  return clients.get(hash)?.length || 0;
}

export function getAllConnectedClients(): number {
  let total = 0;
  clients.forEach((dashboardClients) => {
    total += dashboardClients.length;
  });
  return total;
}

// Funcao para enviar dados em tempo real para o dashboard
export function sendDashboardData(
  hash: string,
  data: {
    type: string;
    payload: any;
  }
) {
  const dashboardClients = clients.get(hash);
  if (!dashboardClients || dashboardClients.length === 0) {
    return;
  }

  const message = JSON.stringify({
    ...data,
    timestamp: new Date().toISOString(),
  });

  dashboardClients.forEach((client) => {
    if (client.ws.readyState === 1) {
      client.ws.send(message);
    }
  });

  console.log(
    `[WebSocket] Dados enviados para ${dashboardClients.length} cliente(s) do dashboard ${hash}`
  );
}
