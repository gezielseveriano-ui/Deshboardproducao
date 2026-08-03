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
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }
  .filtros-linha { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
  .filtros button {
    padding: 8px 14px; border-radius: 8px; border: 1px solid #d1d5db; background: white;
    cursor: pointer; font-size: 14px; color: #374151;
  }
  .filtros button.ativo { background: #1e40af; color: white; border-color: #1e40af; }
  .filtros input[type="text"] {
    padding: 8px 12px; border-radius: 8px; border: 1px solid #d1d5db; font-size: 14px;
    flex: 1; min-width: 180px;
  }
  .periodo-custom {
    display: none; align-items: center; gap: 8px; margin-top: 12px; padding-top: 12px;
    border-top: 1px solid #f0f0f0; flex-wrap: wrap;
  }
  .periodo-custom.aberto { display: flex; }
  .periodo-custom input[type="date"] {
    padding: 7px 10px; border-radius: 8px; border: 1px solid #d1d5db; font-size: 14px;
  }
  .periodo-custom label { font-size: 13px; color: #6b7280; }
  .periodo-rotulo { font-size: 13px; color: #6b7280; margin-top: 8px; }

  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; margin-bottom: 20px; }
  .stat-card {
    background: white; border-radius: 12px; padding: 18px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }
  .stat-card .valor { font-size: 28px; font-weight: 700; color: #1e40af; }
  .stat-card .label { font-size: 13px; color: #6b7280; margin-top: 2px; }

  .painel {
    background: white; border-radius: 12px; padding: 20px; margin-bottom: 20px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }
  .painel h2 { font-size: 15px; margin: 0 0 14px; color: #374151; }

  /* Barras horizontais coloridas */
  .barra-h-linha { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; font-size: 13px; }
  .barra-h-linha .rotulo { width: 240px; flex-shrink: 0; color: #374151; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .barra-h-fundo { flex: 1; background: #f3f4f6; border-radius: 6px; height: 20px; overflow: hidden; }
  .barra-h-preenchida { height: 100%; border-radius: 6px; }
  .barra-h-linha .qtd { width: 36px; text-align: right; color: #374151; font-weight: 600; flex-shrink: 0; }

  /* Barras verticais coloridas */
  .barras-v-wrap { display: flex; align-items: flex-end; gap: 18px; overflow-x: auto; padding: 8px 4px 4px; min-height: 190px; }
  .barra-v-item { display: flex; flex-direction: column; align-items: center; gap: 6px; flex-shrink: 0; }
  .barra-v-valor { font-size: 13px; font-weight: 700; color: #374151; }
  .barra-v-bloco { width: 44px; border-radius: 6px 6px 0 0; }
  .barra-v-rotulo { font-size: 11px; color: #6b7280; text-align: center; width: 70px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  /* Listas de resumo (Modelo / Executante) */
  .resumo-lista { display: flex; flex-direction: column; gap: 10px; }
  .resumo-item {
    display: flex; justify-content: space-between; align-items: center; gap: 10px;
    background: #f9fafb; border: 1px solid #f0f0f0; border-radius: 10px; padding: 14px 16px;
    cursor: pointer;
  }
  .resumo-item:hover { background: #f3f4f6; }
  .resumo-item .codigo { font-size: 12px; color: #6b7280; }
  .resumo-item .titulo { font-size: 14px; font-weight: 600; color: #1f2937; margin-top: 2px; }
  .resumo-item .sub { font-size: 12px; color: #9ca3af; margin-top: 4px; }
  .resumo-item .badge {
    background: #1e40af; color: white; font-weight: 700; font-size: 15px;
    border-radius: 999px; padding: 6px 14px; flex-shrink: 0;
  }

  .vazio { text-align: center; color: #9ca3af; padding: 24px 0; font-size: 13px; }

  /* Overlay de detalhe (onde ficam os PDFs) */
  .overlay {
    display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.5);
    align-items: center; justify-content: center; padding: 20px; z-index: 50;
  }
  .overlay.aberto { display: flex; }
  .overlay-painel {
    background: white; border-radius: 12px; max-width: 720px; width: 100%; max-height: 85vh;
    display: flex; flex-direction: column; overflow: hidden;
  }
  .overlay-cabecalho {
    display: flex; justify-content: space-between; align-items: center; padding: 18px 22px;
    border-bottom: 1px solid #f0f0f0;
  }
  .overlay-cabecalho h3 { margin: 0; font-size: 16px; color: #1f2937; }
  .overlay-fechar { background: none; border: none; font-size: 20px; cursor: pointer; color: #6b7280; padding: 4px 8px; }
  .overlay-corpo { padding: 14px 22px 22px; overflow-y: auto; }

  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid #f0f0f0; }
  th { color: #6b7280; font-weight: 600; font-size: 12px; text-transform: uppercase; }
  .resultado-ok { color: #16a34a; font-weight: 600; }
  .resultado-nao-ok { color: #dc2626; font-weight: 600; }
  .resultado-na { color: #6b7280; }
  a.baixar {
    color: #1e40af; text-decoration: none; font-weight: 600; font-size: 12px;
    border: 1px solid #1e40af; border-radius: 6px; padding: 4px 10px; white-space: nowrap;
  }
  a.baixar:hover { background: #1e40af; color: white; }
  .sem-pdf { color: #9ca3af; font-size: 12px; }
  .carregando { text-align: center; color: #6b7280; padding: 40px 0; }
</style>
</head>
<body>
  <header>
    <h1>Painel de Diretoria — Checklists de Inspeção</h1>
    <a href="/painel-diretoria/sair">Sair</a>
  </header>
  <main>
    <div class="filtros">
      <div class="filtros-linha" id="filtros-periodo">
        <button data-periodo="hoje">Hoje</button>
        <button data-periodo="semana" class="ativo">Semana</button>
        <button data-periodo="mes">Mês</button>
        <button data-periodo="ano">Ano</button>
        <button data-periodo="tudo">Tudo</button>
        <button data-periodo="custom">📅 Período</button>
        <input type="text" id="busca" placeholder="Buscar por modelo, executante ou código...">
      </div>
      <div class="periodo-custom" id="periodo-custom">
        <label>De <input type="date" id="periodo-inicio"></label>
        <label>Até <input type="date" id="periodo-fim"></label>
        <button id="periodo-aplicar">Aplicar</button>
      </div>
      <div class="periodo-rotulo" id="periodo-rotulo"></div>
    </div>

    <div class="cards" id="cards">
      <div class="stat-card"><div class="valor" id="stat-pecas">—</div><div class="label">Total de Peças</div></div>
      <div class="stat-card"><div class="valor" id="stat-modelos">—</div><div class="label">Total de Modelos</div></div>
      <div class="stat-card"><div class="valor" id="stat-executantes">—</div><div class="label">Total de Executantes</div></div>
    </div>

    <div class="painel">
      <h2>Por Categoria</h2>
      <div id="grafico-categoria"></div>
    </div>

    <div class="painel">
      <h2>Distribuição por Modelo</h2>
      <div id="grafico-modelo"></div>
    </div>

    <div class="painel">
      <h2>Quantidade por Executante</h2>
      <div id="grafico-executante"></div>
    </div>

    <div class="painel">
      <h2>Resumo por Modelo</h2>
      <div id="lista-modelo"><div class="carregando">Carregando...</div></div>
    </div>

    <div class="painel">
      <h2>Resumo por Executante</h2>
      <div id="lista-executante"></div>
    </div>
  </main>

  <div class="overlay" id="overlay">
    <div class="overlay-painel">
      <div class="overlay-cabecalho">
        <h3 id="overlay-titulo"></h3>
        <button class="overlay-fechar" id="overlay-fechar">×</button>
      </div>
      <div class="overlay-corpo" id="overlay-corpo"></div>
    </div>
  </div>

  <script>
    const CORES = ['#0a7ea4', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

    let dadosOriginais = [];
    let periodoAtivo = 'semana';
    let periodoCustomInicio = null;
    let periodoCustomFim = null;

    function parseDataRecuperacao(str) {
      if (!str) return null;
      const partes = str.split('/');
      if (partes.length !== 3) return null;
      const [d, m, a] = partes.map(Number);
      const data = new Date(a, m - 1, d);
      data.setHours(0, 0, 0, 0);
      return data;
    }

    function formatarDataBR(date) {
      return \`\${String(date.getDate()).padStart(2, '0')}/\${String(date.getMonth() + 1).padStart(2, '0')}/\${date.getFullYear()}\`;
    }

    function intervaloPeriodo(periodo) {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      if (periodo === 'hoje') {
        return { inicio: hoje, fim: new Date(hoje.getTime() + 24 * 60 * 60 * 1000), rotulo: \`Hoje - \${formatarDataBR(hoje)}\` };
      }
      if (periodo === 'semana') {
        const inicio = new Date(hoje);
        inicio.setDate(hoje.getDate() - hoje.getDay());
        const fim = new Date(inicio.getTime() + 7 * 24 * 60 * 60 * 1000);
        return { inicio, fim, rotulo: \`\${formatarDataBR(inicio)} até \${formatarDataBR(fim)}\` };
      }
      if (periodo === 'mes') {
        const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
        return { inicio, fim, rotulo: \`\${formatarDataBR(inicio)} até \${formatarDataBR(fim)}\` };
      }
      if (periodo === 'ano') {
        const inicio = new Date(hoje.getFullYear(), 0, 1);
        const fim = new Date(hoje.getFullYear() + 1, 0, 1);
        return { inicio, fim, rotulo: \`\${formatarDataBR(inicio)} até \${formatarDataBR(fim)}\` };
      }
      if (periodo === 'custom' && periodoCustomInicio && periodoCustomFim) {
        const fim = new Date(periodoCustomFim.getTime() + 24 * 60 * 60 * 1000);
        return { inicio: periodoCustomInicio, fim, rotulo: \`\${formatarDataBR(periodoCustomInicio)} até \${formatarDataBR(periodoCustomFim)}\` };
      }
      return { inicio: null, fim: null, rotulo: 'Todo o período' };
    }

    function aplicarFiltros() {
      const { inicio, fim } = intervaloPeriodo(periodoAtivo);
      const busca = document.getElementById('busca').value.trim().toLowerCase();

      return dadosOriginais.filter((c) => {
        if (inicio && fim) {
          const dataChecklist = parseDataRecuperacao(c.data_recuperacao);
          if (!dataChecklist || dataChecklist < inicio || dataChecklist >= fim) return false;
        }
        if (busca) {
          const alvo = \`\${c.modelo || ''} \${c.executante_name || ''} \${c.checklist_code || ''}\`.toLowerCase();
          if (!alvo.includes(busca)) return false;
        }
        return true;
      });
    }

    // Agrupamentos no mesmo espírito da aba Relatórios do app
    function resumoPorCategoria(lista) {
      const mapa = new Map();
      lista.forEach((c) => {
        const chave = c.categoria || 'Não informado';
        mapa.set(chave, (mapa.get(chave) || 0) + 1);
      });
      return Array.from(mapa.entries())
        .map(([categoria, quantidade]) => ({ categoria, quantidade }))
        .sort((a, b) => b.quantidade - a.quantidade);
    }

    function resumoPorModelo(lista) {
      const mapa = new Map();
      lista.forEach((c) => {
        const chave = \`\${c.categoria || '—'}:::\${c.modelo || '—'}\`;
        if (mapa.has(chave)) {
          const atual = mapa.get(chave);
          atual.quantidade += 1;
          atual.itens.push(c);
          if (!atual.dataRecuperacao || (c.data_recuperacao || '') > atual.dataRecuperacao) {
            atual.dataRecuperacao = c.data_recuperacao;
          }
        } else {
          mapa.set(chave, {
            categoria: c.categoria || '—',
            modelo: c.modelo || '—',
            checklistCode: c.checklist_code || '—',
            quantidade: 1,
            dataRecuperacao: c.data_recuperacao,
            itens: [c],
          });
        }
      });
      return Array.from(mapa.values()).sort((a, b) => b.quantidade - a.quantidade);
    }

    function resumoPorExecutante(lista) {
      const mapa = new Map();
      lista.forEach((c) => {
        const chave = c.executante_name || 'Não informado';
        if (mapa.has(chave)) {
          const atual = mapa.get(chave);
          atual.quantidade += 1;
          atual.itens.push(c);
          if (!atual.dataExecucao || (c.data_recuperacao || '') > atual.dataExecucao) {
            atual.dataExecucao = c.data_recuperacao;
          }
        } else {
          mapa.set(chave, {
            executanteName: chave,
            quantidade: 1,
            dataExecucao: c.data_recuperacao,
            itens: [c],
          });
        }
      });
      return Array.from(mapa.values()).sort((a, b) => b.quantidade - a.quantidade);
    }

    function renderizarBarrasHorizontais(containerId, itens) {
      const container = document.getElementById(containerId);
      if (itens.length === 0) {
        container.innerHTML = '<div class="vazio">Nenhum dado no período.</div>';
        return;
      }
      const max = Math.max(...itens.map((i) => i.valor));
      container.innerHTML = itens.map((item, index) => \`
        <div class="barra-h-linha">
          <div class="rotulo" title="\${item.rotulo}">\${item.rotulo}</div>
          <div class="barra-h-fundo"><div class="barra-h-preenchida" style="width:\${(item.valor / max) * 100}%;background:\${CORES[index % CORES.length]}"></div></div>
          <div class="qtd">\${item.valor}</div>
        </div>
      \`).join('');
    }

    function renderizarBarrasVerticais(containerId, itens) {
      const container = document.getElementById(containerId);
      if (itens.length === 0) {
        container.innerHTML = '<div class="vazio">Nenhum dado no período.</div>';
        return;
      }
      const max = Math.max(...itens.map((i) => i.valor));
      const alturaMax = 150;
      container.innerHTML = \`<div class="barras-v-wrap">\${itens.map((item, index) => \`
        <div class="barra-v-item">
          <div class="barra-v-valor">\${item.valor}</div>
          <div class="barra-v-bloco" style="height:\${(item.valor / max) * alturaMax}px;background:\${CORES[index % CORES.length]}"></div>
          <div class="barra-v-rotulo" title="\${item.rotulo}">\${item.rotulo}</div>
        </div>
      \`).join('')}</div>\`;
    }

    function formatarResultado(resultado) {
      if (resultado === 'OK') return '<span class="resultado-ok">OK</span>';
      if (resultado === 'NÃO OK' || resultado === 'NAO_OK') return '<span class="resultado-nao-ok">NÃO OK</span>';
      return \`<span class="resultado-na">\${resultado || '—'}</span>\`;
    }

    // O PDF só aparece aqui dentro (ao clicar num modelo/executante), nunca na lista principal
    function abrirDetalhe(titulo, itens) {
      document.getElementById('overlay-titulo').textContent = titulo;
      const ordenados = [...itens].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      const linhas = ordenados.map((c) => \`
        <tr>
          <td>\${c.data_recuperacao || '—'}</td>
          <td>\${c.checklist_code || '—'}</td>
          <td>\${c.modelo || '—'}</td>
          <td>\${c.executante_name || '—'}</td>
          <td>\${formatarResultado(c.resultado)}</td>
          <td>\${c.pdf_url ? \`<a class="baixar" href="\${c.pdf_url}" target="_blank" rel="noopener">Baixar PDF</a>\` : '<span class="sem-pdf">Sem PDF</span>'}</td>
        </tr>
      \`).join('');
      document.getElementById('overlay-corpo').innerHTML = \`
        <table>
          <thead><tr><th>Data</th><th>Código</th><th>Modelo</th><th>Executante</th><th>Resultado</th><th>PDF</th></tr></thead>
          <tbody>\${linhas}</tbody>
        </table>
      \`;
      document.getElementById('overlay').classList.add('aberto');
    }

    document.getElementById('overlay-fechar').addEventListener('click', () => {
      document.getElementById('overlay').classList.remove('aberto');
    });
    document.getElementById('overlay').addEventListener('click', (e) => {
      if (e.target.id === 'overlay') document.getElementById('overlay').classList.remove('aberto');
    });

    function renderizarListaModelo(itens) {
      const container = document.getElementById('lista-modelo');
      if (itens.length === 0) {
        container.innerHTML = '<div class="vazio">Nenhum checklist completado neste período.</div>';
        return;
      }
      container.innerHTML = '<div class="resumo-lista">' + itens.map((item, index) => \`
        <div class="resumo-item" data-tipo="modelo" data-index="\${index}">
          <div>
            <div class="codigo">\${item.checklistCode}</div>
            <div class="titulo">\${item.categoria} - \${item.modelo}</div>
            <div class="sub">Data: \${item.dataRecuperacao || '—'}</div>
          </div>
          <div class="badge">\${item.quantidade}</div>
        </div>
      \`).join('') + '</div>';

      container.querySelectorAll('.resumo-item').forEach((el) => {
        el.addEventListener('click', () => {
          const item = itens[Number(el.dataset.index)];
          abrirDetalhe(\`\${item.categoria} - \${item.modelo}\`, item.itens);
        });
      });
    }

    function renderizarListaExecutante(itens) {
      const container = document.getElementById('lista-executante');
      if (itens.length === 0) {
        container.innerHTML = '<div class="vazio">Nenhum checklist completado neste período.</div>';
        return;
      }
      container.innerHTML = '<div class="resumo-lista">' + itens.map((item, index) => \`
        <div class="resumo-item" data-tipo="executante" data-index="\${index}">
          <div>
            <div class="titulo">\${item.executanteName}</div>
            <div class="sub">Data: \${item.dataExecucao || '—'}</div>
          </div>
          <div class="badge">\${item.quantidade}</div>
        </div>
      \`).join('') + '</div>';

      container.querySelectorAll('.resumo-item').forEach((el) => {
        el.addEventListener('click', () => {
          const item = itens[Number(el.dataset.index)];
          abrirDetalhe(item.executanteName, item.itens);
        });
      });
    }

    function atualizarTudo() {
      const filtrados = aplicarFiltros();
      const busca = document.getElementById('busca').value.trim().toLowerCase();

      const porModelo = resumoPorModelo(filtrados);
      const porExecutante = resumoPorExecutante(filtrados);
      const porCategoria = resumoPorCategoria(filtrados);

      document.getElementById('stat-pecas').textContent = filtrados.length;
      document.getElementById('stat-modelos').textContent = porModelo.length;
      document.getElementById('stat-executantes').textContent = porExecutante.length;

      renderizarBarrasHorizontais('grafico-categoria', porCategoria.map((c) => ({ rotulo: c.categoria, valor: c.quantidade })));
      renderizarBarrasHorizontais('grafico-modelo', porModelo.slice(0, 8).map((m) => ({ rotulo: \`\${m.categoria} - \${m.modelo}\`, valor: m.quantidade })));
      renderizarBarrasVerticais('grafico-executante', porExecutante.slice(0, 10).map((e) => ({ rotulo: e.executanteName, valor: e.quantidade })));

      const porModeloFiltradoBusca = busca
        ? porModelo.filter((m) => \`\${m.categoria} \${m.modelo} \${m.checklistCode}\`.toLowerCase().includes(busca))
        : porModelo;
      const porExecutanteFiltradoBusca = busca
        ? porExecutante.filter((e) => e.executanteName.toLowerCase().includes(busca))
        : porExecutante;

      renderizarListaModelo(porModeloFiltradoBusca);
      renderizarListaExecutante(porExecutanteFiltradoBusca);

      document.getElementById('periodo-rotulo').textContent = intervaloPeriodo(periodoAtivo).rotulo;
    }

    document.getElementById('filtros-periodo').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-periodo]');
      if (!btn) return;
      const periodo = btn.dataset.periodo;

      document.getElementById('periodo-custom').classList.toggle('aberto', periodo === 'custom');
      if (periodo === 'custom') return; // só aplica depois de escolher as datas e clicar em Aplicar

      periodoAtivo = periodo;
      document.querySelectorAll('#filtros-periodo button').forEach((b) => b.classList.remove('ativo'));
      btn.classList.add('ativo');
      atualizarTudo();
    });

    document.getElementById('periodo-aplicar').addEventListener('click', () => {
      const inicioStr = document.getElementById('periodo-inicio').value;
      const fimStr = document.getElementById('periodo-fim').value;
      if (!inicioStr || !fimStr) return;

      periodoCustomInicio = new Date(inicioStr + 'T00:00:00');
      periodoCustomFim = new Date(fimStr + 'T00:00:00');
      if (periodoCustomInicio > periodoCustomFim) return;

      periodoAtivo = 'custom';
      document.querySelectorAll('#filtros-periodo button').forEach((b) => b.classList.remove('ativo'));
      document.querySelector('#filtros-periodo button[data-periodo="custom"]').classList.add('ativo');
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
        document.getElementById('lista-modelo').innerHTML = \`<div class="vazio">Erro ao carregar dados: \${err.message}</div>\`;
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
