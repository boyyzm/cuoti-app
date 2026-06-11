// Netlify Function: 从图片中提取题目
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
    const { image, folder_id } = JSON.parse(event.body || '{}')

    if (!image) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: '图片不能为空' }) }
    }
    if (!folder_id) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: '文件夹ID不能为空' }) }
    }

    const prompt = `你是一个小学错题分析助手。请仔细观察这张作业/试卷照片，识别每一道题目。对每道题目提供：题号、题型（填空/选择/判断/应用题/计算题）、完整文字内容、在图片中的位置（top_percent和bottom_percent，0-100的百分比）。不要提取学生答案。返回JSON数组。`

    const deepseekResponse = await fetch(`${DEEPSEEK_API_URL}/chat/completions`, {
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
              { type: 'image_url', image_url: { url: image } }
            ]
          }
        ]
      })
    })

    const result = await deepseekResponse.json()

    if (!deepseekResponse.ok) {
      console.error('DeepSeek API error:', result)
      return { statusCode: 500, headers, body: JSON.stringify({ error: result.error?.message || 'AI识别失败，请重试' }) }
    }

    const content = result.choices?.[0]?.message?.content
    if (!content) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'AI返回内容为空' }) }
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
      console.error('JSON parse error:', parseError)
      return { statusCode: 500, headers, body: JSON.stringify({ error: '解析AI返回内容失败' }) }
    }

    if (!Array.isArray(questions)) {
      questions = [questions]
    }

    const processedQuestions = questions.map(q => ({
      question_type: q.question_type || '练习题',
      extracted_text: q.content || q.question_text || JSON.stringify(q),
      cropped_image: image,
      top_percent: q.top_percent,
      bottom_percent: q.bottom_percent
    }))

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, questions: processedQuestions })
    }
  } catch (error) {
    console.error('Extract error:', error)
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message || '服务器错误，请稍后重试' }) }
  }
}
