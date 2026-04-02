import React from 'react';
import { Alert, QRCode } from 'antd';
import { ScanOutlined, CheckCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import './StatusMessage.css';

const StatusMessage = ({ status, showQrPrompt, currentMessage, qrCodeUrl }) => {
  const showSuccessMessage = status === 'completed' || currentMessage === 'OpenClaw is all set';

  return (
    <div className="status-message-container">
      {showQrPrompt && (
        <Alert
          message="请使用飞书 App 扫描二维码"
          description="请使用飞书 App 扫描下方二维码以创建机器人。这是配置 OpenClaw 的最后一步。"
          type="info"
          icon={<ScanOutlined />}
          showIcon
          className="qr-prompt-alert"
        />
      )}

      {showSuccessMessage && (
        <Alert
          message="配置成功"
          description="OpenClaw 已成功安装并配置完成！现在可以开始使用。"
          type="success"
          icon={<CheckCircleOutlined />}
          showIcon
          closable
          className="success-alert"
        />
      )}

      {status === 'running' && !showQrPrompt && (
        <Alert
          message="部署进行中"
          description={`当前步骤: ${currentMessage || '初始化...'}`}
          type="info"
          icon={<InfoCircleOutlined />}
          showIcon
          className="info-alert"
        />
      )}

      {status === 'error' && (
        <Alert
          message="部署失败"
          description="部署过程中发生错误，请检查终端日志或联系技术支持。"
          type="error"
          showIcon
          closable
          className="error-alert"
        />
      )}

      {status === 'stopped' && (
        <Alert
          message="部署已停止"
          description="部署过程已被手动停止。您可以重新开始部署。"
          type="warning"
          showIcon
          closable
          className="warning-alert"
        />
      )}

      {showQrPrompt && (
        <div className="qr-code-container">
          {qrCodeUrl ? (
            <div className="qr-code-wrapper">
              <QRCode value={qrCodeUrl} size={240} />
            </div>
          ) : (
            <div className="qr-code-waiting">
              <p>等待二维码生成中...</p>
              <p className="qr-url-hint">二维码将从安装日志中自动提取</p>
            </div>
          )}
          <div className="qr-code-instructions">
            <p>1. 打开飞书 App</p>
            <p>2. 点击右上角 "+" 号</p>
            <p>3. 选择"扫一扫"</p>
            <p>4. 扫描上方二维码</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusMessage;
