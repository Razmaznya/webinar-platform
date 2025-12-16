const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const db = require('../database/database');
const { v4: uuidv4 } = require('uuid');

// Получить все вебинары
router.get('/', authMiddleware, (req, res) => {
  const query = `
    SELECT w.*, u.name as organizer_name, s.name as speaker_name,
           COUNT(r.user_id) as registered_count
    FROM webinars w
    LEFT JOIN users u ON w.organizer_id = u.id
    LEFT JOIN users s ON w.speaker_id = s.id
    LEFT JOIN registrations r ON w.id = r.webinar_id
    GROUP BY w.id
    ORDER BY w.start_time DESC
  `;
  
  db.all(query, (err, webinars) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(webinars);
  });
});

// Получить вебинар по ID
router.get('/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT w.*, u.name as organizer_name, s.name as speaker_name
    FROM webinars w
    LEFT JOIN users u ON w.organizer_id = u.id
    LEFT JOIN users s ON w.speaker_id = s.id
    WHERE w.id = ?
  `;
  
  db.get(query, [id], (err, webinar) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!webinar) {
      return res.status(404).json({ error: 'Webinar not found' });
    }
    
    // Получить расписание
    db.all('SELECT * FROM schedules WHERE webinar_id = ? ORDER BY start_time', [id], (err, schedules) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // Получить записи
      db.all('SELECT * FROM recordings WHERE webinar_id = ?', [id], (err, recordings) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        // Проверить регистрацию пользователя
        db.get(
          'SELECT * FROM registrations WHERE webinar_id = ? AND user_id = ?',
          [id, req.user.id],
          (err, registration) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            
            res.json({
              ...webinar,
              schedules,
              recordings,
              is_registered: !!registration
            });
          }
        );
      });
    });
  });
});

// Создать вебинар
router.post('/', authMiddleware, roleMiddleware(['organizer', 'speaker']), (req, res) => {
  const { 
    title, 
    description, 
    speaker_id, 
    start_time, 
    duration, 
    max_participants,
    // Новые поля настроек
    access_type = 'open',
    room_password = null,
    require_moderator = false,
    enable_recording = true,
    enable_chat = true,
    enable_screen_sharing = true,
    mute_on_start = true
  } = req.body;
  
  const organizer_id = req.user.id;
  const jitsi_room = uuidv4();
  
  // Валидация обязательных полей
  if (!title || !start_time || !duration) {
    return res.status(400).json({ error: 'Title, start_time, and duration are required' });
  }
  
  // Валидация пароля для защищенных вебинаров
  if (access_type === 'password' && (!room_password || room_password.length < 4)) {
    return res.status(400).json({ error: 'Password must be at least 4 characters for password-protected webinars' });
  }
  
  // Генерируем уникальное имя комнаты
  const safeTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 30);
  const timestamp = Date.now();
  const uniqueRoom = `${safeTitle}-${timestamp}-${jitsi_room.substring(0, 8)}`;
  
  db.run(
    `INSERT INTO webinars 
     (title, description, organizer_id, speaker_id, start_time, duration, max_participants, 
      jitsi_room, status, access_type, room_password, require_moderator, enable_recording, 
      enable_chat, enable_screen_sharing, mute_on_start)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      title, 
      description || null, 
      organizer_id, 
      speaker_id || null, 
      start_time, 
      duration, 
      max_participants || null,
      uniqueRoom,
      'scheduled',
      access_type,
      access_type === 'password' ? room_password : null,
      require_moderator ? 1 : 0,
      enable_recording ? 1 : 0,
      enable_chat ? 1 : 0,
      enable_screen_sharing ? 1 : 0,
      mute_on_start ? 1 : 0
    ],
    function(err) {
      if (err) {
        console.error('Error creating webinar:', err);
        return res.status(500).json({ error: err.message });
      }
      
      // Получить созданный вебинар для ответа
      db.get(
        `SELECT w.*, u.name as organizer_name 
         FROM webinars w 
         LEFT JOIN users u ON w.organizer_id = u.id 
         WHERE w.id = ?`,
        [this.lastID],
        (err, createdWebinar) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          res.status(201).json({
            success: true,
            webinar: createdWebinar,
            message: 'Webinar created successfully'
          });
        }
      );
    }
  );
});

