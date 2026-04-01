import React from 'react';
import { CheckCircleOutlined } from '@ant-design/icons';
import './SuccessAnimation.css';

const SuccessAnimation = () => {
  return (
    <div className="success-animation">
      <div className="success-icon-wrapper">
        <CheckCircleOutlined className="success-icon" />
      </div>
      <div className="confetti">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="confetti-piece"
            style={{
              '--i': i,
              '--color': ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96e6a1', '#dfe6e9'][i % 5],
              '--left': `${Math.random() * 100}%`,
              '--delay': `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default SuccessAnimation;
