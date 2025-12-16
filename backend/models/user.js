const db = require('../database/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class User {
  static create(userData, callback) {
    bcrypt.hash(userData.password, 10, (err, hash) => {
      if (err) return callback(err);
      
      const { email, name, role } = userData;
      db.run(
        'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
        [email, hash, name, role || 'participant'],
        function(err) {
          if (err) return callback(err);
          callback(null, { id: this.lastID, email, name, role });
        }
      );
    });
  }

  static findByEmail(email, callback) {
    db.get('SELECT * FROM users WHERE email = ?', [email], callback);
  }

  static findById(id, callback) {
    db.get('SELECT id, email, name, role, avatar, created_at FROM users WHERE id = ?', [id], callback);
  }

  static comparePassword(candidatePassword, hash, callback) {
    bcrypt.compare(candidatePassword, hash, callback);
  }

  static generateToken(user) {
    return jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
  }

  static updateProfile(userId, updates, callback) {
    const { name, avatar } = updates;
    db.run(
      'UPDATE users SET name = ?, avatar = ? WHERE id = ?',
      [name, avatar, userId],
      callback
    );
  }

  static getAll(callback) {
    db.all('SELECT id, email, name, role, created_at FROM users', callback);
  }
}

module.exports = User;