// Обновить вебинар
router.put('/:id', authMiddleware, roleMiddleware(['organizer']), (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  // Проверить существование вебинара
  db.get('SELECT * FROM webinars WHERE id = ?', [id], (err, webinar) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!webinar) {
      return res.status(404).json({ error: 'Webinar not found' });
    }
    
    // Проверить права доступа (только организатор может редактировать)
    if (webinar.organizer_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only edit your own webinars' });
    }
    
    // Определить, какие поля можно обновлять
    const allowedUpdates = [
      'title', 'description', 'speaker_id', 'start_time', 'duration', 
      'max_participants', 'access_type', 'room_password', 'require_moderator',
      'enable_recording', 'enable_chat', 'enable_screen_sharing', 'mute_on_start'
    ];
    
    let setClause = [];
    let values = [];
    
    for (const key in updates) {
      if (allowedUpdates.includes(key)) {
        // Особые обработки для булевых значений
        if (['require_moderator', 'enable_recording', 'enable_chat', 'enable_screen_sharing', 'mute_on_start'].includes(key)) {
          setClause.push(`${key} = ?`);
          values.push(updates[key] ? 1 : 0);
        } else if (key === 'room_password') {
          // Если тип доступа не password, игнорируем пароль
          if (updates.access_type === 'password') {
            setClause.push(`${key} = ?`);
            values.push(updates[key]);
          }
        } else {
          setClause.push(`${key} = ?`);
          values.push(updates[key]);
        }
      }
    }
    
    if (setClause.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    values.push(id);
    
    db.run(
      `UPDATE webinars SET ${setClause.join(', ')} WHERE id = ?`,
      values,
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        res.json({ 
          success: true,
          message: 'Webinar updated successfully' 
        });
      }
    );
  });
});

// Удалить вебинар
router.delete('/:id', authMiddleware, roleMiddleware(['organizer']), (req, res) => {
  const { id } = req.params;
  
  // Проверить права доступа
  db.get('SELECT organizer_id FROM webinars WHERE id = ?', [id], (err, webinar) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!webinar) {
      return res.status(404).json({ error: 'Webinar not found' });
    }
    
    if (webinar.organizer_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own webinars' });
    }
    
    // Начать транзакцию для удаления связанных данных
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      // Удалить регистрации
      db.run('DELETE FROM registrations WHERE webinar_id = ?', [id], (err) => {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: err.message });
        }
      });
      
      // Удалить расписание
      db.run('DELETE FROM schedules WHERE webinar_id = ?', [id], (err) => {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: err.message });
        }
      });
      
      // Удалить записи
      db.run('DELETE FROM recordings WHERE webinar_id = ?', [id], (err) => {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: err.message });
        }
      });
      
      // Удалить вебинар
      db.run('DELETE FROM webinars WHERE id = ?', [id], function(err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: err.message });
        }
        
        if (this.changes === 0) {
          db.run('ROLLBACK');
          return res.status(404).json({ error: 'Webinar not found' });
        }
        
        db.run('COMMIT', (err) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          res.json({ 
            success: true,
            message: 'Webinar and all related data deleted successfully' 
          });
        });
      });
    });
  });
});

