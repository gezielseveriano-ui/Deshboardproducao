# Design do Aplicativo - Checklist Inspeção Industrial

## Visão Geral
Aplicativo Android para digitalização do **Checklist CL-ENG-1032/02.01 – Inspeção da Lateral do Truque**. Interface limpa, robusta e otimizada para uso com luvas em ambiente industrial.

## Orientação e Dimensões
- **Orientação**: Portrait (9:16)
- **Uso**: Uma mão
- **Contexto**: Ambiente industrial (uso com luvas)
- **Padrão**: Apple Human Interface Guidelines (HIG) adaptado para Android

## Paleta de Cores
| Token | Cor | Uso |
|-------|-----|-----|
| **primary** | `#1e40af` (Azul Escuro) | Botões primários, destaques |
| **success** | `#16a34a` (Verde) | Status OK, aprovado |
| **warning** | `#ea580c` (Laranja) | Status NÃO OK, atenção |
| **error** | `#dc2626` (Vermelho) | Erros, campos obrigatórios |
| **background** | `#ffffff` (Branco) | Fundo principal |
| **surface** | `#f3f4f6` (Cinza Claro) | Cards, superfícies elevadas |
| **foreground** | `#1f2937` (Cinza Escuro) | Texto principal |
| **muted** | `#6b7280` (Cinza Médio) | Texto secundário |
| **border** | `#e5e7eb` (Cinza Muito Claro) | Bordas, divisores |

## Lista de Telas

### 1. Tela Inicial (Home)
**Propósito**: Exibir opção para iniciar novo checklist ou visualizar histórico.

**Conteúdo Principal**:
- Título: "Checklist – Inspeção da Lateral do Truque"
- Botão grande: "Iniciar Novo Checklist"
- Seção: "Checklists Recentes" (lista de últimos 5 checklists)
- Cada item mostra: Data, Modelo da Lateral, Status (Completo/Incompleto)

**Funcionalidade**:
- Toque em checklist recente → Abre para edição/visualização
- Toque em "Iniciar Novo" → Vai para Tela de Dados Iniciais

---

### 2. Tela de Dados Iniciais
**Propósito**: Coletar informações básicas do checklist.

**Campos Obrigatórios**:
- Data (automática, editável) - formato DD/MM/YYYY
- Data de Fabricação - campo de data
- Nº da OP - campo de texto
- Nº da Série - campo de texto
- Data da Recuperação - campo de data
- Nº do Relatório de PM - campo de texto

**Validações**:
- Todos os campos são obrigatórios
- Campos vazios destacados em vermelho
- Botão "Próximo" desabilitado até preenchimento completo

**Navegação**:
- Botão "Próximo" → Tela de Seleção do Modelo

---

### 3. Tela de Seleção do Modelo da Lateral
**Propósito**: Selecionar o modelo único da lateral (obrigatório).

**Conteúdo**:
- Título: "Selecione o Modelo da Lateral"
- 4 Checkboxes (apenas um pode ser selecionado):
  - [ ] RIDE MASTER 6.1/2 x 9
  - [ ] MOTION CONTROL 7 x 12
  - [ ] MOTION CONTROL 6.1/2 x 9
  - [ ] HÍBRIDO MC-RM 6.1/2 x 9

**Validações**:
- Exatamente um modelo deve ser selecionado
- Campo destacado em vermelho se não selecionado

**Navegação**:
- Botão "Próximo" → Tela de Verificações Iniciais

---

### 4. Tela de Verificações Iniciais
**Propósito**: Realizar verificações de trinca e empeno.

**Conteúdo**:
- Título: "Verificações Iniciais"
- **Verificação de Trinca**:
  - ( ) Aprovado
  - ( ) Reprovado
- **Verificação de Empenos**:
  - ( ) Aprovado
  - ( ) Reprovado

**Validações**:
- Ambas as verificações são obrigatórias
- Campos destacados em vermelho se não selecionados

**Navegação**:
- Botão "Próximo" → Tela do Checklist Técnico (Etapa 1)

---

### 5. Tela do Checklist Técnico (Etapas 1-11)
**Propósito**: Executar as 11 etapas do checklist técnico.

**Estrutura por Etapa**:
- Título: "Etapa X – [Nome da Etapa]"
- Texto fixo: Descrição da atividade e resultado esperado
- **Campo "Resultado Encontrado"**:
  - ( ) OK
  - ( ) NÃO OK
  - ( ) NÃO APLICÁVEL
- **Campo "Medidas"** (quantidade varia por etapa):
  - Campo numérico com label (ex: "mm", "graus")
  - Checkbox "Não aplicável" desativa o campo

