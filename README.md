# 错题举一反三 APP

一款帮助小学生家长管理错题，并利用AI实现"举一反三"出题练习的移动端PWA应用。

## 功能特性

- 📁 **文件夹管理** - 创建、整理错题文件夹
- 📷 **拍照上传** - 快速拍摄或从相册选择错题图片
- ✂️ **智能裁剪** - 自动识别并裁剪单道题目
- 🤖 **AI识别** - 使用DeepSeek Vision API识别题目内容
- 🔄 **举一反三** - AI根据错题生成相似练习题
- 📄 **PDF导出** - 一键导出练习题PDF
- 👥 **用户管理** - 支持多用户，管理员可管理用户

## 技术栈

### 前端
- Vue 3 + Composition API
- Vite (构建工具)
- Vant 4 (移动端UI组件库)
- Pinia (状态管理)
- Vue Router (路由)

### 后端
- Vercel Serverless Functions
- Supabase (数据库+认证+存储)
- DeepSeek API (AI识别和出题)

### 工具
- jsPDF + html2canvas (PDF生成)
- PWA (支持离线使用)

## 快速开始

### 1. 配置Supabase

1. 在 [Supabase](https://supabase.com) 创建项目
2. 在 SQL Editor 中运行 `supabase-schema.sql`
3. 获取以下配置信息：
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### 2. 配置DeepSeek

1. 在 [DeepSeek](https://platform.deepseek.com/) 注册并获取API Key
2. 获取 `DEEPSEEK_API_KEY`

### 3. 配置环境变量

复制 `.env.example` 为 `.env.local` 并填写配置：

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
DEEPSEEK_API_KEY=your_deepseek_api_key
ADMIN_PASSWORD=wysx1987
```

### 4. 创建管理员账号

1. 在Supabase Dashboard中创建用户（或使用API创建）
2. 将用户的profile设置为admin角色

### 5. 安装和运行

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build
```

## 项目结构

```
cuoti-app/
├── api/                    # Serverless API
│   ├── login.js           # 登录
│   ├── admin.js           # 用户管理
│   ├── extract.js         # 题目提取
│   └── generate.js        # 练习生成
├── src/
│   ├── components/        # 组件
│   ├── views/             # 页面
│   ├── stores/            # Pinia状态
│   ├── lib/               # 工具库
│   └── router/            # 路由
├── public/                # 静态资源
└── supabase-schema.sql    # 数据库Schema
```

## 使用说明

### 用户登录
- 普通用户：使用用户名+密码登录（默认密码123456）
- 管理员：使用admin/wysx1987登录

### 添加错题
1. 点击右下角拍照按钮
2. 拍照或从相册选择图片
3. 选择目标文件夹
4. 点击"提取题目"识别
5. 确认保存

### 生成练习
1. 进入文件夹，长按选择题目
2. 点击"组卷练习"
3. 设置出题方向和数量
4. 点击"生成练习"
5. 预览并导出PDF

## 部署

### Vercel部署

1. 将代码推送到GitHub
2. 在Vercel导入项目
3. 配置环境变量
4. 部署

### 手动部署API

Vercel会自动部署api目录下的Serverless Functions。

## 注意事项

- 图片会自动压缩，最大宽度1920px
- PDF使用html2canvas生成，需确保中文字体正常显示
- PWA需要HTTPS环境才能正常工作
- 请妥善保管SUPABASE_SERVICE_ROLE_KEY，不要暴露在前端

## License

MIT
