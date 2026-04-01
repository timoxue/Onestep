import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Card, Button, Space, Typography, message, Spin, Form, Input, Divider } from 'antd';
import {
  RocketOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ReloadOutlined,
  UserOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import DeploymentTerminal from './components/DeploymentTerminal';
import ProgressBar from './components/ProgressBar';
import StatusMessage from './components/StatusMessage';
import SuccessAnimation from './components/SuccessAnimation';
import './App.css';

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

function App() {
  const [sessionId, setSessionId] = useState(null);
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState('');
  const [showQrPrompt, setShowQrPrompt] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState([]);

  // 配置表单状态
  const [config, setConfig] = useState({
    tenantId: 'default',
    botName: 'OpenClaw助手',
  });
  const [showConfigForm, setShowConfigForm] = useState(true);

  const handleProgress = useCallback((data) => {
    setProgress(data.progress);
    setCurrentMessage(data.message);
    setStatus(data.status);

    if (data.progress >= 80 && data.progress < 95) {
      setShowQrPrompt(true);
    } else {
      setShowQrPrompt(false);
    }
  }, []);

  const handleError = useCallback((data) => {
    setError(data.error);
    setStatus('error');
    message.error(data.error);
  }, []);

  const handleLog = useCallback((data) => {
    setLogs(prev => [...prev, data.output]);
  }, []);

  const handleConfigSubmit = (values) => {
    setConfig(values);
    setShowConfigForm(false);
    message.success('配置已保存');
  };

  const startDeployment = async () => {
    if (!config.tenantId) {
      message.error('请输入用户名/租户ID');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setLogs([]);

      const response = await fetch('/api/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId: config.tenantId,
          botName: config.botName,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSessionId(data.sessionId);
        setStatus('running');
        message.success('部署已启动');
      } else {
        throw new Error(data.error || 'Failed to start deployment');
      }
    } catch (err) {
      setError(err.message);
      setStatus('error');
      message.error(`启动失败: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const stopDeployment = async () => {
    if (!sessionId) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/deploy/${sessionId}/stop`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setStatus('stopped');
        message.info('部署已停止');
      } else {
        throw new Error(data.error || 'Failed to stop deployment');
      }
    } catch (err) {
      message.error(`停止失败: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const retryDeployment = () => {
    setSessionId(null);
    setStatus('idle');
    setProgress(0);
    setCurrentMessage('');
    setError(null);
    setLogs([]);
    setShowQrPrompt(false);
    setShowConfigForm(true);
  };

  const editConfig = () => {
    setShowConfigForm(true);
  };

  const isRunning = status === 'running';
  const isCompleted = status === 'completed';
  const isError = status === 'error';
  const isStopped = status === 'stopped';

  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <div className="header-content">
          <RocketOutlined className="logo-icon" />
          <Title level={3} className="header-title">
            OpenClaw 部署门户
          </Title>
        </div>
      </Header>

      <Content className="app-content">
        {showConfigForm ? (
          <Card className="config-card" title="🚀 开始部署前的配置">
            <Form
              layout="vertical"
              initialValues={config}
              onFinish={handleConfigSubmit}
              size="large"
            >
              <Form.Item
                label="用户名/租户ID"
                name="tenantId"
                rules={[
                  { required: true, message: '请输入用户名或租户ID' },
                ]}
                extra="用于区分不同用户的配置，建议使用公司名称或个人邮箱"
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="例如: company-name 或 user@example.com"
                  allowClear
                />
              </Form.Item>

              <Form.Item
                label="OpenClaw 助手名称"
                name="botName"
                rules={[
                  { required: true, message: '请输入助手名称' },
                ]}
                extra="这是机器人显示的名称，用户在飞书中会看到"
              >
                <Input
                  prefix={<RobotOutlined />}
                  placeholder="例如: OpenClaw助手"
                  allowClear
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  block
                  icon={<RocketOutlined />}
                >
                  保存配置并开始部署
                </Button>
              </Form.Item>
            </Form>

            <Divider />

            <div className="config-info">
              <Title level={5}>📋 配置说明</Title>
              <ul className="info-list">
                <li><strong>用户名/租户ID</strong>：用于隔离不同用户的配置文件，每个租户都有独立的配置目录</li>
                <li><strong>助手名称</strong>：将显示在飞书聊天界面中，方便用户识别</li>
                <li><strong>系统兼容</strong>：支持 Windows、Linux、macOS 等多种系统</li>
                <li><strong>数据安全</strong>：配置文件保存在本地，确保数据安全</li>
              </ul>
            </div>
          </Card>
        ) : (
          <Card className="deployment-card">
          <div className="deployment-header">
            <Space>
              <Text>用户: {config.tenantId}</Text>
              <Text>助手: {config.botName}</Text>
              <Button
                type="link"
                size="small"
                icon={<ReloadOutlined />}
                onClick={editConfig}
              >
                编辑配置
              </Button>
            </Space>
          </div>

          <Divider />

          <ProgressBar
            progress={progress}
            status={status}
            currentMessage={currentMessage}
          />

          <StatusMessage
            status={status}
            showQrPrompt={showQrPrompt}
            currentMessage={currentMessage}
          />

          {isCompleted && <SuccessAnimation />}

          <DeploymentTerminal
            sessionId={sessionId}
            onProgress={handleProgress}
            onError={handleError}
            onLog={handleLog}
            logs={logs}
            active={isRunning}
          />

          <Divider />

          <Space className="action-buttons">
            {!sessionId && !isRunning && !isError && !isStopped && (
              <Button
                type="primary"
                size="large"
                icon={<RocketOutlined />}
                onClick={startDeployment}
                loading={isLoading}
              >
                开始部署
              </Button>
            )}

            {isRunning && (
              <Button
                danger
                size="large"
                onClick={stopDeployment}
                loading={isLoading}
              >
                停止部署
              </Button>
            )}

            {(isError || isStopped) && (
              <Button
                type="primary"
                size="large"
                icon={<ReloadOutlined />}
                onClick={retryDeployment}
              >
                重新开始
              </Button>
            )}

            {isError && (
              <Button
                type="default"
                size="large"
                icon={<WarningOutlined />}
                onClick={() => message.info('请技术支持联系: support@openclaw.ai')}
              >
                联系技术支持
              </Button>
            )}
          </Space>
        </Card>
        )}

        {isCompleted && !showConfigForm && (
          <Card className="success-guide">
            <Title level={4}>
              <CheckCircleOutlined /> 配置成功！
            </Title>
            <Text>
              恭喜！OpenClaw ({config.botName}) 已成功安装。现在可以前往飞书发送命令进行验证。
            </Text>
            <div className="guide-steps">
              <Text strong>验证步骤：</Text>
              <ol>
                <li>打开飞书 App</li>
                <li>在任意群聊或私聊中输入：<code>/feishu start</code></li>
                <li>等待机器人响应，确认配置成功</li>
              </ol>
            </div>
          </Card>
        )}
      </Content>

      <Footer className="app-footer">
        <Text>OpenClaw SaaS Deployment Portal © 2026</Text>
      </Footer>
    </Layout>
  );
}

export default App;
