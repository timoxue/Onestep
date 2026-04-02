import React from 'react';
import { Progress, Typography, Space } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import './ProgressBar.css';

const { Text } = Typography;

const ProgressBar = ({ progress, status, currentMessage }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'running':
        return '#1890ff';
      case 'completed':
        return '#52c41a';
      case 'error':
        return '#f5222d';
      case 'stopped':
        return '#faad14';
      default:
        return '#d9d9d9';
    }
  };

  const getStatusInfo = () => {
    switch (status) {
      case 'running':
        return { text: '正在部署', icon: '⟳' };
      case 'completed':
        return { text: '部署完成', icon: '✓' };
      case 'error':
        return { text: '部署失败', icon: '✗' };
      case 'stopped':
        return { text: '已停止', icon: '◼' };
      default:
        return { text: '等待开始', icon: '○' };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="progress-container">
      <div className="progress-header">
        <Space size="large">
          <Text className="progress-status" style={{ color: getStatusColor() }}>
            <span className="status-icon">{statusInfo.icon}</span>
            {statusInfo.text}
          </Text>
          <Text type="secondary">
            <ClockCircleOutlined /> {progress}%
          </Text>
        </Space>
      </div>

      <div className="progress-bar-wrapper">
        <Progress
          percent={progress}
          strokeColor={getStatusColor()}
          size={['100%', 8]}
          status={status === 'error' ? 'exception' : status === 'completed' ? 'success' : 'active'}
          showInfo={false}
        />
      </div>

      {currentMessage && (
        <div className="progress-message">
          <Text type="secondary">{currentMessage}</Text>
        </div>
      )}

      <div className="progress-steps">
        <div className={`step ${progress >= 15 ? 'completed' : ''}`}>
          <div className="step-indicator">{progress >= 15 ? '✓' : '1'}</div>
          <Text className="step-text">环境准备</Text>
        </div>
        <div className="step-divider" />
        <div className={`step ${progress >= 40 ? 'completed' : ''}`}>
          <div className="step-indicator">{progress >= 40 ? '✓' : '2'}</div>
          <Text className="step-text">安装 OpenClaw</Text>
        </div>
        <div className="step-divider" />
        <div className={`step ${progress >= 80 ? 'completed' : ''}`}>
          <div className="step-indicator">{progress >= 80 ? '✓' : '3'}</div>
          <Text className="step-text">扫码配置</Text>
        </div>
        <div className="step-divider" />
        <div className={`step ${progress >= 100 ? 'completed' : ''}`}>
          <div className="step-indicator">{progress >= 100 ? '✓' : '4'}</div>
          <Text className="step-text">完成</Text>
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;
