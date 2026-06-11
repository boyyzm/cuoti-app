// Netlify Function: 根据错题生成举一反三练习题
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ''
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1'

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
    const { question_ids, direction, count = 3 } = JSON.parse(event.body || '{}')

    if (!question_ids || !Array.isArray(question_ids) || question_ids.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: '请选择至少一道题目' }) }
    }

    // 从数据库获取题目内容
    const authToken = event.headers?.authorization?.replace('Bearer ', '') || ''
    const questionsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/questions?id=in.(${question_ids.join(',')})&select=*`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${authToken}`
        }
      }
    )

    const questions = await questionsResponse.json()

    if (!questions || questions.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: '未找到相关题目' }) }
    }

    const questionsText = questions.map((q, i) =>
      `${i + 1}. [${q.question_type || '练习题'}] ${q.extracted_text || ''}`
    ).join('\n')

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

    const deepseekResponse = await fetch(`${DEEPSEEK_API_URL}/chat/completions`, {
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

    const result = await deepseekResponse.json()

    if (!deepseekResponse.ok) {
      console.error('DeepSeek API error:', result)
      return { statusCode: 500, headers, body: JSON.stringify({ error: result.error?.message || 'AI生成失败，请重试' }) }
    }

    const content = result.choices?.[0]?.message?.content
    if (!content) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'AI返回内容为空' }) }
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
      console.error('JSON parse error:', parseError)
      return { statusCode: 500, headers, body: JSON.stringify({ error: '解析AI返回内容失败' }) }
    }

    if (!Array.isArray(generatedQuestions)) {
      generatedQuestions = [generatedQuestions]
    }

    // 保存到practices表
    const userId = questions[0]?.user_id
    const practiceData = {
      user_id: userId,
      title: `举一反三练习 - ${new Date().toLocaleDateString('zh-CN')}`,
      question_ids: question_ids,
      generated_content: {
        questions: generatedQuestions,
        source_questions: questions.map(q => q.extracted_text)
      }
    }

    const practiceResponse = await fetch(`${SUPABASE_URL}/rest/v1/practices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(practiceData)
    })

    const savedPractices = await practiceResponse.json()

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        practice: savedPractices?.[0] || { id: Date.now().toString(), ...practiceData }
      })
    }
  } catch (error) {
    console.error('Generate error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message || '服务器错误，请稍后重试' }) }
  }
}
