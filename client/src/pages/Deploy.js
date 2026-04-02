import React, { useState, useCallback, useEffect } from 'react';
import { Layout, Card, Button, Space, Typography, message, Form, Input, Divider, Spin } from 'antd';
import {
  RocketOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ReloadOutlined,
  RobotOutlined,
  ArrowLeftOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import DeploymentTerminal from '../components/DeploymentTerminal';
import ProgressBar from '../components/ProgressBar';
import StatusMessage from '../components/StatusMessage';
import SuccessAnimation from '../components/SuccessAnimation';
import './Deploy.css';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

function Deploy() {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();

  const [sessionId, setSessionId] = useState(null);
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState('');
  const [showQrPrompt, setShowQrPrompt] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const qrFoundRef = React.useRef(false);
  const [botName, setBotName] = useState('OpenClaw助手');
  const [showForm, setShowForm] = useState(true);
  const [checking, setChecking] = useState(true); // 初始检查是否有运行中的部署

  // 挂载时查询服务器有没有进行中的部署
  useEffect(() => {
    fetch('/api/deploy/active', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.active) {
          const a = data.active;
          setSessionId(a.sessionId);
          setStatus(a.status);
          setProgress(a.progress);
          setCurrentMessage(a.message);
          setBotName(a.botName);
          setShowForm(false);
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [token]);

  const handleProgress = useCallback((data) => {
    setProgress(data.progress);
    setCurrentMessage(data.message);
    setStatus(data.status);
    if (data.qrCodeUrl) setQrCodeUrl(data.qrCodeUrl);
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
    // 前端也独立尝试从日志里提取飞书扫码 URL
    if (!qrFoundRef.current) {
      const urlMatch = data.output.match(/https?:\/\/[^\s\u0000-\u001F"'<>]+/);
      if (urlMatch) {
        const url = urlMatch[0].trim();
        // 过滤掉明显不是扫码链接的 URL（如 npm registry）
        if (url.includes('feishu') || url.includes('lark') || url.includes('larksuite') || url.includes('applink')) {
          qrFoundRef.current = true;
          setQrCodeUrl(url);
        }
      }
    }
  }, []);

  const handleConfigSubmit = (values) => {
    setBotName(values.botName);
    setShowForm(false);
  };

  const startDeployment = async (name) => {
    try {
      setIsLoading(true);
      setError(null);
      setLogs([]);

      const response = await fetch('/api/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ botName: name || botName }),
      });

      const data = await response.json();
      if (data.success) {
        setSessionId(data.sessionId);
        setStatus('running');
        message.success('部署已启动');
      } else {
        throw new Error(data.error || '部署启动失败');
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
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setStatus('stopped');
        message.info('部署已停止');
      } else {
        throw new Error(data.error);
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
    setQrCodeUrl(null);
    qrFoundRef.current = false;
    setShowQrPrompt(false);
    setShowForm(true);
  };

  const isRunning = status === 'running';
  const isCompleted = status === 'completed';
  const isError = status === 'error';
  const isStopped = status === 'stopped';

  if (checking) {
    return (
      <Layout className="deploy-layout">
        <Content style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <Spin size="large" />
        </Content>
      </Layout>
    );
  }

  return (
    <Layout className="deploy-layout">
      <Header className="dashboard-header">
        <div className="header-left">
          <RocketOutlined className="header-logo" />
          <Title level={4} className="header-title">OpenClaw 部署门户</Title>
        </div>
        <div className="header-right">
          <Text className="header-user">{user?.username}</Text>
          <Button type="text" icon={<LogoutOutlined />} onClick={() => { logout(); navigate('/login'); }} className="logout-btn">
            退出
          </Button>
        </div>
      </Header>

      <Content className="deploy-content">
        <div style={{ marginBottom: 16 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/dashboard')}>
            返回
          </Button>
        </div>

        {showForm ? (
          <Card className="deploy-config-card" title="配置新部署">
            <Form
              layout="vertical"
              initialValues={{ botName }}
              onFinish={handleConfigSubmit}
              size="large"
            >
              <Form.Item
                label="OpenClaw 助手名称"
                name="botName"
                rules={[{ required: true, message: '请输入助手名称' }]}
                extra="这是机器人显示的名称，用户在飞书中会看到"
              >
                <Input prefix={<RobotOutlined />} placeholder="例如: OpenClaw助手" allowClear />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" block icon={<RocketOutlined />} loading={isLoading}>
                  开始部署
                </Button>
              </Form.Item>
            </Form>
          </Card>
        ) : (
          <Card className="deployment-card">
            <div className="deployment-header">
              <Space>
                <Text>用户: {user?.username}</Text>
                <Text>助手: {botName}</Text>
              </Space>
            </div>

            <Divider />

            {status === 'idle' && !sessionId && (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <Button
                  type="primary"
                  size="large"
                  icon={<RocketOutlined />}
                  onClick={() => startDeployment(botName)}
                  loading={isLoading}
                  style={{ height: 48, fontSize: 16, paddingInline: 40 }}
                >
                  一键部署
                </Button>
                <div style={{ marginTop: 12 }}>
                  <Button type="link" onClick={() => setShowForm(true)}>
                    修改配置
                  </Button>
                </div>
              </div>
            )}

            {(isRunning || isCompleted || isError || isStopped) && (
              <>
                <ProgressBar progress={progress} status={status} currentMessage={currentMessage} />
                <StatusMessage status={status} showQrPrompt={showQrPrompt} currentMessage={currentMessage} qrCodeUrl={qrCodeUrl} />

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
                  {isRunning && (
                    <Button danger size="large" onClick={stopDeployment} loading={isLoading}>
                      停止部署
                    </Button>
                  )}
                  {(isError || isStopped) && (
                    <Button type="primary" size="large" icon={<ReloadOutlined />} onClick={retryDeployment}>
                      重新开始
                    </Button>
                  )}
                  {isError && (
                    <Button type="default" size="large" icon={<WarningOutlined />} onClick={() => message.info('请技术支持联系: support@openclaw.ai')}>
                      联系技术支持
                    </Button>
                  )}
                </Space>
              </>
            )}
          </Card>
        )}

        {isCompleted && !showForm && (
          <Card className="success-guide" style={{ marginTop: 16 }}>
            <Title level={4}><CheckCircleOutlined /> 配置成功！</Title>
            <Text>恭喜！OpenClaw ({botName}) 已成功安装。</Text>
            <div className="guide-steps">
              <Text strong>验证步骤：</Text>
              <ol>
                <li>打开飞书 App</li>
                <li>在任意群聊或私聊中输入：<code>/feishu start</code></li>
                <li>等待机器人响应，确认配置成功</li>
              </ol>
            </div>
            <Button type="primary" onClick={() => navigate('/containers')} style={{ marginTop: 12 }}>
              查看我的容器
            </Button>
          </Card>
        )}
      </Content>
    </Layout>
  );
}

export default Deploy;
