// API请求封装
const API_BASE = '/api'

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  }

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body)
  }

  try {
    const response = await fetch(url, config)
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error || '请求失败')
    }
    
    return data
  } catch (error) {
    console.error('API请求错误:', error)
    throw error
  }
}

// 登录
export const loginApi = {
  login: (username, password) => 
    request('/login', {
      method: 'POST',
      body: { username, password }
    })
}

// 管理相关API
export const adminApi = {
  createUser: (username, password, token) =>
    request('/admin/create-user', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: { username, password }
    }),
  
  getUsers: (token) =>
    request('/admin/users', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }),
  
  deleteUser: (userId, token) =>
    request('/admin/delete-user', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: { userId }
    })
}

// 题目提取API
export const extractApi = {
  extract: async (imageData, folderId, token) => {
    return request('/extract', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: {
        image: imageData,
        folder_id: folderId
      }
    })
  }
}

// 生成练习API
export const generateApi = {
  generate: async (questionIds, direction, count, token) => {
    return request('/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: {
        question_ids: questionIds,
        direction,
        count: parseInt(count)
      }
    })
  }
}
