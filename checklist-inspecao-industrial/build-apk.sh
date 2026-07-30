#!/bin/bash
set -e

echo "🚀 Iniciando compilação do APK..."
echo "================================"

# 1. Instalar dependências
echo "📦 Instalando dependências..."
npm install

# 2. Limpar cache
echo "🧹 Limpando cache..."
rm -rf .expo node_modules/.cache

# 3. Compilar com Expo
echo "🔨 Compilando APK com Expo..."
npx eas build --platform android --local

echo "✅ APK compilado com sucesso!"
echo "📁 Procure pelo arquivo .apk na pasta 'dist' ou 'build'"
