// Netlify Function: 登录
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || ''

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const { username, password } = JSON.parse(event.body || '{}')

    if (!username || !password) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: '用户名和密码不能为空' }) }
    }

    const email = `${username}@cuoti.local`

    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ email, password })
    })

    const data = await response.json()

    if (!response.ok) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: data.message || '登录失败，用户名或密码错误' }) }
    }

    const profileResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${data.user.id}&select=*`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${data.access_token}`
        }
      }
    )

    const profiles = await profileResponse.json()
    const profile = profiles?.[0] || null

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        session: {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          user: data.user
        },
        profile
      })
    }
  } catch (error) {
    console.error('Login error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: '服务器错误，请稍后重试' }) }
  }
}
