import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'GET') {
    return res.status(405).json({ erro: 'Método não permitido' })
  }

  const hoje = new Date()
  const diaHoje = hoje.getDate()
  const mesAtual = hoje.toISOString().slice(0, 7) // YYYY-MM

  // Buscar todos os funcionários ativos
  const { data: funcionarios, error } = await supabase
    .from('funcionarios')
    .select('*')
    .eq('status', 'ativo')

  if (error) return res.status(500).json({ erro: error.message })

  // Buscar pagamentos já feitos este mês
  const { data: pagamentosDoMes } = await supabase
    .from('pagamentos')
    .select('funcionario_id, mp_status')
    .eq('mes_referencia', mesAtual)
    .neq('mp_status', 'erro')

  const jaPageiSetIds = new Set(pagamentosDoMes?.map(p => p.funcionario_id) || [])

  const alertas = []

  for (const func of funcionarios) {
    const jaFoiPago = jaPageiSetIds.has(func.id)
    const diasParaVencer = func.dia_pagamento - diaHoje

    // Determinar o valor a pagar
    // Primeiro pagamento: proporcional; demais: salário cheio
    const { data: todosPagamentos } = await supabase
      .from('pagamentos')
      .select('id')
      .eq('funcionario_id', func.id)
      .neq('mp_status', 'erro')

    const ehPrimeiroPagamento = !todosPagamentos || todosPagamentos.length === 0
    const valorAPagar = ehPrimeiroPagamento
      ? func.salario_primeiro_mes
      : func.salario

    if (!jaFoiPago) {
      let tipo = 'pendente'
      let urgencia = 'normal'

      if (diasParaVencer === 0) {
        tipo = 'hoje'
        urgencia = 'alta'
      } else if (diasParaVencer < 0) {
        tipo = 'atrasado'
        urgencia = 'critica'
      } else if (diasParaVencer <= 3) {
        tipo = 'proximo'
        urgencia = 'media'
      }

      alertas.push({
        funcionario_id: func.id,
        nome: func.nome,
        dia_pagamento: func.dia_pagamento,
        dias_para_vencer: diasParaVencer,
        valor: valorAPagar,
        pix_chave: func.pix_chave,
        pix_tipo: func.pix_tipo,
        tipo,
        urgencia,
        eh_primeiro_pagamento: ehPrimeiroPagamento,
        pago: false
      })
    } else {
      alertas.push({
        funcionario_id: func.id,
        nome: func.nome,
        dia_pagamento: func.dia_pagamento,
        valor: valorAPagar,
        pix_chave: func.pix_chave,
        pix_tipo: func.pix_tipo,
        tipo: 'pago',
        urgencia: 'nenhuma',
        pago: true
      })
    }
  }

  // Ordenar: atrasados > hoje > próximos > pendentes > pagos
  const ordem = { critica: 0, alta: 1, media: 2, normal: 3, nenhuma: 4 }
  alertas.sort((a, b) => (ordem[a.urgencia] || 99) - (ordem[b.urgencia] || 99))

  const totalPendente = alertas
    .filter(a => !a.pago)
    .reduce((sum, a) => sum + (a.valor || 0), 0)

  const totalMes = alertas.reduce((sum, a) => sum + (a.valor || 0), 0)

  return res.status(200).json({
    dia_hoje: diaHoje,
    mes_referencia: mesAtual,
    alertas,
    resumo: {
      total_funcionarios: funcionarios.length,
      pagos_este_mes: jaPageiSetIds.size,
      pendentes: alertas.filter(a => !a.pago).length,
      hoje: alertas.filter(a => a.tipo === 'hoje').length,
      atrasados: alertas.filter(a => a.tipo === 'atrasado').length,
      total_pendente: Number(totalPendente.toFixed(2)),
      total_mes: Number(totalMes.toFixed(2))
    }
  })
}
