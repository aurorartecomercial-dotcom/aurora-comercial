CREATE TABLE IF NOT EXISTS produtos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL,
  preco TEXT NOT NULL,
  preco_antigo TEXT,
  descricao TEXT,
  imagem TEXT,
  estoque INTEGER DEFAULT 0,
  tag TEXT,
  frete_gratis INTEGER DEFAULT 0,
  prazo_entrega TEXT DEFAULT 'normal',
  ordem INTEGER DEFAULT 0,
  video TEXT,
  custo TEXT
);

CREATE TABLE IF NOT EXISTS vendas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo_rastreio TEXT NOT NULL,
  data_hora TEXT NOT NULL,
  nome_cliente TEXT NOT NULL,
  telefone_cliente TEXT NOT NULL,
  nif_cliente TEXT NOT NULL,
  morada_cliente TEXT,
  produtos_resumo TEXT,
  valor_total REAL,
  status TEXT DEFAULT 'confirmado',
  cliente_id INTEGER,
  referencia_pagamento TEXT,
  status_pagamento TEXT DEFAULT 'pendente'
);

CREATE TABLE IF NOT EXISTS clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  telefone TEXT NOT NULL,
  senha_hash TEXT NOT NULL,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS avaliacoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  produto_id INTEGER NOT NULL,
  nota INTEGER NOT NULL,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bairros_frete (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  taxa REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS pontos_cliente (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL,
  pontos INTEGER NOT NULL,
  criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
);