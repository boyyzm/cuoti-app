// POST /api/extract - 从图片中提取题目
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ''
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1'

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { image, folder_id } = req.body

    if (!image) {
      return res.status(400).json({ error: '图片不能为空' })
    }

    if (!folder_id) {
      return res.status(400).json({ error: '文件夹ID不能为空' })
    }

    // 调用DeepSeek Vision API识别题目
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
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: image
                }
              }
            ]
          }
        ]
      })
    })

    const result = await deepseekResponse.json()

    if (!deepseekResponse.ok) {
      console.error('DeepSeek API error:', result)
      return res.status(500).json({ 
        error: result.error?.message || 'AI识别失败，请重试' 
      })
    }

    // 解析AI返回的内容
    const content = result.choices?.[0]?.message?.content
    if (!content) {
      return res.status(500).json({ error: 'AI返回内容为空' })
    }

    // 尝试解析JSON
    let questions = []
    try {
      // 提取JSON部分
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0])
      } else {
        // 尝试直接解析
        questions = JSON.parse(content)
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      return res.status(500).json({ 
        error: '解析AI返回内容失败' 
      })
    }

    // 确保返回的是数组
    if (!Array.isArray(questions)) {
      questions = [questions]
    }

    // 处理每道题目 - 返回位置信息供前端裁剪
    const processedQuestions = questions.map(q => ({
      question_type: q.question_type || '练习题',
      extracted_text: q.content || q.question_text || JSON.stringify(q),
      cropped_image: image, // 前端会根据位置信息裁剪
      top_percent: q.top_percent,
      bottom_percent: q.bottom_percent
    }))

    return res.status(200).json({
      success: true,
      questions: processedQuestions
    })

  } catch (error) {
    console.error('Extract error:', error)
    return res.status(500).json({ 
      error: error.message || '服务器错误，请稍后重试' 
    })
  }
}
