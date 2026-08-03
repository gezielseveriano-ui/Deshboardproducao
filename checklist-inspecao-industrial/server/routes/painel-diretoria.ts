import { Router, Request, Response } from "express";
import { parse as parseCookieHeader } from "cookie";
import crypto from "crypto";
import { getSupabaseAdmin } from "../supabase-admin";

// Cookie próprio (sem domain) - o painel é sempre acessado pela mesma
// origem, então não precisa (nem deve) do domain cross-subdomain usado
// pelo login do app. Setar domain=".onrender.com" faria o navegador
// rejeitar o cookie, já que onrender.com é um domínio público compartilhado
// por várias apps.
function cookieOptions(req: Request) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const secure =
    req.protocol === "https" ||
    (typeof forwardedProto === "string" && forwardedProto.split(",")[0].trim() === "https");

  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure,
  };
}

// Painel de análise para diretoria - um link separado do app (não usa o
// login do Supabase), protegido por uma senha simples fixa. Lê os
// checklists direto da tabela completed_checklists (a mesma fonte de
// verdade usada pelo app), então qualquer checklist novo aparece aqui sem
// precisar de nenhuma sincronização extra.
const router = Router();

const COOKIE_NAME = "painel_diretoria_auth";
const SENHA = process.env.PAINEL_DIRETORIA_SENHA || "mrs-diretoria-2026";

function hashSenha(senha: string): string {
  return crypto.createHash("sha256").update(senha).digest("hex");
}

const HASH_ESPERADO = hashSenha(SENHA);

function estaAutenticado(req: Request): boolean {
  const cookies = parseCookieHeader(req.headers.cookie || "");
  const valor = cookies[COOKIE_NAME];
  if (!valor) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(valor), Buffer.from(HASH_ESPERADO));
  } catch {
    return false;
  }
}

const ESTILO_BASE = `
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    background: #f3f4f6;
    color: #1f2937;
  }
`;

