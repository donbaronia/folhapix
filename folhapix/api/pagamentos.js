import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

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

  if (req.method === 'POST') {
    const {
      funcionario_id, valor, descricao,
      valor_original, desconto,
      mp_status, pix_code
    } = req.body

    if (!funcionario_id || !valor) {
      return res.status(400).json({ erro: 'funcionario_id e valor são obrigatórios' })
    }

    const { data: func, error: errFunc } = await supabase
      .from('funcionarios')
      .select('*')
      .eq('id', funcionario_id)
      .single()

    if (errFunc || !func) return res.status(404).json({ erro: 'Funcionário não encontrado' })

    // Se for confirmação manual (Pix Estático escaneado pelo usuário)
    if (mp_status === 'confirmed_manual') {
      const obsDesconto = desconto ? ` (vale R$ ${Number(desconto).toFixed(2)})` : ''
      const { data: pagamento, error: errPag } = await supabase
        .from('pagamentos')
        .insert([{
          funcionario_id,
          valor: Number(Number(valor).toFixed(2)),
          descricao: (descricao || `Salario ${func.nome}`) + obsDesconto,
          mp_payment_id: null,
          mp_status: 'confirmed_manual',
          pix_code: pix_code || null,
          pix_chave_destino: func.pix_chave,
          mes_referencia: new Date().toISOString().slice(0, 7),
          criado_em: new Date().toISOString()
        }])
        .select()
        .single()

      if (errPag) return res.status(500).json({ erro: errPag.message })
      return res.status(200).json({
        ok: true,
        status: 'confirmed_manual',
        funcionario: func.nome,
        valor: Number(valor),
        comprovante_id: pagamento?.id
      })
    }

    // Tentativa via API Mercado Pago (fallback)
    try {
      const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
          'X-Idempotency-Key': `folhapix-${funcionario_id}-${Date.now()}`
        },
        body: JSON.stringify({
          transaction_amount: Number(Number(valor).toFixed(2)),
          description: descricao || `Salario ${func.nome}`,
          payment_method_id: 'pix',
          payer: {
            email: process.env.EMPRESA_EMAIL || 'empresa@email.com.br',
            first_name: func.nome.split(' ')[0],
            last_name: func.nome.split(' ').slice(1).join(' ') || 'Funcionario',
            identification: {
              type: 'CPF',
              number: (process.env.EMPRESA_CPF || '00000000000').replace(/\D/g, '')
            }
          }
        })
      })

      const resultado = await mpRes.json()
      if (!mpRes.ok) throw new Error(resultado.message || 'Erro no Mercado Pago')

      const obsDesconto = desconto ? ` (vale R$ ${Number(desconto).toFixed(2)})` : ''
      const { data: pagamento } = await supabase
        .from('pagamentos')
        .insert([{
          funcionario_id,
          valor: Number(Number(valor).toFixed(2)),
          descricao: (descricao || `Salario ${func.nome}`) + obsDesconto,
          mp_payment_id: String(resultado.id),
          mp_status: resultado.status,
          pix_code: resultado.point_of_interaction?.transaction_data?.qr_code || null,
          pix_chave_destino: func.pix_chave,
          mes_referencia: new Date().toISOString().slice(0, 7),
          criado_em: new Date().toISOString()
        }])
        .select()
        .single()

      return res.status(200).json({
        ok: true,
        pagamento_id: resultado.id,
        status: resultado.status,
        funcionario: func.nome,
        valor: Number(valor),
        comprovante_id: pagamento?.id
      })

    } catch (err) {
      await supabase.from('pagamentos').insert([{
        funcionario_id,
        valor: Number(valor),
        descricao: descricao || `Salario ${func.nome}`,
        mp_status: 'erro',
        pix_chave_destino: func.pix_chave,
        mes_referencia: new Date().toISOString().slice(0, 7),
        criado_em: new Date().toISOString(),
        erro_msg: err.message
      }])
      return res.status(500).json({ erro: 'Erro ao processar', detalhe: err.message })
    }
  }

  return res.status(405).json({ erro: 'Método não permitido' })
}
