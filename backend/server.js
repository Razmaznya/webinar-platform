const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));
app.use(bodyParser.json());
app.use(cookieParser());

// Проверяем существование папки frontend
const frontendPath = path.join(__dirname, '..', 'frontend');
console.log('Ищем frontend в:', frontendPath);

if (!fs.existsSync(frontendPath)) {
  console.error('ОШИБКА: Папка frontend не найдена!');
  console.log('Создайте папку frontend с файлом index.html');
}

// Раздаем статические файлы (ДОЛЖНО БЫТЬ ПЕРВЫМ!)
app.use(express.static(frontendPath));

// Подключение к базе данных
const db = require('./database/database');

// Импорт маршрутов
const authRoutes = require('./routes/auth');
const webinarRoutes = require('./routes/webinars');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');

// API маршруты
app.use('/api/auth', authRoutes);
app.use('/api/webinars', webinarRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// WebSocket для чата
const chatSocket = require('./sockets/chatSocket');
chatSocket(io);

// Все GET запросы (кроме API) на index.html - ИСПРАВЛЕННАЯ ВЕРСИЯ
app.get(/\/(?!api|socket\.io).*/, (req, res, next) => {
  // Пропускаем API и WebSocket
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return next();
  }
  
  // Пропускаем файлы с расширениями (css, js, images)
  if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|json)$/)) {
    return next();
  }
  
  const indexPath = path.join(frontendPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send(`
      <h1>Ошибка 404</h1>
      <p>Файл index.html не найден в: ${frontendPath}</p>
      <p>Создайте файл index.html в папке frontend</p>
    `);
  }
});

// Обработчик 404 для файлов
app.use((req, res) => {
  res.status(404).send('Not Found');
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('BACKEND СЕРВЕР ЗАПУЩЕН');
  console.log('='.repeat(50));
  console.log(`Порт: ${PORT}`);
  console.log(`Frontend путь: ${frontendPath}`);
  console.log('='.repeat(50));
  
  // Проверяем файлы
  console.log('\nПроверка файлов:');
  const filesToCheck = ['index.html', 'css/main.css', 'js/app.js'];
  filesToCheck.forEach(file => {
    const filePath = path.join(frontendPath, file);
    if (fs.existsSync(filePath)) {
      console.log(`✓ ${file} - найден`);
    } else {
      console.log(`✗ ${file} - ОТСУТСТВУЕТ!`);
    }
  });
});