// Регистрация на вебинар
router.post('/:id/register', authMiddleware, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  // Проверить существование вебинара
  db.get('SELECT * FROM webinars WHERE id = ?', [id], (err, webinar) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!webinar) {
      return res.status(404).json({ error: 'Webinar not found' });
    }
    
    // Проверить доступность вебинара
    if (webinar.status !== 'scheduled' && webinar.status !== 'live') {
      return res.status(400).json({ error: 'Webinar is not available for registration' });
    }
    
    // Проверить количество зарегистрированных
    db.get(
      'SELECT COUNT(*) as count FROM registrations WHERE webinar_id = ?',
      [id],
      (err, result) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        if (webinar.max_participants && result.count >= webinar.max_participants) {
          return res.status(400).json({ error: 'Webinar is full' });
        }
        
        // Зарегистрировать пользователя
        db.run(
          'INSERT OR IGNORE INTO registrations (webinar_id, user_id, registration_date) VALUES (?, ?, datetime("now"))',
          [id, userId],
          function(err) {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            
            if (this.changes === 0) {
              return res.status(400).json({ error: 'Already registered' });
            }
            
            res.json({ 
              success: true,
              message: 'Registration successful' 
            });
          }
        );
      }
    );
  });
});

// Отменить регистрацию
router.delete('/:id/register', authMiddleware, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  db.run(
    'DELETE FROM registrations WHERE webinar_id = ? AND user_id = ?',
    [id, userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Registration not found' });
      }
      res.json({ 
        success: true,
        message: 'Registration cancelled successfully' 
      });
    }
  );
});

// Получить участников вебинара
router.get('/:id/participants', authMiddleware, (req, res) => {
  const { id } = req.params;
  
  // Проверить, может ли пользователь видеть участников
  db.get('SELECT organizer_id, speaker_id FROM webinars WHERE id = ?', [id], (err, webinar) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!webinar) {
      return res.status(404).json({ error: 'Webinar not found' });
    }
    
    // Только организатор, спикер или сам пользователь (если он участник)
    const isAuthorized = webinar.organizer_id === req.user.id || 
                        webinar.speaker_id === req.user.id ||
                        req.user.role === 'organizer';
    
    if (!isAuthorized) {
      // Проверить, зарегистрирован ли пользователь
      db.get(
        'SELECT * FROM registrations WHERE webinar_id = ? AND user_id = ?',
        [id, req.user.id],
        (err, registration) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          if (!registration) {
            return res.status(403).json({ error: 'Not authorized to view participants' });
          }
          
          // Разрешено просматривать других участников
          getParticipants();
        }
      );
    } else {
      getParticipants();
    }
  });
  
  function getParticipants() {
    const query = `
      SELECT u.id, u.name, u.email, u.role, u.avatar,
             r.registration_date, r.attended, r.attendance_duration,
             CASE 
               WHEN u.id = (SELECT organizer_id FROM webinars WHERE id = ?) THEN 'organizer'
               WHEN u.id = (SELECT speaker_id FROM webinars WHERE id = ?) THEN 'speaker'
               ELSE 'participant'
             END as webinar_role
      FROM registrations r
      JOIN users u ON r.user_id = u.id
      WHERE r.webinar_id = ?
      ORDER BY 
        CASE webinar_role
          WHEN 'organizer' THEN 1
          WHEN 'speaker' THEN 2
          ELSE 3
        END,
        r.registration_date DESC
    `;
    
    db.all(query, [id, id, id], (err, participants) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(participants);
    });
  }
});

// Обновить статус вебинара (начать/завершить)
router.post('/:id/status', authMiddleware, roleMiddleware(['organizer', 'speaker']), (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const validStatuses = ['scheduled', 'live', 'ended', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  // Проверить права доступа
  db.get('SELECT organizer_id, speaker_id FROM webinars WHERE id = ?', [id], (err, webinar) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!webinar) {
      return res.status(404).json({ error: 'Webinar not found' });
    }
    
    const isAuthorized = webinar.organizer_id === req.user.id || 
                        webinar.speaker_id === req.user.id ||
                        req.user.role === 'organizer';
    
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Not authorized to change webinar status' });
    }
    
    db.run(
      'UPDATE webinars SET status = ? WHERE id = ?',
      [status, id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Webinar not found' });
        }
        
        // Если вебинар завершен, обновить посещаемость
        if (status === 'ended') {
          // Здесь можно добавить логику для обновления времени посещения
          console.log(`Webinar ${id} ended. Recording attendance data would be processed here.`);
        }
        
        res.json({ 
          success: true,
          message: `Webinar status updated to ${status}` 
        });
      }
    );
  });
});

