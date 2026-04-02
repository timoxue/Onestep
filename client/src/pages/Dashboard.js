import React from 'react';
import { Card, Typography, Row, Col, Button, Layout } from 'antd';
import { SettingOutlined, ContainerOutlined, LogoutOutlined, RocketOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import './Dashboard.css';

const { Title, Text } = Typography;
const { Header, Content } = Layout;

function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Layout className="dashboard-layout">
      <Header className="dashboard-header">
        <div className="header-left">
          <RocketOutlined className="header-logo" />
          <Title level={4} className="header-title">OpenClaw 部署门户</Title>
        </div>
        <div className="header-right">
          <Text className="header-user">{user?.username}</Text>
          <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout} className="logout-btn">
            退出
          </Button>
        </div>
      </Header>

      <Content className="dashboard-content">
        <div className="dashboard-welcome">
          <Title level={2}>欢迎回来，{user?.username}</Title>
          <Text className="welcome-subtitle">选择你要进行的操作</Text>
        </div>

        <Row gutter={[32, 32]} justify="center" className="dashboard-cards">
          <Col xs={24} sm={12} md={10} lg={8}>
            <Card
              hoverable
              className="action-card config-card"
              onClick={() => navigate('/deploy')}
            >
              <div className="card-icon-wrapper config-icon">
                <SettingOutlined className="card-icon" />
              </div>
              <Title level={3}>配置部署</Title>
              <Text className="card-desc">
                创建新的 OpenClaw 实例，配置机器人名称并启动部署流程
              </Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={10} lg={8}>
            <Card
              hoverable
              className="action-card container-card"
              onClick={() => navigate('/containers')}
            >
              <div className="card-icon-wrapper container-icon">
                <ContainerOutlined className="card-icon" />
              </div>
              <Title level={3}>我的容器</Title>
              <Text className="card-desc">
                查看和管理你名下所有的 OpenClaw 容器实例
              </Text>
            </Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
}

export default Dashboard;
