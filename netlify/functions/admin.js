// Netlify Function: 管理员操作（创建用户/获取用户列表/删除用户）
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
}

async function verifyAdmin(token) {
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY
      }
    })
    if (!response.ok) return false
    return token && token.length > 0
  } catch (error) {
    console.error('Verify admin error:', error)
    return false
  }
}

async function createUser(username, password, role = 'user') {
  const email = `${username}@cuoti.local`
  const userPassword = password || '123456'

  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'apikey': SUPABASE_SERVICE_ROLE_KEY
    },
    body: JSON.stringify({ email, password: userPassword, email_confirm: true })
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.msg || data.message || '创建用户失败')
  }

  const profileResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ user_id: data.id, username, role })
  })

  const profiles = await profileResponse.json()
  return { user: data, profile: profiles?.[0] }
}

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
  return await response.json()
}

async function deleteUser(userId) {
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

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  const authHeader = event.headers?.authorization || ''
  const token = authHeader.replace('Bearer ', '')

  const isAdmin = await verifyAdmin(token)
  if (!isAdmin) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: '需要管理员权限' }) }
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {}

    // 根据path判断操作
    const path = event.path.replace(/\/$/, '')
    
    if (event.httpMethod === 'POST' && path.endsWith('/create-user')) {
      const { username, password } = body
      if (!username) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: '用户名不能为空' }) }
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: '用户名只能包含字母、数字和下划线' }) }
      }
      const result = await createUser(username, password)
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, ...result }) }

    } else if (event.httpMethod === 'POST' && path.endsWith('/delete-user')) {
      const { userId } = body
      if (!userId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: '用户ID不能为空' }) }
      }
      const result = await deleteUser(userId)
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, ...result }) }

    } else if (event.httpMethod === 'GET') {
      const users = await getUsers()
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, users }) }

    } else {
      return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
    }
  } catch (error) {
    console.error('Admin API error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message || '服务器错误' }) }
  }
}
