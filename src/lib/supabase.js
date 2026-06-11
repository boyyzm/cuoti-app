import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// 创建Supabase客户端
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 导出supabase的各种服务方法
export const supabaseAuth = supabase.auth
export const supabaseDb = supabase.from.bind(supabase)
export const supabaseStorage = supabase.storage