// Получить доступ к вебинару (проверка пароля и прав доступа)
router.post('/:id/access', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  const userId = req.user.id;
  
  db.get('SELECT * FROM webinars WHERE id = ?', [id], (err, webinar) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!webinar) {
      return res.status(404).json({ error: 'Webinar not found' });
    }
    
    // Проверить статус вебинара
    if (webinar.status !== 'live' && webinar.status !== 'scheduled') {
      return res.status(400).json({ error: 'Webinar is not active' });
    }
    
    // Проверить регистрацию для вебинаров только для участников
    if (webinar.access_type === 'members_only') {
      db.get(
        'SELECT * FROM registrations WHERE webinar_id = ? AND user_id = ?',
        [id, userId],
        (err, registration) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          if (!registration) {
            return res.status(403).json({ 
              error: 'Registration required for this webinar',
              requiresRegistration: true
            });
          }
          
          checkPassword();
        }
      );
    } else {
      checkPassword();
    }
    
    function checkPassword() {
      // Проверить пароль для защищенных вебинаров
      if (webinar.access_type === 'password') {
        if (!password) {
          return res.status(400).json({ 
            error: 'Password required',
            requiresPassword: true
          });
        }
        
        if (password !== webinar.room_password) {
          return res.status(401).json({ error: 'Incorrect password' });
        }
      }
      
      // Все проверки пройдены
      res.json({
        success: true,
        accessGranted: true,
        jitsi_room: webinar.jitsi_room,
        webinar: {
          id: webinar.id,
          title: webinar.title,
          access_type: webinar.access_type,
          require_moderator: webinar.require_moderator,
          enable_chat: webinar.enable_chat,
          enable_screen_sharing: webinar.enable_screen_sharing
        }
      });
    }
  });
});

// =============== НОВЫЕ ЭНДПОИНТЫ ===============

// Запустить вебинар (для организаторов/спикеров)
router.post('/:id/start', authMiddleware, roleMiddleware(['organizer', 'speaker']), async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  try {
    // Проверить существование вебинара
    const webinar = await db.getQuery('SELECT * FROM webinars WHERE id = ?', [id]);
    
    if (!webinar) {
      return res.status(404).json({ error: 'Webinar not found' });
    }
    
    // Проверить права доступа
    const isOrganizer = webinar.organizer_id === userId;
    const isSpeaker = webinar.speaker_id === userId;
    const isAdmin = req.user.role === 'organizer';
    
    if (!isOrganizer && !isSpeaker && !isAdmin) {
      return res.status(403).json({ error: 'Only organizers or speakers can start the webinar' });
    }
    
    // Обновить статус вебинара
    await db.runQuery(
      'UPDATE webinars SET status = "live", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
    
    // Если организатор/спикер первым заходит, создать запись о присутствии
    const registration = await db.getQuery(
      'SELECT * FROM registrations WHERE webinar_id = ? AND user_id = ?',
      [id, userId]
    );
    
    if (registration) {
      // Обновить статус присутствия
      await db.runQuery(
        'UPDATE registrations SET attended = 1, attendance_start = CURRENT_TIMESTAMP WHERE id = ?',
        [registration.id]
      );
    } else {
      // Создать запись о присутствии для организатора/спикера
      await db.runQuery(
        'INSERT INTO registrations (webinar_id, user_id, attended, attendance_start) VALUES (?, ?, 1, CURRENT_TIMESTAMP)',
        [id, userId]
      );
    }
    
    // Записать статистику
    await db.runQuery(
      'INSERT INTO webinar_stats (webinar_id, metric_type, metric_value) VALUES (?, "webinar_started", 1)',
      [id]
    );
    
    res.json({
      success: true,
      message: 'Webinar started successfully',
      jitsi_room: webinar.jitsi_room
    });
    
  } catch (err) {
    console.error('Error starting webinar:', err);
    res.status(500).json({ error: err.message });
  }
});

