#!/bin/bash

# OpenClaw 部署门户启动脚本

echo "🚀 启动 OpenClaw 部署门户..."
echo ""

# 检查环境变量
if [ ! -f .env ]; then
    echo "⚠️  环境变量文件不存在，从示例创建..."
    cp .env.example .env
fi

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装后端依赖..."
    npm install
fi

if [ ! -d "client/node_modules" ]; then
    echo "📦 安装前端依赖..."
    cd client && npm install && cd ..
fi

# 启动应用
echo "✅ 启动开发服务器..."
npm run dev
