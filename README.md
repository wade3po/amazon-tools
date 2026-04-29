# Amazon 工具箱

全栈系统：前端 React + Tailwind CSS（苹果风格 UI），后端 Node.js + Express + MongoDB。

## 项目结构

```
├── frontend/          # React + Vite + Tailwind CSS + Electron
│   ├── src/
│   │   ├── components/   # UI 组件
│   │   ├── contexts/     # React Context (Auth)
│   │   ├── lib/          # API 工具
│   │   └── pages/        # 页面
│   └── electron/         # Electron 桌面端
├── backend/           # Express + MongoDB + JWT
│   └── src/
│       ├── models/       # Mongoose 模型
│       ├── routes/       # API 路由
│       └── middleware/   # 中间件
└── package.json       # Monorepo 根配置
```

## 快速开始

### 1. 安装依赖

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 2. 配置环境变量

```bash
# backend/.env
MONGODB_URI=mongodb+srv://...  # MongoDB Atlas 连接串
JWT_SECRET=your-secret-key
```

### 3. 启动开发

```bash
# 同时启动前后端
npm run dev

# 或分别启动
npm run dev:backend    # 后端 http://localhost:3001
npm run dev:frontend   # 前端 http://localhost:5173
```

### 4. 桌面端开发

```bash
npm run dev:electron   # 启动 Electron 桌面端
```

## 部署

- **后端**: Render (Web Service)
- **数据库**: MongoDB Atlas (Free Tier)
- **前端**: Vercel / Netlify
