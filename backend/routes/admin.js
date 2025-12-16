const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const db = require('../database/database');

// Получить статистику
router.get('/stats', authMiddleware, roleMiddleware(['organizer']), (req, res) => {
  const queries = {
    totalWebinars: 'SELECT COUNT(*) as count FROM webinars',
    totalUsers: 'SELECT COUNT(*) as count FROM users',
    totalRegistrations: 'SELECT COUNT(*) as count FROM registrations',
    upcomingWebinars: 'SELECT COUNT(*) as count FROM webinars WHERE status = "scheduled"',
    activeWebinars: 'SELECT COUNT(*) as count FROM webinars WHERE status = "live"'
  };
  
  const results = {};
  let completed = 0;
  
  for (const key in queries) {
    db.get(queries[key], (err, row) => {
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

// Получить отчеты по посещаемости
router.get('/attendance-reports', authMiddleware, roleMiddleware(['organizer']), (req, res) => {
  const { startDate, endDate } = req.query;
  
  let query = `
    SELECT 
      w.id,
      w.title,
      w.start_time,
      COUNT(r.user_id) as total_registered,
      SUM(CASE WHEN r.attended = 1 THEN 1 ELSE 0 END) as total_attended,
      AVG(r.attendance_duration) as avg_attendance_duration
    FROM webinars w
    LEFT JOIN registrations r ON w.id = r.webinar_id
  `;
  
  const params = [];
  
  if (startDate && endDate) {
    query += ` WHERE w.start_time BETWEEN ? AND ?`;
    params.push(startDate, endDate);
  }
  
  query += ` GROUP BY w.id ORDER BY w.start_time DESC`;
  
  db.all(query, params, (err, reports) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(reports);
  });
});

// Получить детальный отчет по вебинару
router.get('/webinar-report/:id', authMiddleware, roleMiddleware(['organizer', 'speaker']), (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT 
      w.title,
      w.start_time,
      w.duration,
      u.name as organizer_name,
      s.name as speaker_name,
      COUNT(DISTINCT r.user_id) as total_participants,
      COUNT(DISTINCT CASE WHEN r.attended = 1 THEN r.user_id END) as attended_count,
      COUNT(DISTINCT cm.id) as total_messages,
      COUNT(DISTINCT CASE WHEN cm.is_question = 1 THEN cm.id END) as total_questions,
      COUNT(DISTINCT CASE WHEN cm.answered = 1 THEN cm.id END) as answered_questions
    FROM webinars w
    LEFT JOIN users u ON w.organizer_id = u.id
    LEFT JOIN users s ON w.speaker_id = s.id
    LEFT JOIN registrations r ON w.id = r.webinar_id
    LEFT JOIN chat_messages cm ON w.id = cm.webinar_id
    WHERE w.id = ?
    GROUP BY w.id
  `;
  
  db.get(query, [id], (err, report) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Получить список участников с деталями
    db.all(
      `SELECT 
         u.name,
         u.email,
         r.registration_date,
         r.attended,
         r.attendance_duration
       FROM registrations r
       JOIN users u ON r.user_id = u.id
       WHERE r.webinar_id = ?
       ORDER BY r.registration_date`,
      [id],
      (err, participants) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        res.json({
          ...report,
          participants
        });
      }
    );
  });
});

// Получить все сообщения (для модерации)
router.get('/chat-messages/:webinarId', authMiddleware, roleMiddleware(['organizer', 'speaker']), (req, res) => {
  const { webinarId } = req.params;
  
  const query = `
    SELECT cm.*, u.name as user_name, u.role as user_role
    FROM chat_messages cm
    JOIN users u ON cm.user_id = u.id
    WHERE cm.webinar_id = ?
    ORDER BY cm.created_at DESC
  `;
  
  db.all(query, [webinarId], (err, messages) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(messages);
  });
});

// Управление пользователями
router.get('/users', authMiddleware, roleMiddleware(['organizer']), (req, res) => {
  db.all(
    'SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC',
    (err, users) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(users);
    }
  );
});

// Изменить роль пользователя
router.put('/users/:id/role', authMiddleware, roleMiddleware(['organizer']), (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  
  const validRoles = ['organizer', 'speaker', 'participant'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  
  db.run(
    'UPDATE users SET role = ? WHERE id = ?',
    [role, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json({ message: 'User role updated successfully' });
    }
  );
});

module.exports = router;