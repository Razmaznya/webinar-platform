const db = require('../database/database');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    
    // Присоединение к комнате вебинара
    socket.on('join-webinar', (data) => {
      const { webinarId, userId, userName, userRole } = data;
      const roomName = `webinar-${webinarId}`;
      
      socket.join(roomName);
      socket.webinarId = webinarId;
      socket.userId = userId;
      socket.userName = userName;
      socket.userRole = userRole;
      
      console.log(`User ${userName} joined webinar ${webinarId}`);
      
      // Отправить историю сообщений
      db.all(
        `SELECT cm.*, u.name as user_name, u.role as user_role
         FROM chat_messages cm
         JOIN users u ON cm.user_id = u.id
         WHERE cm.webinar_id = ? AND cm.moderated = 0
         ORDER BY cm.created_at DESC
         LIMIT 50`,
        [webinarId],
        (err, messages) => {
          if (err) {
            console.error('Error fetching chat history:', err);
            return;
          }
          socket.emit('chat-history', messages.reverse());
        }
      );
      
      // Уведомить других о новом участнике
      socket.to(roomName).emit('user-joined', {
        userId,
        userName,
        userRole,
        timestamp: new Date().toISOString()
      });
    });
    
    // Отправка сообщения
    socket.on('send-message', (data) => {
      const { webinarId, userId, message, isQuestion } = data;
      const roomName = `webinar-${webinarId}`;
      
      // Сохранить сообщение в БД
      db.run(
        'INSERT INTO chat_messages (webinar_id, user_id, message, is_question) VALUES (?, ?, ?, ?)',
        [webinarId, userId, message, isQuestion || false],
        function(err) {
          if (err) {
            console.error('Error saving message:', err);
            return;
          }
          
          // Получить данные пользователя
          db.get(
            'SELECT name, role FROM users WHERE id = ?',
            [userId],
            (err, user) => {
              if (err || !user) {
                console.error('Error fetching user:', err);
                return;
              }
              
              const messageData = {
                id: this.lastID,
                webinar_id: webinarId,
                user_id: userId,
                user_name: user.name,
                user_role: user.role,
                message,
                is_question: isQuestion || false,
                moderated: false,
                answered: false,
                created_at: new Date().toISOString()
              };
              
              // Отправить сообщение всем в комнате
              io.to(roomName).emit('new-message', messageData);
            }
          );
        }
      );
    });
    
    // Модерация сообщения
    socket.on('moderate-message', (data) => {
      const { messageId, action } = data;
      
      if (socket.userRole !== 'organizer' && socket.userRole !== 'speaker') {
        console.log('Unauthorized moderation attempt by', socket.userId);
        return;
      }
      
      console.log(`Moderation action: ${action} on message ${messageId} by ${socket.userId}`);
      
      if (action === 'delete') {
        db.run(
          'UPDATE chat_messages SET moderated = 1 WHERE id = ?',
          [messageId],
          function(err) {
            if (err) {
              console.error('Error deleting message:', err);
              return;
            }
            
            // Уведомить всех об удалении
            io.to(`webinar-${socket.webinarId}`).emit('message-deleted', {
              messageId,
              moderatorId: socket.userId
            });
          }
        );
      } else if (action === 'answer') {
        db.run(
          'UPDATE chat_messages SET answered = 1 WHERE id = ?',
          [messageId],
          function(err) {
            if (err) {
              console.error('Error marking message as answered:', err);
              return;
            }
            
            // Уведомить всех об ответе
            io.to(`webinar-${socket.webinarId}`).emit('question-answered', {
              messageId,
              answeredBy: socket.userId
            });
          }
        );
      }
    });
    
    // Отключение
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      
      if (socket.webinarId) {
        const roomName = `webinar-${socket.webinarId}`;
        socket.to(roomName).emit('user-left', {
          userId: socket.userId,
          userName: socket.userName,
          timestamp: new Date().toISOString()
        });
      }
    });
  });
};