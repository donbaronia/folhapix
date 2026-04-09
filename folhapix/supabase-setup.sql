-- ============================================
-- FOLHAPIX — Script SQL para o Supabase
-- Cole isso no SQL Editor do Supabase e clique em Run
-- ============================================

-- Tabela de funcionários
CREATE TABLE IF NOT EXISTS funcionarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  salario NUMERIC(10,2) NOT NULL,
  pix_chave TEXT NOT NULL,
  pix_tipo TEXT DEFAULT 'celular' CHECK (pix_tipo IN ('cpf','celular','email','cnpj','aleatoria')),
  data_entrada DATE NOT NULL,
  dia_pagamento INTEGER NOT NULL CHECK (dia_pagamento BETWEEN 1 AND 31),
  salario_primeiro_mes NUMERIC(10,2),
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de pagamentos
CREATE TABLE IF NOT EXISTS pagamentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID REFERENCES funcionarios(id) ON DELETE CASCADE,
  valor NUMERIC(10,2) NOT NULL,
  descricao TEXT,
  mp_payment_id TEXT,
  mp_status TEXT,
  pix_code TEXT,
  pix_chave_destino TEXT,
  mes_referencia TEXT,
  erro_msg TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pagamentos_funcionario ON pagamentos(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_mes ON pagamentos(mes_referencia);
CREATE INDEX IF NOT EXISTS idx_funcionarios_status ON funcionarios(status);

-- Row Level Security (segurança - desabilitar para uso com service key)
ALTER TABLE funcionarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos DISABLE ROW LEVEL SECURITY;

-- Dados iniciais de exemplo (os 3 funcionários)
INSERT INTO funcionarios (nome, salario, pix_chave, pix_tipo, data_entrada, dia_pagamento, salario_primeiro_mes)
VALUES
  ('Francisco', 1850.00, '(98) 99999-0001', 'celular', '2025-03-14', 14, 1074.19),
  ('Newton',    1850.00, '(98) 99999-0002', 'celular', '2025-03-18', 18,  836.29),
  ('Camila',    1850.00, '(98) 99999-0003', 'celular', '2025-03-27', 27,  298.39)
ON CONFLICT DO NOTHING;

-- Verificar tabelas criadas
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
