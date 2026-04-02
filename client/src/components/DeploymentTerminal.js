import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { io } from 'socket.io-client';
import 'xterm/css/xterm.css';
import './DeploymentTerminal.css';

const DeploymentTerminal = ({ sessionId, onProgress, onError, onLog, active }) => {
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const socketRef = useRef(null);
  const sessionIdRef = useRef(null);

  // 初始化 terminal + socket，只在组件挂载时运行一次
  useEffect(() => {
    // 初始化 xterm
    const terminal = new Terminal({
      cursorBlink: false,
      disableStdin: true,
      fontSize: 14,
      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#ffffff',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightCyan: '#29b8db',
        brightWhite: '#ffffff',
      },
      scrollback: 1000,
      lineHeight: 1.4,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(new WebLinksAddon());
    xtermRef.current = terminal;

    if (terminalRef.current) {
      terminal.open(terminalRef.current);
      fitAddon.fit();
    }

    terminal.writeln('\x1b[36m╔══════════════════════════════════════════╗\x1b[0m');
    terminal.writeln('\x1b[36m║     OpenClaw Deployment Terminal         ║\x1b[0m');
    terminal.writeln('\x1b[36m╚══════════════════════════════════════════╝\x1b[0m');
    terminal.writeln('');

    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);

    // 初始化 socket
    const socketUrl = process.env.NODE_ENV === 'production'
      ? window.location.origin
      : 'http://localhost:3001';

    const socket = io(socketUrl, {
      transports: ['polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      // socket 连上时如果已有 sessionId，补发 join
      if (sessionIdRef.current) {
        socket.emit('join-deployment', { sessionId: sessionIdRef.current });
      }
    });

    socket.on('log', (data) => {
      if (data.sessionId !== sessionIdRef.current) return;
      if (xtermRef.current) xtermRef.current.write(data.output);
      if (onLog) onLog(data);
    });

    socket.on('progress', (data) => {
      if (data.sessionId !== sessionIdRef.current) return;
      if (onProgress) onProgress(data);
    });

    socket.on('error', (data) => {
      if (data.sessionId !== sessionIdRef.current) return;
      if (onError) onError(data);
      if (xtermRef.current) {
        xtermRef.current.write('\x1b[31m✗ Error:\x1b[0m ');
        xtermRef.current.writeln(data.error);
      }
    });

    socket.on('disconnect', () => console.log('Socket disconnected'));
    socket.on('connect_error', (err) => console.error('Socket error:', err));

    return () => {
      window.removeEventListener('resize', handleResize);
      socket.disconnect();
      terminal.dispose();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // sessionId 变化时加入 room
  useEffect(() => {
    sessionIdRef.current = sessionId;
    if (sessionId && socketRef.current) {
      socketRef.current.emit('join-deployment', { sessionId });
    }
  }, [sessionId]);

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
      <div ref={terminalRef} className="terminal-wrapper" />
    </div>
  );
};

export default DeploymentTerminal;
