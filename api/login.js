// POST /api/login - 用户登录
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || ''

export default async function handler(req, res) {
  // 只允许POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' })
    }

    // 将用户名转换为邮箱格式
    const email = `${username}@cuoti.local`

    // 调用Supabase Auth登录
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        email,
        password
      })
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(401).json({ error: data.message || '登录失败，用户名或密码错误' })
    }

    // 获取用户资料
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

    return res.status(200).json({
      success: true,
      session: {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        user: data.user
      },
      profile
    })

  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ error: '服务器错误，请稍后重试' })
  }
}
