const frontendexpress = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const express = require('express');

const frontendapp = frontendexpress();
const PORT = 3000;

// Прокси для API запросов
app.use('/api', createProxyMiddleware({
    target: 'http://localhost:5000',
    changeOrigin: true,
    secure: false,
    onProxyReq: (proxyReq, req, res) => {
        // Передаем куки
        if (req.headers.cookie) {
            proxyReq.setHeader('cookie', req.headers.cookie);
        }
    }
}));

// Прокси для WebSocket
app.use('/socket.io', createProxyMiddleware({
    target: 'http://localhost:5000',
    changeOrigin: true,
    ws: true,
    secure: false
}));

// Раздаем статические файлы
app.use(express.static(__dirname));

// Все остальные запросы на index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const server = app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log('🚀 FRONTEND С ПРОКСИ ЗАПУЩЕН');
    console.log('='.repeat(50));
    console.log(`📍 Сайт: http://localhost:${PORT}`);
    console.log(`🔌 API прокси: /api → http://localhost:5000`);
    console.log(`🔌 WS прокси: /socket.io → http://localhost:5000`);
    console.log('='.repeat(50));
});

// Обработка WebSocket
server.on('upgrade', (req, socket, head) => {
    // WebSocket прокси
    if (req.url.startsWith('/socket.io')) {
        const proxy = require('http-proxy').createProxyServer();
        proxy.ws(req, socket, head, { target: 'http://localhost:5000' });
    }
});