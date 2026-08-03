# Análise da Estrutura do PDF - Checklist de Inspeção

## Página 1 - Cabeçalho e Inspeção Inicial

### Seção 1: Informações do Documento
- Título: CHECKLIST — Inspeção da Lateral do Truque Barba
- Código: CL-ENG-1029/04.01
- Data: 25/06/2024
- Válido até: 25/06/2029
- Status: Público
- Procedimento: POP-ENG-1088

### Seção 2: Tabela de Inspeção de Trincas e Empenos
Colunas:
1. **Inspeção de Trincas e Empenos** (esquerda)
   - Verificação de trinca: ☐ Aprovado ☐ Reprovado
   - Verificação de Empenos: ☐ Aprovado ☐ Reprovado

2. **Assinatura do Inspetor de PM** (direita)
   - Nome: _______________
   - Matrícula: _______________
   - Nº do Relatório de PM: _______________

3. **Data de Fabricação** (campo vazio)
4. **Nº da OP** (campo vazio)
5. **Nº da Série** (campo vazio)
6. **Data de Recuperação** (campo vazio)
7. **Modelo da Lateral** (checkboxes)
   - ☐ Lateral Barber 6.12x12
   - ☐ Lateral Barber 6x11
   - ☐ Lateral Barber 5.12x10
   - ☐ Lateral Barber 7x12 S2F
   - ☐ Lateral Barber 6.1/2x9 S2F

### Seção 3: Tabela de Etapas (Página 1)
Colunas: ETAPA | SISTEMA | SUBSISTEMA | ATIVIDADE | RESULTADO ESPERADO | RESULTADO ENCONTRADO | MEDIDAS | ASSINATURA

Etapas 1-8 (Laterais):
1. Orelhas do Pedestal Estirado
2. Espessura das Orelhas
3. Folga na Região do Pedestal
4. Abertura das Pernas
5. Abertura das Pernas
6. Largura Pedestal
7. Angularidade dos Pedestais
8. Angularidade dos Pedestais

---

## Página 2 - Continuação de Etapas e Assinaturas

### Seção 1: Tabela de Etapas (Página 2)
Etapas 9-15 (Laterais):
9. Teto dos Pedestais
10. Chapas dos pedestais
11. Chapas das colunas
12. Chapas das colunas
13. Chapas das colunas
14. Verificação da Base Rígida
15. Verificação do Dimensional das Guias ao Triângulo de Freio

### Seção 2: Banco de Assinaturas (Rodapé)
Três linhas de assinatura:
1. MATRÍCULA | EXECUTANTE
2. MATRÍCULA | LIBERAÇÃO LÍDER MRS
3. MATRÍCULA | LIBERAÇÃO INSPETOR TÉCNICO

---

## Fluxo de Telas do App

### Tela 1: Seleção de Checklist ✅
- Lista dos 8 checklists disponíveis
- Botão: "Criar Novo"

### Tela 2: Informações Iniciais
- Verificação de Trinca: ☐ Aprovado ☐ Reprovado
- Verificação de Empenos: ☐ Aprovado ☐ Reprovado
- Assinatura do Inspetor de PM (Nome, Matrícula, Nº do Relatório)
- Campos: Data de Fabricação, Nº da OP, Nº da Série, Data de Recuperação
- Checkboxes: Modelo da Lateral

### Tela 3-N: Etapas de Inspeção
Para cada etapa:
- Número da etapa
- Sistema
- Subsistema
- Atividade (descrição)
- Resultado Esperado
- Campo para Resultado Encontrado
- Campos para Medidas (se aplicável)
- Assinatura

### Tela Final: Assinaturas
- Executante (Matrícula + Assinatura)
- Liberação Líder MRS (Matrícula + Assinatura)
- Liberação Inspetor Técnico (Matrícula + Assinatura)

### Tela Final: Geração de PDF
- Gera PDF com todas as informações preenchidas
- Formato idêntico ao PDF original

---

## Campos Dinâmicos por Checklist

Cada um dos 8 checklists tem:
- Título específico
- Código específico
- Modelos específicos
- Etapas específicas (número e conteúdo variam)

Exemplo: CL-ENG-1029 tem 15 etapas
Outros checklists podem ter número diferente de etapas
