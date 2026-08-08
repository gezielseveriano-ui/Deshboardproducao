import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import path from "path";
import { fileURLToPath } from "url";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import companyDbRouter from "../routes/company-db";
import dashboardRouter from "../routes/dashboard-page";
import dashboardApiRouter from "../routes/dashboard-api";
import dashboardLinksRouter from "../routes/dashboard-links";
import downloadChecklistsRouter from "../routes/download-checklists";
import syncChecklistRouter from "../routes/sync-checklist";
import painelDiretoriaRouter from "../routes/painel-diretoria";
import productionReportPdfRouter from "../routes/production-report-pdf";
import { setupWebSocketServer } from "../routes/websocket-notifications";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Enable CORS for all routes - reflect the request origin to support credentials
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );
    res.header("Access-Control-Allow-Credentials", "true");

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerOAuthRoutes(app);
  app.use(companyDbRouter);
  app.use(dashboardRouter);
  app.use(dashboardApiRouter);
  app.use(dashboardLinksRouter);
  app.use(downloadChecklistsRouter);
  app.use(syncChecklistRouter);
  app.use(painelDiretoriaRouter);
  app.use(productionReportPdfRouter);
  
  // Configurar WebSocket para notificações em tempo real
  setupWebSocketServer(server);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  // Adicionar suporte para GET em queries tRPC
  app.get("/api/trpc/:path", (req, res, next) => {
    // Converter GET para POST para tRPC
    req.method = "POST";
    next();
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  // Em produção, o build do app web (expo export --platform web) é servido
  // pelo mesmo processo/porta da API — um único serviço, uma única URL,
  // sem precisar configurar CORS entre front e back.
  if (process.env.NODE_ENV === "production") {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const webBuildPath = path.join(__dirname, "..", "dist-web");

    // index.html referencia o JS com hash do build atual (ex:
    // AppEntry-<hash>.js) - se o navegador (principalmente o modo
    // "standalone" de PWA instalada na tela de início do iOS, que já se
    // mostrou bem agressivo em cachear a página raiz) guardar esse
    // index.html em cache, o usuário fica preso pra sempre numa versão
    // antiga do app, mesmo depois de deploys novos - forçamos revalidação
    // sempre. Os arquivos com hash no nome (JS/CSS/imagens do bundle) são
    // seguros pra cache longo, já que o nome muda sempre que o conteúdo
    // muda.
    app.use(
      express.static(webBuildPath, {
        extensions: ["html"],
        setHeaders: (res, filePath) => {
          if (filePath.endsWith("index.html")) {
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
          } else if (filePath.includes(`${path.sep}_expo${path.sep}static${path.sep}`)) {
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          }
        },
      }),
    );

    // Fallback para index.html em qualquer rota GET não-API que não bateu
    // em um arquivo estático - necessário para links como o de
    // redefinição de senha do Supabase (/reset-password#access_token=...),
    // que não existem como página exportada, mas precisam carregar o app
    // para o próprio JS (via onAuthStateChange) tratar o token na URL.
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.sendFile(path.join(webBuildPath, "index.html"));
    });
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}

startServer().catch(console.error);
