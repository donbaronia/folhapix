# FolhaPix — App de Pagamento de Funcionários via Pix

App completo para gerenciar pagamentos mensais via Pix (Mercado Pago),
com banco de dados no Supabase e hospedagem gratuita no Vercel.

---

## PASSO A PASSO PARA COLOCAR NO AR

### PASSO 1 — Criar banco de dados no Supabase (5 min)

1. Acesse https://supabase.com e clique em "Start for free"
2. Crie uma conta (pode usar Google)
3. Clique em "New Project"
4. Dê um nome: "folhapix" — escolha uma senha e clique em Create
5. Aguarde ~2 minutos o banco criar
6. No menu lateral, clique em "SQL Editor"
7. Cole TODO o conteúdo do arquivo `supabase-setup.sql` e clique em "Run"
8. Anote as credenciais:
   - Vá em Settings → API
   - Copie: "Project URL" → isso é o SUPABASE_URL
   - Copie: "service_role" (secret) → isso é o SUPABASE_SERVICE_KEY

---

### PASSO 2 — Pegar token do Mercado Pago (5 min)

1. Acesse https://www.mercadopago.com.br
2. Faça login na sua conta de empresa
3. Vá em: Seu negócio → Configurações → Credenciais
4. Clique em "Credenciais de produção"
5. Copie o "Access Token" (começa com APP_USR-...)
   → isso é o MERCADOPAGO_ACCESS_TOKEN

---

### PASSO 3 — Subir no Vercel (5 min)

1. Acesse https://vercel.com e crie uma conta gratuita
2. Clique em "Add New Project" → "Import Git Repository"
3. OU use o upload direto:
   - Instale o Vercel CLI: npm i -g vercel
   - Na pasta do projeto, rode: vercel
   - Siga as instruções no terminal

4. Configure as variáveis de ambiente no Vercel:
   - Vá em: Project Settings → Environment Variables
   - Adicione uma por uma:

   | Nome                        | Valor                          |
   |-----------------------------|--------------------------------|
   | SUPABASE_URL                | (copiado no Passo 1)           |
   | SUPABASE_SERVICE_KEY        | (copiado no Passo 1)           |
   | MERCADOPAGO_ACCESS_TOKEN    | (copiado no Passo 2)           |
   | EMPRESA_EMAIL               | seu@email.com.br               |
   | EMPRESA_CPF                 | 00000000000 (CPF da empresa/dono) |

5. Clique em Deploy!

---

### PASSO 4 — Testar (2 min)

1. Acesse o link gerado pelo Vercel (ex: folhapix.vercel.app)
2. Os 3 funcionários (Francisco, Newton, Camila) já aparecem
3. Atualize as chaves Pix deles clicando em cada um
4. Teste um pagamento!

---

## ESTRUTURA DOS ARQUIVOS

```
folhapix/
├── public/
│   └── index.html          ← Frontend completo (toda a interface)
├── api/
│   ├── funcionarios.js     ← API: cadastrar/listar/editar funcionários
│   ├── pagamentos.js       ← API: enviar Pix via Mercado Pago
│   └── alertas.js          ← API: verificar vencimentos do dia
├── supabase-setup.sql      ← Script para criar as tabelas
├── package.json
├── vercel.json
└── README.md
```

---

## FUNCIONALIDADES

- Dashboard com alertas de vencimento por urgência
- Cadastro de funcionários com cálculo automático do salário proporcional
- Pagamento Pix real via API do Mercado Pago (1 clique)
- Comprovante com ID de transação salvo no banco
- Histórico completo de pagamentos
- Funciona no celular e no computador
- Notificação visual no dia do pagamento de cada funcionário

---

## SUPORTE

Qualquer dúvida ou problema, abra o Claude e descreva o erro.
O Claude pode atualizar e melhorar o app a qualquer momento.