function paginaLogin(erro: boolean): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Painel de Diretoria - Login</title>
<style>
  ${ESTILO_BASE}
  body { display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  .card {
    background: white; border-radius: 12px; padding: 40px; width: 100%; max-width: 380px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.08);
  }
  h1 { font-size: 22px; margin: 0 0 4px; }
  p.sub { color: #6b7280; margin: 0 0 24px; font-size: 14px; }
  input[type="password"] {
    width: 100%; padding: 12px 14px; border: 1px solid #d1d5db; border-radius: 8px;
    font-size: 16px; margin-bottom: 16px;
  }
  button {
    width: 100%; padding: 12px; border: none; border-radius: 8px; background: #1e40af;
    color: white; font-size: 16px; font-weight: 600; cursor: pointer;
  }
  button:hover { background: #1c3a99; }
  .erro { color: #dc2626; font-size: 14px; margin: -8px 0 16px; }
</style>
</head>
<body>
  <div class="card">
    <h1>Painel de Diretoria</h1>
    <p class="sub">Visão geral de produção - MRS Manutenção de Vagões</p>
    ${erro ? '<div class="erro">Senha incorreta. Tente novamente.</div>' : ""}
    <form method="POST" action="/painel-diretoria/entrar">
      <input type="password" name="senha" placeholder="Senha de acesso" autofocus required>
      <button type="submit">Entrar</button>
    </form>
  </div>
</body>
</html>`;
}

function paginaDashboard(): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Painel de Diretoria - Checklists de Inspeção</title>
<style>
  ${ESTILO_BASE}
  header {
    background: #1e293b; color: white; padding: 20px 28px; display: flex;
    align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;
  }
  header h1 { font-size: 20px; margin: 0; }
  header a { color: #cbd5e1; text-decoration: none; font-size: 14px; }
  header a:hover { color: white; }
  main { max-width: 1200px; margin: 0 auto; padding: 24px; }

  .filtros {
    background: white; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px;
    display: flex; gap: 10px; flex-wrap: wrap; align-items: center;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }
  .filtros button {
    padding: 8px 14px; border-radius: 8px; border: 1px solid #d1d5db; background: white;
    cursor: pointer; font-size: 14px; color: #374151;
  }
  .filtros button.ativo { background: #1e40af; color: white; border-color: #1e40af; }
  .filtros input[type="text"] {
    padding: 8px 12px; border-radius: 8px; border: 1px solid #d1d5db; font-size: 14px;
    flex: 1; min-width: 180px;
  }

  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; margin-bottom: 20px; }
  .stat-card {
    background: white; border-radius: 12px; padding: 18px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }
  .stat-card .valor { font-size: 28px; font-weight: 700; }
  .stat-card .label { font-size: 13px; color: #6b7280; margin-top: 2px; }
  .stat-card.ok .valor { color: #16a34a; }
  .stat-card.nao-ok .valor { color: #dc2626; }
  .stat-card.total .valor { color: #1e40af; }

  .painel {
    background: white; border-radius: 12px; padding: 20px; margin-bottom: 20px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }
  .painel h2 { font-size: 15px; margin: 0 0 14px; color: #374151; }
  .barra-linha { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; font-size: 13px; }
  .barra-linha .rotulo { width: 220px; flex-shrink: 0; color: #374151; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .barra-fundo { flex: 1; background: #f3f4f6; border-radius: 6px; height: 18px; overflow: hidden; }
  .barra-preenchida { background: #1e40af; height: 100%; border-radius: 6px; }
  .barra-linha .qtd { width: 36px; text-align: right; color: #6b7280; flex-shrink: 0; }

  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #f0f0f0; }
  th { color: #6b7280; font-weight: 600; font-size: 12px; text-transform: uppercase; }
  tr:hover { background: #fafafa; }
  .resultado-ok { color: #16a34a; font-weight: 600; }
  .resultado-nao-ok { color: #dc2626; font-weight: 600; }
  .resultado-na { color: #6b7280; }
  a.baixar {
    color: #1e40af; text-decoration: none; font-weight: 600; font-size: 13px;
    border: 1px solid #1e40af; border-radius: 6px; padding: 4px 10px; white-space: nowrap;
  }
  a.baixar:hover { background: #1e40af; color: white; }
  .sem-pdf { color: #9ca3af; font-size: 13px; }
  .carregando, .vazio { text-align: center; color: #6b7280; padding: 40px 0; }
  .contador-lista { color: #6b7280; font-size: 13px; margin-bottom: 10px; }
</style>
</head>
<body>
  <header>
    <h1>Painel de Diretoria — Checklists de Inspeção</h1>
    <a href="/painel-diretoria/sair">Sair</a>
  </header>
  <main>
    <div class="filtros" id="filtros">
      <button data-periodo="hoje">Hoje</button>
      <button data-periodo="semana">Semana</button>
      <button data-periodo="mes">Mês</button>
      <button data-periodo="ano">Ano</button>
      <button data-periodo="tudo" class="ativo">Tudo</button>
      <input type="text" id="busca" placeholder="Buscar por modelo, executante ou código...">
    </div>

    <div class="cards" id="cards">
      <div class="stat-card total"><div class="valor" id="stat-total">—</div><div class="label">Total de checklists</div></div>
      <div class="stat-card ok"><div class="valor" id="stat-ok">—</div><div class="label">OK</div></div>
      <div class="stat-card nao-ok"><div class="valor" id="stat-naook">—</div><div class="label">Não OK</div></div>
      <div class="stat-card"><div class="valor" id="stat-comPdf">—</div><div class="label">Com PDF gerado</div></div>
    </div>

    <div class="painel">
      <h2>Por Categoria</h2>
      <div id="grafico-categoria"></div>
    </div>

    <div class="painel">
      <h2>Por Modelo (top 10)</h2>
      <div id="grafico-modelo"></div>
    </div>

    <div class="painel">
      <h2>Por Executante (top 10)</h2>
      <div id="grafico-executante"></div>
    </div>

    <div class="painel">
      <h2>Checklists</h2>
      <div class="contador-lista" id="contador-lista"></div>
      <div id="tabela-wrap"><div class="carregando">Carregando...</div></div>
    </div>
  </main>

  <script>
    let dadosOriginais = [];
    let periodoAtivo = 'tudo';

    function parseDataRecuperacao(str) {
      if (!str) return null;
      const partes = str.split('/');
      if (partes.length !== 3) return null;
      const [d, m, a] = partes.map(Number);
      const data = new Date(a, m - 1, d);
      data.setHours(0, 0, 0, 0);
      return data;
    }

    function inicioPeriodo(periodo) {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      if (periodo === 'hoje') return hoje;
      if (periodo === 'semana') {
        const inicio = new Date(hoje);
        inicio.setDate(hoje.getDate() - hoje.getDay());
        return inicio;
      }
      if (periodo === 'mes') return new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      if (periodo === 'ano') return new Date(hoje.getFullYear(), 0, 1);
      return null;
    }

    function aplicarFiltros() {
      const inicio = inicioPeriodo(periodoAtivo);
      const busca = document.getElementById('busca').value.trim().toLowerCase();

      return dadosOriginais.filter((c) => {
        if (inicio) {
          const dataChecklist = parseDataRecuperacao(c.data_recuperacao);
          if (!dataChecklist || dataChecklist < inicio) return false;
        }
        if (busca) {
          const alvo = \`\${c.modelo || ''} \${c.executante_name || ''} \${c.checklist_code || ''}\`.toLowerCase();
          if (!alvo.includes(busca)) return false;
        }
        return true;
      });
    }

    function contarPor(lista, campo) {
      const contagem = {};
      lista.forEach((item) => {
        const chave = item[campo] || 'Não informado';
        contagem[chave] = (contagem[chave] || 0) + 1;
      });
      return Object.entries(contagem).sort((a, b) => b[1] - a[1]);
    }

    function renderizarBarras(containerId, entradas, limite) {
      const container = document.getElementById(containerId);
      const lista = limite ? entradas.slice(0, limite) : entradas;
      if (lista.length === 0) {
        container.innerHTML = '<p style="color:#9ca3af;font-size:13px;">Nenhum dado no período.</p>';
        return;
      }
      const max = lista[0][1];
      container.innerHTML = lista.map(([rotulo, qtd]) => \`
        <div class="barra-linha">
          <div class="rotulo" title="\${rotulo}">\${rotulo}</div>
          <div class="barra-fundo"><div class="barra-preenchida" style="width:\${(qtd / max) * 100}%"></div></div>
          <div class="qtd">\${qtd}</div>
        </div>
      \`).join('');
    }

    function formatarResultado(resultado) {
      if (resultado === 'OK') return '<span class="resultado-ok">OK</span>';
      if (resultado === 'NÃO OK' || resultado === 'NAO_OK') return '<span class="resultado-nao-ok">NÃO OK</span>';
      return \`<span class="resultado-na">\${resultado || '—'}</span>\`;
    }

    function renderizarTabela(lista) {
      const wrap = document.getElementById('tabela-wrap');
      document.getElementById('contador-lista').textContent = \`\${lista.length} checklist\${lista.length !== 1 ? 's' : ''} encontrado\${lista.length !== 1 ? 's' : ''}\`;

      if (lista.length === 0) {
        wrap.innerHTML = '<div class="vazio">Nenhum checklist encontrado para esse filtro.</div>';
        return;
      }

      const linhas = lista.map((c) => \`
        <tr>
          <td>\${c.data_recuperacao || '—'}</td>
          <td>\${c.checklist_code || '—'}</td>
          <td>\${c.modelo || '—'}</td>
          <td>\${c.executante_name || '—'}</td>
          <td>\${formatarResultado(c.resultado)}</td>
          <td>\${c.pdf_url ? \`<a class="baixar" href="\${c.pdf_url}" target="_blank" rel="noopener">Baixar PDF</a>\` : '<span class="sem-pdf">Sem PDF</span>'}</td>
        </tr>
      \`).join('');

      wrap.innerHTML = \`
        <table>
          <thead><tr><th>Data</th><th>Código</th><th>Modelo</th><th>Executante</th><th>Resultado</th><th>PDF</th></tr></thead>
          <tbody>\${linhas}</tbody>
        </table>
      \`;
    }

    function atualizarTudo() {
      const filtrados = aplicarFiltros();

      document.getElementById('stat-total').textContent = filtrados.length;
      document.getElementById('stat-ok').textContent = filtrados.filter((c) => c.resultado === 'OK').length;
      document.getElementById('stat-naook').textContent = filtrados.filter((c) => c.resultado === 'NÃO OK' || c.resultado === 'NAO_OK').length;
      document.getElementById('stat-comPdf').textContent = filtrados.filter((c) => !!c.pdf_url).length;

      renderizarBarras('grafico-categoria', contarPor(filtrados, 'categoria'));
      renderizarBarras('grafico-modelo', contarPor(filtrados, 'modelo'), 10);
      renderizarBarras('grafico-executante', contarPor(filtrados, 'executante_name'), 10);

      renderizarTabela(filtrados);
    }

    document.getElementById('filtros').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-periodo]');
      if (!btn) return;
      periodoAtivo = btn.dataset.periodo;
      document.querySelectorAll('#filtros button').forEach((b) => b.classList.remove('ativo'));
      btn.classList.add('ativo');
      atualizarTudo();
    });

    document.getElementById('busca').addEventListener('input', () => atualizarTudo());

    fetch('/api/painel-diretoria/dados')
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        dadosOriginais = json.checklists || [];
        atualizarTudo();
      })
      .catch((err) => {
        document.getElementById('tabela-wrap').innerHTML = \`<div class="vazio">Erro ao carregar dados: \${err.message}</div>\`;
      });
  </script>
</body>
</html>`;
}

router.get("/painel-diretoria", (req: Request, res: Response) => {
  if (!estaAutenticado(req)) {
    res.type("html").send(paginaLogin(req.query.erro === "1"));
    return;
  }
  res.type("html").send(paginaDashboard());
});

router.post("/painel-diretoria/entrar", (req: Request, res: Response) => {
  const senhaDigitada = req.body?.senha;
  if (typeof senhaDigitada === "string" && senhaDigitada === SENHA) {
    res.cookie(COOKIE_NAME, HASH_ESPERADO, {
      ...cookieOptions(req),
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.redirect("/painel-diretoria");
  } else {
    res.redirect("/painel-diretoria?erro=1");
  }
});

router.get("/painel-diretoria/sair", (req: Request, res: Response) => {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(req) });
  res.redirect("/painel-diretoria");
});

router.get("/api/painel-diretoria/dados", async (req: Request, res: Response) => {
  if (!estaAutenticado(req)) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    res.status(500).json({ error: "Supabase não configurado no servidor" });
    return;
  }

  try {
    const { data, error } = await supabase
      .from("completed_checklists")
      .select(
        "id, checklist_code, checklist_name, categoria, modelo, resultado, executante_name, data_recuperacao, data_fabricacao, numero_serie, numero_op, pdf_url, timestamp, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(5000);

    if (error) throw error;

    res.json({ checklists: data || [] });
  } catch (error) {
    console.error("[PainelDiretoria] Erro ao buscar dados:", error);
    res.status(500).json({ error: "Erro ao buscar dados do banco" });
  }
});

export default router;
