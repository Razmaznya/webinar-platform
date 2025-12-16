const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'webinar.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    initializeDatabase();
  }
});

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
}

async function initializeDatabase() {
  try {
    // 1. Создаем таблицу users ПЕРВОЙ (так как на неё ссылаются другие таблицы)
    await runQuery(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT CHECK(role IN ('organizer', 'speaker', 'participant')) DEFAULT 'participant',
        avatar TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Users table created/verified');

    // 2. Создаем таблицу webinars
    await runQuery(`
      CREATE TABLE IF NOT EXISTS webinars (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        organizer_id INTEGER NOT NULL,
        speaker_id INTEGER,
        start_time DATETIME NOT NULL,
        duration INTEGER NOT NULL,
        max_participants INTEGER,
        
        -- Настройки доступа и конфигурации
        access_type TEXT CHECK(access_type IN ('open', 'members_only', 'password')) DEFAULT 'open',
        room_password TEXT,
        require_moderator INTEGER DEFAULT 0,
        enable_recording INTEGER DEFAULT 1,
        enable_chat INTEGER DEFAULT 1,
        enable_screen_sharing INTEGER DEFAULT 1,
        mute_on_start INTEGER DEFAULT 1,
        
        -- Статус и технические поля
        status TEXT CHECK(status IN ('scheduled', 'live', 'ended', 'cancelled')) DEFAULT 'scheduled',
        jitsi_room TEXT UNIQUE,
        recording_url TEXT,
        
        -- Метрики
        total_viewers INTEGER DEFAULT 0,
        avg_attendance_duration INTEGER DEFAULT 0,
        
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (organizer_id) REFERENCES users(id),
        FOREIGN KEY (speaker_id) REFERENCES users(id)
      )
    `);
    console.log('Webinars table created/verified');

    // 3. Создаем таблицу registrations
    await runQuery(`
      CREATE TABLE IF NOT EXISTS registrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        webinar_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        registration_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        attended INTEGER DEFAULT 0,
        attendance_start DATETIME,
        attendance_end DATETIME,
        attendance_duration INTEGER DEFAULT 0,
        FOREIGN KEY (webinar_id) REFERENCES webinars(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(webinar_id, user_id)
      )
    `);
    console.log('Registrations table created/verified');

    // 4. Создаем таблицу chat_messages
    await runQuery(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        webinar_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        is_question INTEGER DEFAULT 0,
        answered INTEGER DEFAULT 0,
        moderated INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (webinar_id) REFERENCES webinars(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    console.log('Chat messages table created/verified');

    // 5. Создаем таблицу recordings
    await runQuery(`
      CREATE TABLE IF NOT EXISTS recordings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        webinar_id INTEGER NOT NULL,
        url TEXT NOT NULL,
        duration INTEGER,
        file_size INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (webinar_id) REFERENCES webinars(id)
      )
    `);
    console.log('Recordings table created/verified');

    // 6. Создаем таблицу schedules
    await runQuery(`
      CREATE TABLE IF NOT EXISTS schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        webinar_id INTEGER NOT NULL,
        session_title TEXT NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        speaker_id INTEGER,
        FOREIGN KEY (webinar_id) REFERENCES webinars(id),
        FOREIGN KEY (speaker_id) REFERENCES users(id)
      )
    `);
    console.log('Schedules table created/verified');

    // 7. Создаем таблицу webinar_stats
    await runQuery(`
      CREATE TABLE IF NOT EXISTS webinar_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        webinar_id INTEGER NOT NULL,
        metric_type TEXT NOT NULL,
        metric_value INTEGER DEFAULT 0,
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        recorded_date TEXT GENERATED ALWAYS AS (date(recorded_at)) VIRTUAL,
        FOREIGN KEY (webinar_id) REFERENCES webinars(id),
        UNIQUE(webinar_id, metric_type, recorded_date)
      )
    `);
    console.log('Webinar stats table created/verified');

    // 8. Создаем таблицу user_settings
    await runQuery(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        setting_key TEXT NOT NULL,
        setting_value TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, setting_key)
      )
    `);
    console.log('User settings table created/verified');

    // 9. Создаем триггеры (после создания всех таблиц)
    await runQuery(`
      CREATE TRIGGER IF NOT EXISTS update_webinar_timestamp 
      AFTER UPDATE ON webinars
      FOR EACH ROW
      BEGIN
        UPDATE webinars SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
      END
    `);
    console.log('Webinar timestamp trigger created/verified');

    // 10. Создаем индексы (после создания всех таблиц)
    await runQuery(`
      CREATE INDEX IF NOT EXISTS idx_webinars_organizer ON webinars(organizer_id)
    `);
    console.log('Webinar organizer index created/verified');

    await runQuery(`
      CREATE INDEX IF NOT EXISTS idx_webinars_status ON webinars(status, start_time)
    `);
    console.log('Webinar status index created/verified');

    await runQuery(`
      CREATE INDEX IF NOT EXISTS idx_registrations_webinar ON registrations(webinar_id)
    `);
    console.log('Registrations index created/verified');

    await runQuery(`
      CREATE INDEX IF NOT EXISTS idx_chat_webinar ON chat_messages(webinar_id, created_at)
    `);
    console.log('Chat messages index created/verified');

    // 11. Создаем тестовых пользователей
    await createDefaultUsers();
    
    console.log('Database initialization completed successfully!');

  } catch (err) {
    console.error('Error during database initialization:', err.message);
  }
}

async function createDefaultUsers() {
  const defaultUsers = [
    {
      email: 'admin@webinar.com',
      password: 'admin123',
      name: 'Администратор',
      role: 'organizer'
    },
    {
      email: 'speaker@webinar.com',
      password: 'speaker123',
      name: 'Тестовый Спикер',
      role: 'speaker'
    },
    {
      email: 'user@webinar.com',
      password: 'user123',
      name: 'Тестовый Пользователь',
      role: 'participant'
    }
  ];

  for (const user of defaultUsers) {
    try {
      const row = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE email = ?', [user.email], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      if (!row) {
        const hash = await bcrypt.hash(user.password, 10);
        
        await runQuery(
          'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
          [user.email, hash, user.name, user.role]
        );
        console.log(`Created default user: ${user.email} (${user.role})`);
      }
    } catch (err) {
      console.error(`Error creating user ${user.email}:`, err.message);
    }
  }
}

// Вспомогательные функции для работы с БД
db.runQuery = runQuery;

db.getQuery = function(sql, params = []) {
  return new Promise((resolve, reject) => {
    this.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

db.allQuery = function(sql, params = []) {
  return new Promise((resolve, reject) => {
    this.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

// Функция для миграции существующей БД
db.migrateDatabase = function() {
  return new Promise((resolve, reject) => {
    console.log('Checking for database migrations...');
    
    // Проверяем существование новых колонок и добавляем их если нужно
    const newColumns = [
      { name: 'access_type', type: 'TEXT CHECK(access_type IN ("open", "members_only", "password")) DEFAULT "open"' },
      { name: 'room_password', type: 'TEXT' },
      { name: 'require_moderator', type: 'INTEGER DEFAULT 0' },
      { name: 'enable_recording', type: 'INTEGER DEFAULT 1' },
      { name: 'enable_chat', type: 'INTEGER DEFAULT 1' },
      { name: 'enable_screen_sharing', type: 'INTEGER DEFAULT 1' },
      { name: 'mute_on_start', type: 'INTEGER DEFAULT 1' },
      { name: 'total_viewers', type: 'INTEGER DEFAULT 0' },
      { name: 'avg_attendance_duration', type: 'INTEGER DEFAULT 0' }
    ];

    // Проверяем структуру таблицы webinars
    db.all("PRAGMA table_info(webinars)", (err, columns) => {
      if (err) {
        console.error('Error getting table info:', err.message);
        resolve(); // Не прерываем, это нормально для новой БД
        return;
      }

      const existingColumns = columns.map(col => col.name.toLowerCase());
      let pendingOperations = 0;
      let completedOperations = 0;
      
      const checkCompletion = () => {
        completedOperations++;
        if (completedOperations === pendingOperations) {
          console.log('Migration check completed');
          resolve();
        }
      };
      
      // Добавляем недостающие колонки
      newColumns.forEach(column => {
        if (!existingColumns.includes(column.name.toLowerCase())) {
          pendingOperations++;
          const sql = `ALTER TABLE webinars ADD COLUMN ${column.name} ${column.type}`;
          db.run(sql, (err) => {
            if (err) {
              console.error(`Error adding column ${column.name}:`, err.message);
            } else {
              console.log(`Successfully added column: ${column.name}`);
            }
            checkCompletion();
          });
        }
      });

      // Отдельно обрабатываем updated_at
      if (!existingColumns.includes('updated_at')) {
        pendingOperations++;
        const sql = `ALTER TABLE webinars ADD COLUMN updated_at DATETIME`;
        db.run(sql, (err) => {
          if (err) {
            console.error(`Error adding column updated_at:`, err.message);
            checkCompletion();
          } else {
            // После добавления колонки обновляем существующие записи
            db.run(`UPDATE webinars SET updated_at = created_at WHERE updated_at IS NULL`, (err) => {
              if (err) {
                console.error('Error updating updated_at column:', err.message);
              } else {
                console.log('Successfully added and populated column: updated_at');
              }
              checkCompletion();
            });
          }
        });
      }

      // Если не было операций, сразу завершаем
      if (pendingOperations === 0) {
        console.log('No migrations needed');
        resolve();
      }
    });
  });
};

// Запускаем миграции при инициализации
setTimeout(() => {
  db.migrateDatabase();
}, 1000);

module.exports = db;