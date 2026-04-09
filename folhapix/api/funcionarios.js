import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  // GET - listar todos os funcionários
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('funcionarios')
      .select('*')
      .order('nome')

    if (error) return res.status(500).json({ erro: error.message })
    return res.status(200).json(data)
  }

  // POST - cadastrar novo funcionário
  if (req.method === 'POST') {
    const { nome, salario, pix_chave, pix_tipo, data_entrada } = req.body

    if (!nome || !salario || !pix_chave || !data_entrada) {
      return res.status(400).json({ erro: 'Campos obrigatórios: nome, salario, pix_chave, data_entrada' })
    }

    // Calcular dia de pagamento (mesmo dia do mês da data de entrada)
    const entrada = new Date(data_entrada)
    const dia_pagamento = entrada.getDate()

    // Calcular salário proporcional do primeiro mês
    const diasNoMes = new Date(entrada.getFullYear(), entrada.getMonth() + 1, 0).getDate()
    const diasTrabalhados = diasNoMes - entrada.getDate() + 1
    const salario_primeiro_mes = Number(((salario / diasNoMes) * diasTrabalhados).toFixed(2))

    const { data, error } = await supabase
      .from('funcionarios')
      .insert([{
        nome,
        salario: Number(salario),
        pix_chave,
        pix_tipo: pix_tipo || 'celular',
        data_entrada,
        dia_pagamento,
        salario_primeiro_mes,
        status: 'ativo'
      }])
      .select()
      .single()

    if (error) return res.status(500).json({ erro: error.message })
    return res.status(201).json(data)
  }

  // PUT - editar funcionário
  if (req.method === 'PUT') {
    const { id, ...campos } = req.body
    if (!id) return res.status(400).json({ erro: 'ID obrigatório' })

    const { data, error } = await supabase
      .from('funcionarios')
      .update(campos)
      .eq('id', id)
      .select()
      .single()

    if (error) return res.status(500).json({ erro: error.message })
    return res.status(200).json(data)
  }

  // DELETE - remover funcionário
  if (req.method === 'DELETE') {
    const { id } = req.body
    if (!id) return res.status(400).json({ erro: 'ID obrigatório' })

    const { error } = await supabase.from('funcionarios').delete().eq('id', id)
    if (error) return res.status(500).json({ erro: error.message })
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ erro: 'Método não permitido' })
}
