-- Criar tabela de checklists completados
CREATE TABLE IF NOT EXISTS completed_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Identificação do dispositivo
  device_id TEXT NOT NULL,
  
  -- Informações do checklist
  checklist_code TEXT NOT NULL,
  checklist_name TEXT NOT NULL,
  categoria TEXT NOT NULL, -- 'Lateral', 'Travessa', 'Triângulo'
  modelo TEXT NOT NULL,
  resultado TEXT NOT NULL, -- 'OK', 'NÃO OK', 'NÃO APLICÁVEL'
  
  -- Dados do executante
  executante_name TEXT NOT NULL,
  executante_matricula TEXT NOT NULL,
  
  -- Dados do líder e inspetor
  lider_name TEXT,
  lider_matricula TEXT,
  inspector_name TEXT,
  inspector_matricula TEXT,
  
  -- Datas
  data_recuperacao TEXT,
  data_fabricacao TEXT,
  
  -- Dados técnicos
  numero_serie TEXT,
  numero_op TEXT,
  
  -- Resultado detalhado (JSON)
  resultado_detalhado JSONB DEFAULT '{}'::jsonb,
  
  -- Assinaturas (JSON)
  signatures JSONB DEFAULT '{}'::jsonb,
  
  -- Observações
  observations TEXT,
  
  -- PDF
  pdf_url TEXT,
  pdf_file_name TEXT,
  
  -- Sincronização
  sync_status TEXT DEFAULT 'pending', -- 'pending', 'synced', 'failed'
  sync_error TEXT,
  synced_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamp para cálculos
  timestamp BIGINT NOT NULL
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_completed_checklists_device_id ON completed_checklists(device_id);
CREATE INDEX IF NOT EXISTS idx_completed_checklists_categoria ON completed_checklists(categoria);
CREATE INDEX IF NOT EXISTS idx_completed_checklists_created_at ON completed_checklists(created_at);
CREATE INDEX IF NOT EXISTS idx_completed_checklists_sync_status ON completed_checklists(sync_status);
CREATE INDEX IF NOT EXISTS idx_completed_checklists_executante ON completed_checklists(executante_matricula);

-- Ativar RLS (Row Level Security) - qualquer um pode ler/escrever
ALTER TABLE completed_checklists ENABLE ROW LEVEL SECURITY;

-- Política: Qualquer um pode ler todos os checklists
CREATE POLICY "Enable read access for all users" ON completed_checklists
  FOR SELECT USING (true);

-- Política: Qualquer um pode inserir checklists
CREATE POLICY "Enable insert for all users" ON completed_checklists
  FOR INSERT WITH CHECK (true);

-- Política: Qualquer um pode atualizar seus próprios checklists
CREATE POLICY "Enable update for all users" ON completed_checklists
  FOR UPDATE USING (true) WITH CHECK (true);

-- Política: Qualquer um pode deletar seus próprios checklists
CREATE POLICY "Enable delete for all users" ON completed_checklists
  FOR DELETE USING (true);

-- Cadastro de pessoas (executantes, líderes, inspetores) usado no Banco de
-- Assinaturas - antes ficava só no armazenamento local do navegador, o que
-- fazia o cadastro desaparecer quando o navegador limpava os dados (comum em
-- navegadores embutidos de outros apps, como o do WhatsApp). Agora fica no
-- banco de dados, disponível em qualquer aparelho/navegador.
CREATE TABLE IF NOT EXISTS registered_people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  tipo TEXT NOT NULL CHECK (tipo IN ('executante', 'lider', 'inspetor')),
  nome_completo TEXT NOT NULL,
  matricula TEXT NOT NULL,
  email TEXT,
  data_cadastro TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_registered_people_tipo ON registered_people(tipo);
CREATE INDEX IF NOT EXISTS idx_registered_people_matricula ON registered_people(matricula);

ALTER TABLE registered_people ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON registered_people
  FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON registered_people
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable delete for all users" ON registered_people
  FOR DELETE USING (true);

-- E-mails da empresa (destinatários), mesmo motivo da tabela acima.
CREATE TABLE IF NOT EXISTS company_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  email TEXT NOT NULL,
  data_cadastro TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE company_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON company_emails
  FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON company_emails
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable delete for all users" ON company_emails
  FOR DELETE USING (true);
