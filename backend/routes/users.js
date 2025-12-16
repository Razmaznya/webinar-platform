const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const db = require('../database/database');

// Получить профиль пользователя
router.get('/profile', authMiddleware, (req, res) => {
  const userId = req.user.id;
  
  db.get(
    'SELECT id, email, name, role, avatar, created_at FROM users WHERE id = ?',
    [userId],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(user);
    }
  );
});

// Обновить профиль
router.put('/profile', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const { name, avatar } = req.body;
  
  db.run(
    'UPDATE users SET name = ?, avatar = ? WHERE id = ?',
    [name, avatar, userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Profile updated successfully' });
    }
  );
});

// Получить вебинары пользователя
router.get('/my-webinars', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const role = req.user.role;
  
  let query;
  let params = [userId];
  
  if (role === 'organizer') {
    query = `
      SELECT w.*, COUNT(r.user_id) as registered_count
      FROM webinars w
      LEFT JOIN registrations r ON w.id = r.webinar_id
      WHERE w.organizer_id = ?
      GROUP BY w.id
      ORDER BY w.start_time DESC
    `;
  } else if (role === 'speaker') {
    query = `
      SELECT w.*, u.name as organizer_name, COUNT(r.user_id) as registered_count
      FROM webinars w
      LEFT JOIN users u ON w.organizer_id = u.id
      LEFT JOIN registrations r ON w.id = r.webinar_id
      WHERE w.speaker_id = ?
      GROUP BY w.id
      ORDER BY w.start_time DESC
    `;
  } else {
    query = `
      SELECT w.*, u.name as organizer_name, COUNT(r2.user_id) as registered_count
      FROM registrations r
      JOIN webinars w ON r.webinar_id = w.id
      LEFT JOIN users u ON w.organizer_id = u.id
      LEFT JOIN registrations r2 ON w.id = r2.webinar_id
      WHERE r.user_id = ?
      GROUP BY w.id
      ORDER BY w.start_time DESC
    `;
  }
  
  db.all(query, params, (err, webinars) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(webinars);
  });
});

// Получить статистику пользователя
router.get('/my-stats', authMiddleware, (req, res) => {
  const userId = req.user.id;
  
  const queries = {
    webinarsAttended: `
      SELECT COUNT(*) as count 
      FROM registrations 
      WHERE user_id = ? AND attended = 1
    `,
    webinarsRegistered: `
      SELECT COUNT(*) as count 
      FROM registrations 
      WHERE user_id = ?
    `,
    questionsAsked: `
      SELECT COUNT(*) as count 
      FROM chat_messages 
      WHERE user_id = ? AND is_question = 1
    `,
    messagesSent: `
      SELECT COUNT(*) as count 
      FROM chat_messages 
      WHERE user_id = ?
    `
  };
  
  const results = {};
  let completed = 0;
  
  for (const key in queries) {
    db.get(queries[key], [userId], (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      results[key] = row.count;
      completed++;
      
      if (completed === Object.keys(queries).length) {
        res.json(results);
      }
    });
  }
});

module.exports = router;