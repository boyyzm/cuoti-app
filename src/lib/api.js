// 前端直连Supabase + DeepSeek（无需后端API）

import { supabase } from './supabase'

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1'
const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY || ''
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''

// ============ 登录 ============
export const loginApi = {
  login: async (username, password) => {
    const email = `${username}@cuoti.local`
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
    return { success: true, session: data.session }
  }
}

// ============ 管理员操作（使用service_role key直连） ============
export const adminApi = {
  createUser: async (username, password, token) => {
    const email = `${username}@cuoti.local`
    const userPassword = password || '123456'

    // 使用service_role key创建用户
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

    // 在profiles表插入记录
    const profileResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ user_id: data.id, username, role: 'user' })
    })

    const profiles = await profileResponse.json()
    return { success: true, user: data, profile: profiles?.[0] }
  },

  getUsers: async (token) => {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?select=*&order=created_at.desc`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    )
    const users = await response.json()
    return { success: true, users }
  },

  deleteUser: async (userId, token) => {
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
}

// ============ 题目提取（前端直调DeepSeek） ============
export const extractApi = {
  extract: async (imageData, folderId, token) => {
    const prompt = `你是一个小学错题分析助手。请仔细观察这张作业/试卷照片，识别每一道题目。对每道题目提供：题号、题型（填空/选择/判断/应用题/计算题）、完整文字内容、在图片中的位置（top_percent和bottom_percent，0-100的百分比）。不要提取学生答案。返回JSON数组。`

    const response = await fetch(`${DEEPSEEK_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageData } }
            ]
          }
        ]
      })
    })

    const result = await response.json()
    if (!response.ok) {
      throw new Error(result.error?.message || 'AI识别失败，请重试')
    }

    const content = result.choices?.[0]?.message?.content
    if (!content) {
      throw new Error('AI返回内容为空')
    }

    let questions = []
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0])
      } else {
        questions = JSON.parse(content)
      }
    } catch (parseError) {
      throw new Error('解析AI返回内容失败')
    }

    if (!Array.isArray(questions)) {
      questions = [questions]
    }

    const processedQuestions = questions.map(q => ({
      question_type: q.question_type || '练习题',
      extracted_text: q.content || q.question_text || JSON.stringify(q),
      cropped_image: imageData,
      top_percent: q.top_percent,
      bottom_percent: q.bottom_percent
    }))

    return { success: true, questions: processedQuestions }
  }
}

// ============ 练习生成（前端直调DeepSeek + Supabase） ============
export const generateApi = {
  generate: async (questionIds, direction, count, token) => {
    // 1. 从Supabase获取题目内容
    const { data: questions, error } = await supabase
      .from('questions')
      .select('*')
      .in('id', questionIds)

    if (error || !questions || questions.length === 0) {
      throw new Error('未找到相关题目')
    }

    const questionsText = questions.map((q, i) =>
      `${i + 1}. [${q.question_type || '练习题'}] ${q.extracted_text || ''}`
    ).join('\n')

    // 2. 调用DeepSeek生成练习题
    const prompt = `你是一个小学出题助手。请根据以下错题，生成类似的练习题。

原始错题：
${questionsText}

出题要求：
1. 方向：${direction || '同一知识点的变式题'}
2. 生成${count}道题
3. 难度与原题相当或略高
4. 题型与原题一致
5. 不重复原题
6. 每道题都是独立的完整题目

返回JSON数组，每项包含：
- type: 题型（填空/选择/判断/应用题/计算题）
- content: 题目内容
- options: 数组，仅选择题需要，4个选项
- answer_lines: 数字，应用题答题行数，默认4`

    const response = await fetch(`${DEEPSEEK_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const result = await response.json()
    if (!response.ok) {
      throw new Error(result.error?.message || 'AI生成失败，请重试')
    }

    const content = result.choices?.[0]?.message?.content
    if (!content) {
      throw new Error('AI返回内容为空')
    }

    let generatedQuestions = []
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        generatedQuestions = JSON.parse(jsonMatch[0])
      } else {
        generatedQuestions = JSON.parse(content)
      }
    } catch (parseError) {
      throw new Error('解析AI返回内容失败')
    }

    if (!Array.isArray(generatedQuestions)) {
      generatedQuestions = [generatedQuestions]
    }

    // 3. 保存到practices表
    const userId = questions[0]?.user_id
    const practiceData = {
      user_id: userId,
      title: `举一反三练习 - ${new Date().toLocaleDateString('zh-CN')}`,
      question_ids: questionIds,
      generated_content: {
        questions: generatedQuestions,
        source_questions: questions.map(q => q.extracted_text)
      }
    }

    const { data: savedPractice, error: saveError } = await supabase
      .from('practices')
      .insert(practiceData)
      .select()
      .single()

    if (saveError) {
      console.error('保存练习失败:', saveError)
    }

    return {
      success: true,
      practice: savedPractice || { id: Date.now().toString(), ...practiceData }
    }
  }
}
