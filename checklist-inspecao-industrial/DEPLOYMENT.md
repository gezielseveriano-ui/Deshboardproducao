# 📱 Guia de Deployment - Checklist Inspeção Industrial

## 🎯 Visão Geral

Este aplicativo é um **checklist digital de inspeção de truques** que funciona **offline** e sincroniza com o banco de dados da empresa quando configurado.

**Características:**
- ✅ 8 tipos de checklists diferentes (Laterais e Travessas)
- ✅ Geração automática de PDFs com assinaturas digitais
- ✅ Integração com banco de dados MySQL da empresa
- ✅ Dashboard web em tempo real
- ✅ Configuração dinâmica de credenciais (sem hardcoding)
- ✅ Funciona offline - sincroniza quando conectado

---

## 🚀 Gerando o APK para Android

### Opção 1: Expo EAS Build (Recomendado para Produção)

```bash
# 1. Instalar EAS CLI
npm install -g eas-cli

# 2. Fazer login na conta Expo
eas login

# 3. Gerar APK
eas build --platform android --local

# 4. O APK será salvo em: ./dist/
```

### Opção 2: Build Local com Expo

```bash
# 1. Instalar dependências
npm install

# 2. Gerar APK localmente
npx expo prebuild --clean --platform android
cd android && ./gradlew assembleRelease
```

### Opção 3: Teste Rápido com Expo Go

```bash
# 1. Instalar Expo Go no Android
# Disponível em: https://play.google.com/store/apps/details?id=host.exp.exponent

# 2. Gerar QR Code
npm run qr

# 3. Escanear QR Code com Expo Go
```

---

## ⚙️ Configuração no Dispositivo

Após instalar o APK, o IT deve configurar:

### 1. **Área do Administrador** (⋯ menu em Configurações)

#### SMTP (Opcional - para envio de emails)
```
Email: seu-email@gmail.com
Servidor: smtp.gmail.com
Porta: 587
Senha: <senha de app do Gmail>
```

#### Rede e Banco de Dados (Obrigatório para sincronizar)
```
URL/IP do Servidor: 192.168.1.100 (ou IP da empresa)
Usuário de Rede: admin
Senha de Rede: senha123

Host do Banco: 192.168.1.100
Porta do Banco: 3306
Usuário do Banco: root
Senha do Banco: senha_banco
Nome do Banco: checklists_db
```

### 2. **Adicionar Executantes, Líderes e Inspetores**

Ir em Configurações e adicionar os dados de cada pessoa:
- Nome Completo
- Matrícula
- Email (opcional)

---

## 📊 Usando o Dashboard

### Acessar o Dashboard

1. **Gerar o Link Gerencial**
   - Configurar SMTP e Rede na Área do Administrador
   - Link será gerado automaticamente
   - Copiar e compartilhar com gerentes

2. **Acessar via Web**
   ```
   http://192.168.1.100:3000/dashboard/hash
   ```

3. **Conectar ao Banco de Dados**
   - Preencher credenciais do banco
   - Clicar em "Conectar e Carregar Dados"
   - Visualizar checklists em tempo real

### Funcionalidades do Dashboard

- 📈 Estatísticas de checklists completados
- 📋 Lista de todos os checklists
- 📥 Download de PDFs
- 🔍 Filtrar por categoria, resultado, data
- 📊 Gráficos de produção

---

## 🔄 Fluxo Completo de Uso

### 1. **Inspetor Preenche Checklist**
```
Abrir App → Selecionar Tipo → Preencher Dados → Assinatura → Gerar PDF
```

### 2. **PDF é Gerado Automaticamente**
```
✅ Salvo localmente no dispositivo
✅ Enviado por email (se SMTP configurado)
✅ Salvo no banco da empresa (se banco configurado)
```

### 3. **Gerente Acessa Dashboard**
```
Abrir navegador → http://IP:3000/dashboard/hash
→ Conectar ao banco → Visualizar checklists
```

---

## 🗄️ Estrutura do Banco de Dados

O app cria automaticamente a tabela:

```sql
CREATE TABLE checklists_inspecao (
  id INT AUTO_INCREMENT PRIMARY KEY,
  checklist_code VARCHAR(50),
  categoria VARCHAR(50),
  inspector_name VARCHAR(100),
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  checklist_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Campos JSON em checklist_data:**
- Todas as etapas e resultados
- Dados do inspetor
- Assinaturas digitais
- Datas e números de série
- Observações

---

## 🔐 Segurança

### Credenciais Armazenadas

- ✅ Armazenadas **localmente** no dispositivo (AsyncStorage)
- ✅ **Não** são enviadas para servidores externos
- ✅ **Não** são hardcoded no app
- ✅ Podem ser alteradas a qualquer momento

### Recomendações

1. **Use credenciais específicas** para o app (não use admin)
2. **Mude a senha** periodicamente
3. **Restrinja acesso** do banco de dados ao IP da empresa
4. **Use HTTPS** em produção (configure certificado SSL)

---

## 📱 Tipos de Checklists Suportados

| Código | Nome | Categoria |
|--------|------|-----------|
| CL-ENG-1029 | Inspeção da Lateral do Truque Barba | Lateral |
| CL-ENG-1030 | Inspeção da Lateral do Truque Swing Motion | Lateral |
| CL-ENG-1031 | Inspeção da Lateral do Truque Ride Control | Lateral |
| CL-ENG-1032 | Inspeção da Lateral do Truque Ride Master/MC/Híbrido | Lateral |
| CL-ENG-1033 | Inspeção da Travessa do Truque Ride Master/Motion Control | Travessa |
| CL-ENG-1034 | Inspeção da Travessa do Truque Barber | Travessa |
| CL-ENG-1035 | Inspeção da Travessa do Truque Ride Control | Travessa |
| CL-ENG-1036 | Inspeção da Travessa do Truque Swing Motion | Travessa |

---

## 🐛 Troubleshooting

### Problema: App não conecta ao banco

**Solução:**
1. Verificar se o host/IP está correto
2. Verificar se porta 3306 está aberta
3. Verificar credenciais do banco
4. Testar conexão com MySQL Workbench

### Problema: PDFs não são gerados

**Solução:**
1. Verificar se o dispositivo tem espaço em disco
2. Verificar permissões de armazenamento
3. Reiniciar o app

### Problema: Dashboard não carrega dados

**Solução:**
1. Verificar se o servidor está rodando
2. Verificar se a tabela existe no banco
3. Verificar credenciais no dashboard
4. Verificar logs do servidor

---

## 📞 Suporte

Para dúvidas ou problemas:
1. Verificar este documento
2. Consultar logs do app (Configurações → Logs)
3. Testar conexão com banco (Configurações → Teste de Conexão)

---

## 📦 Versão

- **Versão do App:** 1.0.0
- **Versão do React Native:** 0.81.5
- **Versão do Expo:** 54.0.29
- **Data de Build:** 21/02/2026

---

## ✅ Checklist de Deployment

- [ ] APK gerado e testado
- [ ] Credenciais de banco configuradas
- [ ] Banco de dados criado
- [ ] Executantes, líderes e inspetores adicionados
- [ ] Dashboard acessível
- [ ] Teste de checklist completo realizado
- [ ] PDFs sendo gerados corretamente
- [ ] Dados sendo salvos no banco
- [ ] Dashboard mostrando dados em tempo real