**Etapas Definidas**:
1. Distância entre Orelhas do Pedestal (2 medidas)
2. Altura do Pedestal (1 medida)
3. Distância entre Centros de Furos (2 medidas)
4. Alinhamento Lateral (1 medida)
5. Espessura da Lateral (2 medidas)
6. Verificação de Corrosão (0 medidas)
7. Aperto de Parafusos (1 medida)
8. Desgaste de Componentes (0 medidas)
9. Alinhamento Vertical (1 medida)
10. Verificação de Rachaduras (0 medidas)
11. Inspeção Final (0 medidas)

**Navegação**:
- Botão "Próxima Etapa" → Próxima etapa
- Botão "Etapa Anterior" → Etapa anterior
- Indicador de progresso: "Etapa X de 11"
- Após Etapa 11 → Tela de Assinaturas

---

### 6. Tela de Assinaturas Digitais
**Propósito**: Coletar assinaturas digitais obrigatórias.

**Estrutura**:
- Título: "Assinaturas Digitais"
- 3 Blocos de Assinatura:

**Bloco 1: Executante**
- Campo de texto: Nome
- Campo de texto: Matrícula
- Área de desenho: Assinatura digital (canvas)
- Botões: "Limpar" | "Confirmar"

**Bloco 2: Liberação Líder MRS**
- Campo de texto: Nome
- Campo de texto: Matrícula
- Área de desenho: Assinatura digital (canvas)
- Botões: "Limpar" | "Confirmar"

**Bloco 3: Liberação Inspetor Técnico**
- Campo de texto: Nome
- Campo de texto: Matrícula
- Área de desenho: Assinatura digital (canvas)
- Botões: "Limpar" | "Confirmar"

**Validações**:
- Todos os campos são obrigatórios
- Assinatura não pode estar vazia
- Campos destacados em vermelho se incompletos

**Navegação**:
- Botão "Gerar Relatório" → Tela de Relatório Final

---

### 7. Tela de Relatório Final
**Propósito**: Exibir resumo e opções de download/compartilhamento.

**Conteúdo**:
- Título: "Relatório Finalizado"
- Resumo visual:
  - Data, Modelo da Lateral, Nº da OP
  - Status geral (Completo)
  - Número de etapas OK / NÃO OK / NÃO APLICÁVEL
- Botões:
  - [ Visualizar PDF ]
  - [ Baixar PDF ]
  - [ Compartilhar (WhatsApp) ]
  - [ Compartilhar (E-mail) ]
  - [ Novo Checklist ]

---

## Fluxo de Navegação

```
Home
  ↓
Dados Iniciais → Seleção Modelo → Verificações Iniciais
  ↓
Checklist Técnico (Etapas 1-11)
  ↓
Assinaturas Digitais
  ↓
Relatório Final
  ↓
Home
```

## Padrões de Componentes

### Botões
- **Primário**: Azul escuro, padding grande (48px altura)
- **Secundário**: Cinza, outline
- **Desabilitado**: Opacidade 50%
- **Feedback**: Escala 0.97 ao pressionar

### Campos de Entrada
- **Altura**: 48px (fácil para luvas)
- **Padding**: 12px horizontal
- **Borda**: 1px cinza claro
- **Foco**: Borda azul escura
- **Erro**: Borda vermelha

### Radio Buttons / Checkboxes
- **Tamanho**: 24px
- **Espaçamento**: 12px entre opções
- **Feedback**: Mudança de cor ao seleção

### Canvas de Assinatura
- **Altura**: 200px
- **Fundo**: Branco com borda cinza
- **Stroke**: Preto, 2px de espessura
- **Feedback**: Mostrar preview da assinatura

## Diretrizes de Usabilidade

1. **Uso com Luvas**: Botões e campos com mínimo 48px de altura
2. **Validação em Tempo Real**: Destacar campos obrigatórios não preenchidos
3. **Scroll Vertical**: Navegação por scroll, não por abas
4. **Feedback Visual**: Cores claras para status (verde = OK, laranja = NÃO OK)
5. **Offline**: Todos os dados salvos localmente no dispositivo
6. **Persistência**: Auto-save após cada seção preenchida

## Armazenamento de Dados

- **Local Storage**: AsyncStorage (React Native)
- **Estrutura**: JSON com timestamp
- **Backup**: Histórico de últimos 50 checklists
- **PDF**: Gerado localmente, armazenado em cache

## Considerações Técnicas

- **Assinatura Digital**: react-native-signature-canvas ou similar
- **PDF**: react-native-pdf-lib ou expo-print
- **Compartilhamento**: Expo Sharing
- **Data/Hora**: Expo Constants para timestamp automático
