# 📱 Guia Completo de Compilação - Checklist Inspeção Industrial

## 📋 Índice
1. [Requisitos](#requisitos)
2. [Instalação](#instalação)
3. [Configuração](#configuração)
4. [Desenvolvimento](#desenvolvimento)
5. [Build para Produção](#build-para-produção)
6. [Deployment](#deployment)

---

## Requisitos

### Sistema Operacional
- **Windows 10+**, **macOS 10.15+**, ou **Linux (Ubuntu 18.04+)**

### Software Necessário
- **Node.js 18+** (https://nodejs.org/)
- **pnpm 9.12.0+** (gerenciador de pacotes)
  ```bash
  npm install -g pnpm@9.12.0
  ```
- **Git** (https://git-scm.com/)
- **Expo CLI** (será instalado via pnpm)

### Opcional (para compilação nativa)
- **Android Studio** (para compilar APK)
- **Xcode** (para compilar iOS - apenas macOS)

---

## Instalação

### 1. Extrair o arquivo ZIP
```bash
unzip checklist-inspecao-industrial-complete.zip
cd checklist-inspecao-industrial
```

### 2. Instalar dependências
```bash
pnpm install
```

Isso vai instalar:
- React Native 0.81
- Expo SDK 54
- TypeScript
- NativeWind (Tailwind CSS)
- tRPC (API client/server)
- Drizzle ORM (banco de dados)
- E todas as outras dependências

---

## Configuração

### 1. Variáveis de Ambiente

Criar arquivo `.env` na raiz do projeto:

```env
# Banco de Dados
DATABASE_URL="mysql://usuario:senha@localhost:3306/checklist_db"

# Servidor
NODE_ENV="development"
PORT=3000

# OAuth (Manus)
OAUTH_CLIENT_ID="seu_client_id"
OAUTH_CLIENT_SECRET="seu_client_secret"

# Email (SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="seu_email@gmail.com"
SMTP_PASSWORD="sua_senha_app"
SMTP_FROM="noreply@empresa.com"

# Armazenamento (S3 ou compatível)
S3_BUCKET="seu-bucket"
S3_REGION="us-east-1"
S3_ACCESS_KEY="sua_access_key"
S3_SECRET_KEY="sua_secret_key"
```

### 2. Banco de Dados

#### Opção A: MySQL Local
```bash
# Instalar MySQL
# macOS:
brew install mysql

# Iniciar MySQL
mysql.server start

# Criar banco de dados
mysql -u root -p
> CREATE DATABASE checklist_db;
> EXIT;
```

#### Opção B: Docker
```bash
docker run --name mysql-checklist \
  -e MYSQL_ROOT_PASSWORD=senha123 \
  -e MYSQL_DATABASE=checklist_db \
  -p 3306:3306 \
  -d mysql:8.0
```

### 3. Migrar banco de dados
```bash
pnpm run db:push
```

---

## Desenvolvimento

### Iniciar servidor de desenvolvimento

```bash
# Inicia Metro (bundler) + servidor Node.js
pnpm run dev
```

Isso vai abrir:
- **Metro Bundler**: http://localhost:8081
- **Servidor API**: http://localhost:3000
- **QR Code**: para abrir no Expo Go

### Acessar a app

#### No navegador (Web)
```
http://localhost:8081
```

#### No celular (iOS/Android)
1. Instale o app **Expo Go** na App Store ou Google Play
2. Escaneie o QR code que aparece no terminal
3. A app vai abrir no seu celular

#### No emulador
```bash
# Android
pnpm run android

# iOS (apenas macOS)
pnpm run ios
```

### Estrutura do Projeto

```
checklist-inspecao-industrial/
├── app/                          # Telas da app (React Native)
│   ├── (tabs)/                   # Abas principais
│   ├── checklist/                # Fluxo do checklist
│   └── oauth/                    # Autenticação
├── components/                   # Componentes reutilizáveis
├── lib/                          # Lógica compartilhada
│   ├── checklist-context.tsx     # Estado do checklist
│   ├── checklist-configs.ts      # Configurações dos checklists
│   ├── pdf-generator.ts          # Geração de PDF
│   └── types.ts                  # Tipos TypeScript
├── server/                       # Backend (Node.js + Express)
│   ├── _core/                    # Core do servidor
│   ├── routes/                   # Rotas da API
│   ├── db.ts                     # Configuração do banco
│   └── routers.ts                # Rotas tRPC
├── public/                       # Arquivos estáticos
├── app.config.ts                 # Configuração Expo
├── package.json                  # Dependências
├── tsconfig.json                 # Configuração TypeScript
└── tailwind.config.js            # Configuração Tailwind
```

---

## Build para Produção

### 1. Build Web (para deploy em servidor)

```bash
# Compilar TypeScript
pnpm run check

# Build do Metro para web
pnpm run build

# Resultado em: dist/
```

### 2. Build APK (Android)

```bash
# Opção A: EAS Build (recomendado)
pnpm install -g eas-cli
eas build --platform android --profile production

# Opção B: Build local
pnpm run android
# Depois em Android Studio: Build > Build Bundle(s) / APK(s)
```

### 3. Build IPA (iOS - apenas macOS)

```bash
# Opção A: EAS Build
eas build --platform ios --profile production

# Opção B: Build local
pnpm run ios
# Depois em Xcode: Product > Archive
```

---

## Deployment

### Opção 1: Vercel (Recomendado para Web)

```bash
# Instalar Vercel CLI
npm install -g vercel

# Deploy
vercel
```

### Opção 2: Railway

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
railway up
```

### Opção 3: Docker

```bash
# Build imagem Docker
docker build -t checklist-app .

# Rodar container
docker run -p 3000:3000 -e DATABASE_URL="..." checklist-app
```

### Opção 4: Google Cloud Run

```bash
# Instalar Google Cloud SDK
# https://cloud.google.com/sdk/docs/install

# Deploy
gcloud run deploy checklist-app \
  --source . \
  --platform managed \
  --region us-central1
```

---

## Troubleshooting

### Erro: "Module not found"
```bash
# Limpar cache e reinstalar
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Erro: "Cannot connect to database"
```bash
# Verificar se MySQL está rodando
mysql.server status

# Verificar DATABASE_URL no .env
echo $DATABASE_URL
```

### Erro: "Port 3000 already in use"
```bash
# Usar porta diferente
PORT=3001 pnpm run dev
```

### Erro: "Expo Go not connecting"
```bash
# Verificar se está na mesma rede WiFi
# Ou usar tunnel:
EXPO_TUNNEL=true pnpm run dev
```

---

## Comandos Úteis

```bash
# Desenvolvimento
pnpm run dev              # Inicia dev server
pnpm run check            # Verifica TypeScript
pnpm run lint             # Lint do código
pnpm run format           # Formata código

# Banco de dados
pnpm run db:push          # Migra banco de dados
pnpm run db:studio        # Abre Drizzle Studio (GUI)

# Build
pnpm run build            # Build para produção
pnpm run android          # Build Android
pnpm run ios              # Build iOS

# Testes
pnpm run test             # Roda testes

# QR Code
pnpm run qr               # Gera QR code
```

---

## Suporte

Para dúvidas ou problemas:
1. Verifique a documentação oficial:
   - Expo: https://docs.expo.dev
   - React Native: https://reactnative.dev
   - tRPC: https://trpc.io

2. Verifique os logs:
   ```bash
   # Terminal do dev server
   # Ou arquivo: .manus-logs/devserver.log
   ```

3. Limpe cache e reinstale:
   ```bash
   pnpm store prune
   pnpm install
   ```

---

## Notas Importantes

- ✅ Sempre use `pnpm` em vez de `npm` ou `yarn`
- ✅ Mantenha o `.env` seguro (não commitar no Git)
- ✅ Use `pnpm run db:push` sempre que modificar schema do banco
- ✅ Teste em múltiplos dispositivos antes de deploy
- ✅ Mantenha dependências atualizadas: `pnpm update`

---

**Versão**: 1.0.0  
**Última atualização**: Julho 2026  
**Autor**: Manus AI
