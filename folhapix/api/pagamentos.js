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
    if (error) return res.statu
