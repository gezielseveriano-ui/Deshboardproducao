# Deployment - Checklist Inspeção Industrial

## Arquitetura atual

Este app roda como **link web** (aberto no navegador, sem instalar nada),
não mais como APK Android. Um único processo Node serve duas coisas na
mesma porta/URL:

- O **app web** (build estático gerado por `expo export --platform web`,
  em `dist-web/`).
- A **API** (Express + tRPC, em `server/`), que gera o PDF do checklist
  inteiro no servidor (sem depender do navegador/aparelho) e salva tudo
  no Supabase — banco de dados (tabela `completed_checklists`) e Storage
  (arquivo do PDF). Isso resolve o problema original do APK: o PDF não é
  mais salvo localmente no tablet, então não enche mais a memória do
  aparelho nem trava a geração do checklist.

Por serem o mesmo serviço/origem, o front não precisa saber a URL final
de antemão nem configurar CORS.

## Variáveis de ambiente necessárias

Copie `.env.example` para `.env` (local) ou preencha no painel da
plataforma de hospedagem (produção):

| Variável | Onde pegar | Uso |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Painel Supabase → Project Settings → API | Cliente e servidor |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Painel Supabase → Project Settings → API | Cliente (leitura pública) |
| `SUPABASE_SERVICE_ROLE_KEY` | Painel Supabase → Project Settings → API | **Só servidor** — nunca expor no app |

Não defina `EXPO_PUBLIC_API_BASE_URL` em produção: deixando vazio, o app
web usa URLs relativas (mesma origem do próprio serviço).

## Build e start (produção)

```bash
pnpm install
pnpm build   # gera dist-web/ (app) e dist-server/ (API), nessa ordem
pnpm start   # sobe o processo único em produção (usa PORT do ambiente)
```

## Deploy no Render (configuração já pronta)

Existe um `render.yaml` na raiz do repositório (`Deshboardproducao`) com o
serviço já configurado (plano gratuito, build e start commands, health
check em `/api/health`). Passos:

1. Criar conta em [render.com](https://render.com) (login com GitHub, sem
   precisar de cartão no plano gratuito).
2. **New +** → **Blueprint** → selecionar o repositório `Deshboardproducao`.
   O Render lê o `render.yaml` automaticamente e propõe o serviço
   `checklist-inspecao-industrial`.
3. Antes de confirmar, preencher as 3 variáveis de ambiente marcadas como
   secretas (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`) com os valores do seu projeto Supabase.
4. Deploy. Ao terminar, o Render fornece uma URL fixa
   (`https://checklist-inspecao-industrial-XXXX.onrender.com`) — esse é o
   link definitivo para abrir no Chrome do tablet.

No plano gratuito, o serviço "dorme" depois de ~15 min sem uso e demora
alguns segundos para acordar na próxima visita — normal, não é erro.

## Fluxo completo de uso

1. Inspetor abre o link no Chrome (tablet ou qualquer dispositivo) →
   preenche o checklist → assina.
2. Ao finalizar, o app chama o servidor, que gera o PDF (com todas as
   etapas, medidas e assinaturas) e sobe pro Supabase Storage — nada é
   salvo permanentemente no aparelho.
3. O checklist completo (dados + link do PDF) fica na tabela
   `completed_checklists` do Supabase, disponível na aba Histórico do
   app a partir de qualquer dispositivo.

## Banco de dados (Supabase)

O schema está em `supabase-schema.sql`, na raiz deste diretório — rode
esse SQL uma vez no editor SQL do painel Supabase para criar a tabela
`completed_checklists` e o bucket `checklist-pdfs` do Storage (se ainda
não existirem).
