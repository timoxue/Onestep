import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Table, Tag, Button, Space, Typography, message, Modal, Card, Empty } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  DeleteOutlined,
  FileTextOutlined,
  ArrowLeftOutlined,
  ReloadOutlined,
  RocketOutlined,
  LogoutOutlined,
  ContainerOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import './Containers.css';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const statusColorMap = {
  running: 'green',
  completed: 'blue',
  exited: 'orange',
  stopped: 'red',
  error: 'red',
  pending: 'default',
  removed: 'default',
};

const statusTextMap = {
  running: '运行中',
  completed: '已完成',
  exited: '已退出',
  stopped: '已停止',
  error: '错误',
  pending: '等待中',
  removed: '已删除',
};

function Containers() {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [logModal, setLogModal] = useState({ open: false, logs: '', title: '' });
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();

  const fetchContainers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/containers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setContainers(data.containers);
      } else {
        if (res.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        message.error(data.error);
      }
    } catch (err) {
      message.error('获取容器列表失败');
    } finally {
      setLoading(false);
    }
  }, [token, logout, navigate]);

  useEffect(() => {
    fetchContainers();
  }, [fetchContainers]);

  const handleStart = async (containerName) => {
    try {
      const res = await fetch(`/api/containers/${containerName}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        message.success('容器已启动');
        fetchContainers();
      } else {
        message.error(data.error);
      }
    } catch (err) {
      message.error('操作失败');
    }
  };

  const handleStop = async (containerName) => {
    try {
      const res = await fetch(`/api/containers/${containerName}/stop`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        message.success('容器已停止');
        fetchContainers();
      } else {
        message.error(data.error);
      }
    } catch (err) {
      message.error('操作失败');
    }
  };

  const handleDelete = async (sessionId) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除后将无法恢复，确定要删除这个容器吗？',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const res = await fetch(`/api/containers/${sessionId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (data.success) {
            message.success('已删除');
            setContainers(prev => prev.filter(c => c.sessionId !== sessionId));
          } else {
            message.error(data.error);
          }
        } catch (err) {
          message.error('删除失败');
        }
      },
    });
  };

  const handleViewLogs = async (containerName, botName) => {
    try {
      const res = await fetch(`/api/containers/${containerName}/logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setLogModal({ open: true, logs: data.logs, title: `${botName} - 日志` });
      } else {
        message.error(data.error);
      }
    } catch (err) {
      message.error('获取日志失败');
    }
  };

  const getDisplayStatus = (record) => {
    if (record.docker) {
      return record.docker.state;
    }
    return record.status;
  };

  const columns = [
    {
      title: '机器人名称',
      dataIndex: 'botName',
      key: 'botName',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: '状态',
      key: 'status',
      render: (_, record) => {
        const st = getDisplayStatus(record);
        return <Tag color={statusColorMap[st] || 'default'}>{statusTextMap[st] || st}</Tag>;
      },
    },
    {
      title: '容器名',
      dataIndex: 'containerName',
      key: 'containerName',
      render: (text) => <Text code>{text || '-'}</Text>,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text) => text ? new Date(text).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => {
        const st = getDisplayStatus(record);
        const isRunning = st === 'running';
        const isStopped = st === 'exited' || st === 'stopped' || st === 'completed';
        return (
          <Space size="small">
            {isStopped && record.containerName && (
              <Button size="small" icon={<PlayCircleOutlined />} onClick={() => handleStart(record.containerName)}>
                启动
              </Button>
            )}
            {isRunning && record.containerName && (
              <Button size="small" icon={<PauseCircleOutlined />} onClick={() => handleStop(record.containerName)}>
                停止
              </Button>
            )}
            {record.containerName && (
              <Button size="small" icon={<FileTextOutlined />} onClick={() => handleViewLogs(record.containerName, record.botName)}>
                日志
              </Button>
            )}
            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.sessionId)}>
              删除
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <Layout className="containers-layout">
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

      <Content className="containers-content">
        <Card>
          <div className="containers-toolbar">
            <Space>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/dashboard')}>
                返回
              </Button>
              <Title level={4} style={{ margin: 0 }}>
                <ContainerOutlined /> 我的容器
              </Title>
            </Space>
            <Button icon={<ReloadOutlined />} onClick={fetchContainers} loading={loading}>
              刷新
            </Button>
          </div>

          {containers.length === 0 && !loading ? (
            <Empty
              description="暂无容器"
              style={{ padding: '60px 0' }}
            >
              <Button type="primary" onClick={() => navigate('/deploy')}>
                去部署一个
              </Button>
            </Empty>
          ) : (
            <Table
              columns={columns}
              dataSource={containers}
              rowKey="sessionId"
              loading={loading}
              pagination={false}
            />
          )}
        </Card>

        <Modal
          title={logModal.title}
          open={logModal.open}
          onCancel={() => setLogModal({ open: false, logs: '', title: '' })}
          footer={null}
          width={800}
        >
          <pre className="log-viewer">{logModal.logs || '暂无日志'}</pre>
        </Modal>
      </Content>
    </Layout>
  );
}

export default Containers;
