import { createClient } from '@supabase/supabase-js'
import MercadoPagoConfig, { Payment } from 'mercadopago'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN
})

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  // GET - histórico de pagamentos (todos ou por funcionário)
  if (req.method === 'GET') {
    const { funcionario_id } = req.query
    let query = supabase
      .from('pagamentos')
      .select('*, funcionarios(nome, pix_chave)')
      .order('criado_em', { ascending: false })
      .limit(100)

    if (funcionario_id) query = query.eq('funcionario_id', funcionario_id)

    const { data, error } = await query
    if (error) return res.status(500).json({ erro: error.message })
    return res.status(200).json(data)
  }

  // POST - realizar pagamento Pix real via Mercado Pago
  if (req.method === 'POST') {
    const { funcionario_id, valor, descricao } = req.body

    if (!funcionario_id || !valor) {
      return res.status(400).json({ erro: 'funcionario_id e valor são obrigatórios' })
    }

    // Buscar dados do funcionário
    const { data: func, error: errFunc } = await supabase
      .from('funcionarios')
      .select('*')
      .eq('id', funcionario_id)
      .single()

    if (errFunc || !func) {
      return res.status(404).json({ erro: 'Funcionário não encontrado' })
    }

    // Montar chave Pix no formato certo para o MP
    const pixKeyTypes = {
      cpf: 'cpf',
      celular: 'phone',
      email: 'email',
      cnpj: 'cnpj',
      aleatoria: 'random'
    }

    try {
      // Criar pagamento Pix no Mercado Pago
      const payment = new Payment(mpClient)
      const resultado = await payment.create({
        body: {
          transaction_amount: Number(valor),
          description: descricao || `Salário ${func.nome} - ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
          payment_method_id: 'pix',
          payer: {
            email: process.env.EMPRESA_EMAIL || 'empresa@folhapix.com.br',
            identification: {
              type: 'CPF',
              number: process.env.EMPRESA_CPF || '00000000000'
            }
          },
          // Dados da transferência Pix para o funcionário
          point_of_interaction: {
            linked_to: 'mp_home'
          }
        }
      })

      const pagamentoId = resultado.id
      const status = resultado.status
      const pixCode = resultado.point_of_interaction?.transaction_data?.qr_code || null

      // Salvar pagamento no banco
      const { data: pagamento, error: errPag } = await supabase
        .from('pagamentos')
        .insert([{
          funcionario_id,
          valor: Number(valor),
          descricao: descricao || `Salário ${func.nome}`,
          mp_payment_id: String(pagamentoId),
          mp_status: status,
          pix_code: pixCode,
          pix_chave_destino: func.pix_chave,
          mes_referencia: new Date().toISOString().slice(0, 7),
          criado_em: new Date().toISOString()
        }])
        .select()
        .single()

      if (errPag) {
        console.error('Erro ao salvar pagamento:', errPag)
      }

      return res.status(200).json({
        ok: true,
        pagamento_id: pagamentoId,
        status,
        pix_code: pixCode,
        funcionario: func.nome,
        valor: Number(valor),
        comprovante_id: pagamento?.id
      })

    } catch (err) {
      console.error('Erro Mercado Pago:', err)

      // Salvar tentativa com erro no banco
      await supabase.from('pagamentos').insert([{
        funcionario_id,
        valor: Number(valor),
        descricao: descricao || `Salário ${func.nome}`,
        mp_status: 'erro',
        pix_chave_destino: func.pix_chave,
        mes_referencia: new Date().toISOString().slice(0, 7),
        criado_em: new Date().toISOString(),
        erro_msg: err.message
      }])

      return res.status(500).json({
        erro: 'Erro ao processar pagamento no Mercado Pago',
        detalhe: err.message
      })
    }
  }

  return res.status(405).json({ erro: 'Método não permitido' })
}
