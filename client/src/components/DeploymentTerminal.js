import React, { useEffect, useRef, useState } from 'react';
import { Card, Spin } from 'antd';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { io } from 'socket.io-client';
import 'xterm/css/xterm.css';
import './DeploymentTerminal.css';

const DeploymentTerminal = ({ sessionId, onProgress, onError, onLog, logs, active }) => {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    // Initialize xterm.js
    const terminal = new Terminal({
      cursorBlink: false,
      disableStdin: true,
      fontSize: 14,
      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#ffffff',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#ffffff',
      },
      scrollback: 1000,
      lineHeight: 1.4,
    });

    // Initialize addons
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(new WebLinksAddon());

    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Mount terminal
    if (terminalRef.current) {
      terminal.open(terminalRef.current);
      fitAddon.fit();
    }

    // Welcome message
    terminal.writeln('\x1b[36m╔══════════════════════════════════════════╗\x1b[0m');
    terminal.writeln('\x1b[36m║     OpenClaw Deployment Terminal      ║\x1b[0m');
    terminal.writeln('\x1b[36m╚══════════════════════════════════════════╝\x1b[0m');
    terminal.writeln('');
    terminal.writeln('\x1b[33mInitializing deployment...\x1b[0m');
    terminal.writeln('');

    // Connect to Socket.io
    setIsConnecting(true);
    const socketUrl = process.env.NODE_ENV === 'production' ? '/' : 'http://localhost:3001';
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
      timeout: 10000,
    });

    socket.emit('join-deployment', { sessionId });

    socket.on('progress', (data) => {
      if (onProgress) onProgress(data);
    });

    socket.on('error', (data) => {
      if (onError) onError(data);
      terminal.write('\x1b[31m✗ Error:\x1b[0m ');
      terminal.writeln(data.error);
    });

    socket.on('log', (data) => {
      terminal.write(data.output);
      if (onLog) onLog(data);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      if (onError) onError({ error: 'Connection failed' });
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    // Fit terminal on window resize
    const handleResize = () => {
      if (fitAddon) {
        fitAddon.fit();
      }
    };

    window.addEventListener('resize', handleResize);
    setIsConnecting(false);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      socket.disconnect();
      terminal.dispose();
      socket.emit('leave-deployment', { sessionId });
    };
  }, [sessionId, onProgress, onError, onLog]);

  // Display logs when socket is not connected but logs are available
  useEffect(() => {
    if (xtermRef.current && logs.length > 0 && !socket.connected) {
      xtermRef.current.clear();
      logs.forEach((log) => {
        xtermRef.current.write(log);
      });
    }
  }, [logs, xtermRef]);

  return (
    <div className="deployment-terminal-container">
      <div className="terminal-header">
        <span className="terminal-title">Deployment Logs</span>
        {active && (
          <span className="terminal-status">
            <span className="status-dot active" />
            Active
          </span>
        )}
      </div>
      <Spin spinning={isConnecting} tip="Connecting to deployment stream...">
        <div
          ref={terminalRef}
          className="terminal-wrapper"
          style={{ opacity: isConnecting ? 0.5 : 1 }}
        />
      </Spin>
    </div>
  );
};

export default DeploymentTerminal;