// Проверить статус вебинара
router.get('/:id/status-check', authMiddleware, async (req, res) => {
  const { id } = req.params;
  
  try {
    const webinar = await db.getQuery('SELECT * FROM webinars WHERE id = ?', [id]);
    
    if (!webinar) {
      return res.status(404).json({ error: 'Webinar not found' });
    }
    
    // Проверить, есть ли уже кто-то в вебинаре
    const activeParticipants = await db.getQuery(
      'SELECT COUNT(*) as count FROM registrations WHERE webinar_id = ? AND attended = 1 AND attendance_start IS NOT NULL AND attendance_end IS NULL',
      [id]
    );
    
    res.json({
      status: webinar.status,
      is_live: webinar.status === 'live',
      has_participants: activeParticipants.count > 0,
      require_moderator: webinar.require_moderator,
      can_join: webinar.status === 'live' || (webinar.status === 'scheduled' && !webinar.require_moderator)
    });
    
  } catch (err) {
    console.error('Error checking webinar status:', err);
    res.status(500).json({ error: err.message });
  }
});

// Обновить статистику посещения
router.post('/:id/attendance', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;
  const userId = req.user.id;
  
  try {
    if (action === 'start') {
      // Начало присутствия
      const registration = await db.getQuery(
        'SELECT * FROM registrations WHERE webinar_id = ? AND user_id = ?',
        [id, userId]
      );
      
      if (registration) {
        await db.runQuery(
          'UPDATE registrations SET attended = 1, attendance_start = CURRENT_TIMESTAMP WHERE id = ?',
          [registration.id]
        );
      } else {
        await db.runQuery(
          'INSERT INTO registrations (webinar_id, user_id, attended, attendance_start) VALUES (?, ?, 1, CURRENT_TIMESTAMP)',
          [id, userId]
        );
      }
      
      // Записать статистику
      await db.runQuery(
        'INSERT INTO webinar_stats (webinar_id, metric_type, metric_value) VALUES (?, "user_joined", 1)',
        [id]
      );
      
    } else if (action === 'end') {
      // Конец присутствия
      const registration = await db.getQuery(
        'SELECT * FROM registrations WHERE webinar_id = ? AND user_id = ? AND attendance_start IS NOT NULL',
        [id, userId]
      );
      
      if (registration) {
        const startTime = new Date(registration.attendance_start);
        const endTime = new Date();
        const duration = Math.round((endTime - startTime) / 60000); // в минутах
        
        await db.runQuery(
          'UPDATE registrations SET attendance_end = CURRENT_TIMESTAMP, attendance_duration = ? WHERE id = ?',
          [duration, registration.id]
        );
      }
    }
    
    res.json({ success: true });
    
  } catch (err) {
    console.error('Error updating attendance:', err);
    res.status(500).json({ error: err.message });
  }
});

// Уведомление о входе в вебинар
router.post('/:id/join-notification', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { userId, userName } = req.body;
  
  try {
    // Отправить уведомление в чат (если есть WebSocket)
    // или записать в базу данных
    
    // Обновить статистику присутствия
    await db.runQuery(
      'INSERT INTO webinar_stats (webinar_id, metric_type, metric_value) VALUES (?, "user_joined", 1)',
      [id]
    );
    
    // Можно также добавить сообщение в чат
    await db.runQuery(
      `INSERT INTO chat_messages (webinar_id, user_id, message, is_question, moderated, created_at) 
       VALUES (?, ?, ?, 0, 0, CURRENT_TIMESTAMP)`,
      [id, userId, `${userName} присоединился к вебинару`]
    );
    
    res.json({ success: true });
    
  } catch (err) {
    console.error('Error sending join notification:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;