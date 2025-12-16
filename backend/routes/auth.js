const express = require('express');
const router = express.Router();
const User = require('../models/user');
const jwt = require('jsonwebtoken');

// Регистрация
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    
    // Проверка существования пользователя
    User.findByEmail(email, (err, existingUser) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (existingUser) return res.status(400).json({ error: 'User already exists' });
      
      // Создание пользователя
      User.create({ email, password, name, role }, (err, user) => {
        if (err) return res.status(500).json({ error: 'Error creating user' });
        
        const token = User.generateToken(user);
        
        // Установка токена в cookie
        res.cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 24 * 60 * 60 * 1000 // 24 часа
        });
        
        res.status(201).json({ 
          message: 'User created successfully',
          user: { id: user.id, email: user.email, name: user.name, role: user.role }
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Вход
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    User.findByEmail(email, async (err, user) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });
      
      User.comparePassword(password, user.password, (err, isMatch) => {
        if (err) return res.status(500).json({ error: 'Error comparing passwords' });
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });
        
        const token = User.generateToken(user);
        
        // Установка токена в cookie
        res.cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 24 * 60 * 60 * 1000
        });
        
        res.json({ 
          message: 'Login successful',
          user: { 
            id: user.id, 
            email: user.email, 
            name: user.name, 
            role: user.role,
            avatar: user.avatar
          }
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Выход
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logout successful' });
});

// Проверка токена
router.get('/verify', (req, res) => {
  const token = req.cookies.token;
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    User.findById(decoded.id, (err, user) => {
      if (err || !user) {
        return res.status(401).json({ error: 'Invalid token' });
      }
      res.json({ user });
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;