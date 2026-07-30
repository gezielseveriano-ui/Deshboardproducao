# 📱 Instruções para Compilar APK - Checklist de Inspeção Industrial

## ✅ Status do Código
- **Versão:** 9fa68126
- **Testes:** 115 passando ✓
- **Pronto para compilação:** SIM ✓

## 🚀 Opção 1: Compilar com EAS (Recomendado - Mais Fácil)

### Pré-requisitos
- Node.js instalado
- npm ou yarn instalado
- Conta no Expo (https://expo.dev)

### Passo a Passo

#### 1. Instale EAS CLI
```bash
npm install -g eas-cli
```

#### 2. Faça login no Expo
```bash
eas login
```
(Use suas credenciais do Expo)

#### 3. Clone o repositório
```bash
gh repo clone seu-usuario/checklist-inspecao-industrial
cd checklist-inspecao-industrial
```

#### 4. Instale dependências
```bash
npm install
```

#### 5. Compile o APK
```bash
eas build --platform android --local
```

#### 6. Aguarde a compilação
- Pode levar 5-15 minutos
- Você receberá um link para download do APK

#### 7. Baixe o APK
- Clique no link fornecido pelo EAS
- Salve o arquivo `.apk` no seu computador

#### 8. Instale no tablet
```bash
adb install -r seu-apk.apk
```

---

## 🖥️ Opção 2: Compilar com Android Studio (Local)

### Pré-requisitos
- Android Studio instalado
- Android SDK 34+
- Java JDK 11+

### Passo a Passo

#### 1. Clone o repositório
```bash
gh repo clone seu-usuario/checklist-inspecao-industrial
cd checklist-inspecao-industrial
```

#### 2. Instale dependências
```bash
npm install
```

#### 3. Prepare o projeto Expo
```bash
npx expo prebuild --clean --platform android
```

#### 4. Compile o APK
```bash
cd android
./gradlew assembleRelease
```

#### 5. Localize o APK
```
android/app/build/outputs/apk/release/app-release.apk
```

#### 6. Instale no tablet
```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

---

## 📋 Checklist Antes de Compilar

- [ ] Código atualizado (versão 9fa68126)
- [ ] Testes passando (115 testes)
- [ ] Dependências instaladas
- [ ] Conta Expo criada (se usar EAS)
- [ ] Android SDK instalado (se usar Android Studio)

---

## ⚙️ Configurações do APK

### Gmail SMTP (Padrão)
- Email: `gezielseveriano@gmail.com`
- Servidor: `smtp.gmail.com`
- Porta: **465** (SSL/TLS)
- Senha: Sua senha de app do Gmail

### Mudanças Recentes
- ✅ Email com PDF anexado funcionando
- ✅ Histórico com número de série e OP
- ✅ Dados corretos no PDF
- ✅ Import nodemailer corrigido

---

## 🆘 Troubleshooting

### Erro: "EAS CLI not found"
```bash
npm install -g eas-cli
```

### Erro: "Android SDK not found"
- Instale Android Studio
- Configure variáveis de ambiente

### Erro: "Gradle build failed"
```bash
cd android
./gradlew clean
./gradlew assembleRelease
```

### Email não funciona no APK
- Verifique se está usando porta **465** (não 587)
- Confirme senha de app do Gmail
- Teste no Expo Go primeiro

---

## 📞 Suporte

Se tiver dúvidas, entre em contato com o desenvolvedor!

**Versão:** 9fa68126  
**Data:** 2026-02-24  
**Status:** ✅ Pronto para produção
