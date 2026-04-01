#!/bin/bash

# OpenClaw 部署门户一键安装脚本

set -e

echo "╔══════════════════════════════════════════╗"
echo "║   OpenClaw 部署门户安装程序             ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js >= 18.x"
    exit 1
fi

NODE_VERSION=$(node --version)
echo "✅ Node.js 版本: $NODE_VERSION"

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    exit 1
fi

DOCKER_VERSION=$(docker --version)
echo "✅ Docker 版本: $DOCKER_VERSION"

# 检查 Docker Socket
if [ ! -S /var/run/docker.sock ]; then
    echo "❌ Docker Socket 不存在"
    exit 1
fi

echo "✅ Docker Socket 可用"

# 安装后端依赖
echo ""
echo "📦 安装后端依赖..."
npm install

# 安装前端依赖
echo "📦 安装前端依赖..."
cd client
npm install
cd ..

# 创建环境变量文件
if [ ! -f .env ]; then
    echo "📝 创建环境变量文件..."
    cp .env.example .env
    echo "✅ 环境变量文件已创建: .env"
else
    echo "✅ 环境变量文件已存在"
fi

# 创建配置目录
echo "📁 创建配置目录..."
sudo mkdir -p /var/lib/openclaw/configs
sudo chown -R $USER:$USER /var/lib/openclaw

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║          安装完成！                      ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "📋 下一步："
echo "   1. 检查配置: vim .env"
echo "   2. 启动开发服务器: npm run dev"
echo "   3. 访问应用: http://localhost:3000"
echo ""
echo "详细文档请查看: README.md"
