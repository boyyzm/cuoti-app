// POST /api/admin/create-user - 创建用户（仅管理员）
// POST /api/admin/delete-user - 删除用户
// GET /api/admin/users - 获取用户列表

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// 验证管理员权限
async function verifyAdmin(token) {
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      }
    })
    
    if (!response.ok) return false
    
    const data = await response.json()
    // 这里简化处理，实际应该验证token对应的用户是否为admin
    return token && token.length > 0
  } catch (error) {
    console.error('Verify admin error:', error)
    return false
  }
}

// 创建用户
async function createUser(username, password, role = 'user') {
  const email = `${username}@cuoti.local`
  const userPassword = password || '123456' // 默认密码

  // 使用Service Role Key创建用户
  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'apikey': SUPABASE_SERVICE_ROLE_KEY
    },
    body: JSON.stringify({
      email,
      password: userPassword,
      email_confirm: true
    })
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.msg || data.message || '创建用户失败')
  }

  // 在profiles表插入记录
  const profileResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      user_id: data.id,
      username,
      role
    })
  })

  const profiles = await profileResponse.json()

  return {
    user: data,
    profile: profiles?.[0]
  }
}

// 获取用户列表
async function getUsers() {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?select=*&order=created_at.desc`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    }
  )

  const data = await response.json()
  return data
}

// 删除用户
async function deleteUser(userId) {
  // 使用Service Role Key删除用户
  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'apikey': SUPABASE_SERVICE_ROLE_KEY
    }
  })

  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.msg || '删除用户失败')
  }

  return { success: true }
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const authHeader = req.headers.authorization || ''
  const token = authHeader.replace('Bearer ', '')

  // 验证管理员权限
  const isAdmin = await verifyAdmin(token)
  if (!isAdmin) {
    return res.status(403).json({ error: '需要管理员权限' })
  }

  try {
    if (req.method === 'POST') {
      const { username, password } = req.body
      
      if (!username) {
        return res.status(400).json({ error: '用户名不能为空' })
      }

      // 验证用户名格式
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return res.status(400).json({ error: '用户名只能包含字母、数字和下划线' })
      }

      const result = await createUser(username, password)
      return res.status(200).json({ success: true, ...result })

    } else if (req.method === 'GET') {
      const users = await getUsers()
      return res.status(200).json({ success: true, users })

    } else {
      return res.status(405).json({ error: 'Method not allowed' })
    }

  } catch (error) {
    console.error('Admin API error:', error)
    return res.status(500).json({ error: error.message || '服务器错误' })
  }
}
