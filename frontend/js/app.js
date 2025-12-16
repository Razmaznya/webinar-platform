// Основной файл приложения
import { AuthService } from './auth.js';
import { Router } from './router.js';
import { UI } from './ui.js';

class App {
    constructor() {
        this.auth = new AuthService();
        this.router = new Router();
        this.ui = new UI();
        this.socket = null;
        this.currentUser = null;
        
        this.init();
    }
    
    async init() {
        console.log('Инициализация приложения...');
        
        try {
            // Загрузить компоненты
            await this.loadComponents();
            
            // Проверить аутентификацию
            await this.checkAuth();
            
            // Инициализировать роутер
            this.router.init(this);
            
            // Загрузить навигацию и футер
            this.ui.loadNavbar(this.currentUser);
            this.ui.loadFooter();
            
            console.log('Приложение инициализировано');
            
        } catch (error) {
            console.error('Ошибка инициализации приложения:', error);
        }
    }
    
    async loadComponents() {
        console.log('Загрузка компонентов...');
        // Загрузка компонентов будет реализована отдельно
    }
    
    async checkAuth() {
        try {
            this.currentUser = await this.auth.getCurrentUser();
            console.log('Статус авторизации:', this.currentUser ? 'Авторизован' : 'Не авторизован');
            return this.currentUser;
        } catch (error) {
            console.warn('Ошибка при проверке авторизации:', error);
            this.currentUser = null;
            return null;
        }
    }
    
    async login(email, password) {
        try {
            console.log('Попытка входа для:', email);
            const result = await this.auth.login(email, password);
            
            if (result.success) {
                this.currentUser = result.user;
                this.ui.loadNavbar(this.currentUser);
                console.log('Вход успешен');
                return { success: true, user: result.user };
            } else {
                console.log('Ошибка входа:', result.error);
                return result;
            }
        } catch (error) {
            console.error('Ошибка при входе:', error);
            return { success: false, error: 'Ошибка сети' };
        }
    }
    
    async logout() {
        try {
            console.log('Выход из системы');
            await this.auth.logout();
            this.currentUser = null;
            this.ui.loadNavbar(null);
            
            if (this.socket) {
                this.socket.disconnect();
                this.socket = null;
            }
            
            // Перенаправляем на главную
            if (this.router && this.router.navigate) {
                this.router.navigate('/');
            }
            
            return { success: true };
            
        } catch (error) {
            console.error('Ошибка при выходе:', error);
            return { success: false, error: 'Ошибка при выходе' };
        }
    }
    
    connectToWebinar(webinarId) {
        if (!this.currentUser) {
            console.error('Необходима авторизация для подключения к вебинару');
            return null;
        }
        
        if (!this.socket) {
            // Проверяем, доступен ли io (socket.io)
            if (typeof io === 'undefined') {
                console.error('Socket.io не загружен');
                return null;
            }
            
            this.socket = io();
            
            this.socket.on('connect', () => {
                console.log('Connected to WebSocket server');
                
                this.socket.emit('join-webinar', {
                    webinarId: webinarId,
                    userId: this.currentUser.id,
                    userName: this.currentUser.name,
                    userRole: this.currentUser.role
                });
            });
            
            this.socket.on('disconnect', () => {
                console.log('Disconnected from WebSocket server');
            });
            
            // Обработчики событий WebSocket
            this.socket.on('chat-history', (messages) => {
                console.log('Chat history:', messages);
            });
            
            this.socket.on('new-message', (message) => {
                console.log('New message:', message);
            });
            
            this.socket.on('user-joined', (data) => {
                console.log('User joined:', data);
            });
            
            this.socket.on('user-left', (data) => {
                console.log('User left:', data);
            });
            
            this.socket.on('error', (error) => {
                console.error('WebSocket error:', error);
            });
        }
        
        return this.socket;
    }
}

// Инициализация приложения
const app = new App();
window.app = app;

// Экспорт для использования в других модулях (если нужно)
export { App };