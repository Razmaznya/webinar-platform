export class Router {
    constructor() {
        this.routes = {};
        this.currentPath = '';
        this.currentJitsiApi = null;
    }
    
    init(app) {
        this.app = app;
        
        // Определение маршрутов
        this.routes = {
            '/': this.homePage.bind(this),
            '/login': this.loginPage.bind(this),
            '/register': this.registerPage.bind(this),
            '/dashboard': this.dashboardPage.bind(this),
            '/webinars': this.webinarsPage.bind(this),
            '/webinars/:id': this.webinarDetailPage.bind(this),
            '/create-webinar': this.createWebinarPage.bind(this),
            '/profile': this.profilePage.bind(this),
            '/admin': this.adminPage.bind(this)
        };
        
        // Обработка изменения URL
        window.addEventListener('popstate', () => this.handleRoute());
        
        // Инициальная загрузка
        this.handleRoute();
    }
    
    navigate(path) {
        window.history.pushState({}, '', path);
        this.handleRoute();
    }
    
    handleRoute() {
        const path = window.location.pathname;
        this.currentPath = path;
        
        // Найти подходящий маршрут
        let routeHandler = null;
        let params = {};
        
        for (const route in this.routes) {
            if (route.includes(':')) {
                // Параметризованный маршрут
                const routeParts = route.split('/');
                const pathParts = path.split('/');
                
                if (routeParts.length === pathParts.length) {
                    let match = true;
                    const routeParams = {};
                    
                    for (let i = 0; i < routeParts.length; i++) {
                        if (routeParts[i].startsWith(':')) {
                            const paramName = routeParts[i].substring(1);
                            routeParams[paramName] = pathParts[i];
                        } else if (routeParts[i] !== pathParts[i]) {
                            match = false;
                            break;
                        }
                    }
                    
                    if (match) {
                        routeHandler = this.routes[route];
                        params = routeParams;
                        break;
                    }
                }
            } else if (route === path) {
                routeHandler = this.routes[route];
                break;
            }
        }
        
        // Если маршрут не найден, использовать домашнюю страницу
        if (!routeHandler && path === '/') {
            routeHandler = this.routes['/'];
        } else if (!routeHandler) {
            routeHandler = this.notFoundPage.bind(this);
        }
        
        // Выполнить обработчик маршрута
        routeHandler(params);
    }
    
    async homePage() {
        const mainContent = document.getElementById('main-content');
        
        // Проверить аутентификацию
        const user = await this.app.auth.getCurrentUser();
        
        if (user) {
            // Перенаправить на дашборд для авторизованных пользователей
            this.navigate('/dashboard');
            return;
        }
        
        mainContent.innerHTML = `
            <section class="hero">
                <div class="container">
                    <div class="hero-content">
                        <h1>Профессиональная платформа для вебинаров</h1>
                        <p>Проводите и посещайте онлайн-мероприятия с высоким качеством видео, интерактивным чатом и мощными инструментами аналитики</p>
                        <div class="hero-buttons">
                            <a href="#!" class="btn btn-primary btn-lg" id="start-webinar-btn">Начать вебинар</a>
                            <a href="#!" class="btn btn-outline btn-lg" id="join-webinar-btn">Присоединиться</a>
                        </div>
                    </div>
                    <div class="hero-image">
                        <img src="https://images.unsplash.com/photo-1556761175-b413da4baf72?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Вебинар платформа">
                    </div>
                </div>
            </section>
            
            <section class="features">
                <div class="container">
                    <h2 class="section-title">Почему выбирают нашу платформу?</h2>
                    <div class="features-grid">
                        <div class="feature-card">
                            <div class="feature-icon">
                                <i class="fas fa-video"></i>
                            </div>
                            <h3>Высокое качество видео</h3>
                            <p>HD видео и чистое аудио для комфортного общения</p>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <i class="fas fa-comments"></i>
                            </div>
                            <h3>Интерактивный чат</h3>
                            <p>Общайтесь с участниками, задавайте вопросы и получайте ответы в реальном времени</p>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <i class="fas fa-chart-line"></i>
                            </div>
                            <h3>Детальная аналитика</h3>
                            <p>Отслеживайте посещаемость, активность участников и получайте отчеты</p>
                        </div>
                        <div class="feature-card">
                            <div class="feature-icon">
                                <i class="fas fa-cloud-upload-alt"></i>
                            </div>
                            <h3>Запись и хранение</h3>
                            <p>Автоматическая запись вебинаров и безопасное хранение записей</p>
                        </div>
                    </div>
                </div>
            </section>
            
            <section class="cta">
                <div class="container">
                    <h2>Готовы начать?</h2>
                    <p>Присоединяйтесь к тысячам организаторов, которые уже используют нашу платформу</p>
                    <div class="cta-buttons">
                        <a href="/register" class="btn btn-primary btn-lg">Зарегистрироваться бесплатно</a>
                        <a href="/login" class="btn btn-outline btn-lg">Войти в аккаунт</a>
                    </div>
                </div>
            </section>
        `;
        
        // Добавить обработчики событий
        document.getElementById('start-webinar-btn').addEventListener('click', (e) => {
            e.preventDefault();
            this.navigate('/login');
        });
        
        document.getElementById('join-webinar-btn').addEventListener('click', (e) => {
            e.preventDefault();
            this.navigate('/webinars');
        });
    }
    
    loginPage() {
        const mainContent = document.getElementById('main-content');
        
        mainContent.innerHTML = `
            <div class="auth-container">
                <div class="auth-card">
                    <h2 class="auth-title">Вход в аккаунт</h2>
                    <form id="login-form">
                        <div class="form-group">
                            <label for="email">Email</label>
                            <input type="email" id="email" name="email" required>
                        </div>
                        <div class="form-group">
                            <label for="password">Пароль</label>
                            <input type="password" id="password" name="password" required>
                        </div>
                        <button type="submit" class="btn btn-primary btn-block">Войти</button>
                    </form>
                    <div class="auth-links">
                        <p>Нет аккаунта? <a href="/register">Зарегистрироваться</a></p>
                        <p><a href="/">Вернуться на главную</a></p>
                    </div>
                    <div id="login-error" class="error-message"></div>
                </div>
            </div>
        `;
        
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            const result = await this.app.login(email, password);
            
            if (result.success) {
                this.navigate('/dashboard');
            } else {
                document.getElementById('login-error').textContent = result.error;
            }
        });
    }
    
    registerPage() {
        const mainContent = document.getElementById('main-content');
        
        mainContent.innerHTML = `
            <div class="auth-container">
                <div class="auth-card">
                    <h2 class="auth-title">Регистрация</h2>
                    <form id="register-form">
                        <div class="form-group">
                            <label for="name">Имя</label>
                            <input type="text" id="name" name="name" required>
                        </div>
                        <div class="form-group">
                            <label for="email">Email</label>
                            <input type="email" id="email" name="email" required>
                        </div>
                        <div class="form-group">
                            <label for="password">Пароль</label>
                            <input type="password" id="password" name="password" required minlength="6">
                        </div>
                        <div class="form-group">
                            <label for="role">Роль</label>
                            <select id="role" name="role">
                                <option value="participant">Участник</option>
                                <option value="speaker">Спикер</option>
                                <option value="organizer">Организатор</option>
                            </select>
                        </div>
                        <button type="submit" class="btn btn-primary btn-block">Зарегистрироваться</button>
                    </form>
                    <div class="auth-links">
                        <p>Уже есть аккаунт? <a href="/login">Войти</a></p>
                        <p><a href="/">Вернуться на главную</a></p>
                    </div>
                    <div id="register-error" class="error-message"></div>
                </div>
            </div>
        `;
        
        document.getElementById('register-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                password: document.getElementById('password').value,
                role: document.getElementById('role').value
            };
            
            const result = await this.app.auth.register(formData);
            
            if (result.success) {
                this.app.currentUser = result.user;
                this.app.ui.loadNavbar(result.user);
                this.navigate('/dashboard');
            } else {
                document.getElementById('register-error').textContent = result.error;
            }
        });
    }
    
    async dashboardPage() {
        if (!await this.requireAuth()) return;
        
        const mainContent = document.getElementById('main-content');
        
        // Загрузить данные пользователя и вебинары
        const user = this.app.currentUser;
        const webinars = await this.fetchWebinars();
        const stats = await this.fetchUserStats();
        
        mainContent.innerHTML = `
            <div class="dashboard-container">
                <div class="dashboard-header">
                    <h1>Добро пожаловать, ${user.name}!</h1>
                    <p>Панель управления вашими вебинарами</p>
                </div>
                
                <div class="dashboard-stats">
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-calendar-check"></i>
                        </div>
                        <div class="stat-info">
                            <h3>${stats.webinarsRegistered || 0}</h3>
                            <p>Зарегистрировано вебинаров</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-user-check"></i>
                        </div>
                        <div class="stat-info">
                            <h3>${stats.webinarsAttended || 0}</h3>
                            <p>Посещено вебинаров</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-comment"></i>
                        </div>
                        <div class="stat-info">
                            <h3>${stats.messagesSent || 0}</h3>
                            <p>Сообщений отправлено</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-question-circle"></i>
                        </div>
                        <div class="stat-info">
                            <h3>${stats.questionsAsked || 0}</h3>
                            <p>Вопросов задано</p>
                        </div>
                    </div>
                </div>
                
                <div class="dashboard-actions">
                    ${user.role === 'organizer' || user.role === 'speaker' ? 
                        `<a href="/create-webinar" class="btn btn-primary">
                            <i class="fas fa-plus"></i> Создать вебинар
                        </a>` : ''}
                    <a href="/webinars" class="btn btn-outline">
                        <i class="fas fa-search"></i> Найти вебинары
                    </a>
                </div>
                
                <div class="dashboard-section">
                    <h2>Мои вебинары</h2>
                    ${webinars.length > 0 ? 
                        `<div class="webinars-grid">
                            ${webinars.slice(0, 3).map(webinar => `
                                <div class="webinar-card">
                                    <div class="webinar-header">
                                        <span class="webinar-status ${webinar.status}">${this.getStatusText(webinar.status)}</span>
                                        <h3>${webinar.title}</h3>
                                    </div>
                                    <div class="webinar-info">
                                        <p><i class="far fa-calendar"></i> ${new Date(webinar.start_time).toLocaleString()}</p>
                                        <p><i class="far fa-clock"></i> ${webinar.duration} мин.</p>
                                        <p><i class="fas fa-users"></i> ${webinar.registered_count || 0} участников</p>
                                    </div>
                                    <div class="webinar-actions">
                                        <a href="/webinars/${webinar.id}" class="btn btn-sm btn-outline">Подробнее</a>
                                        ${webinar.status === 'scheduled' || webinar.status === 'live' ? 
                                            `<button class="btn btn-sm btn-primary join-btn" data-id="${webinar.id}">Присоединиться</button>` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        ${webinars.length > 3 ? 
                            `<div class="text-center">
                                <a href="/webinars" class="btn btn-outline">Показать все вебинары</a>
                            </div>` : ''}` : 
                        `<div class="empty-state">
                            <i class="fas fa-video-slash"></i>
                            <h3>У вас пока нет вебинаров</h3>
                            <p>Создайте свой первый вебинар или присоединитесь к существующему</p>
                            <a href="/create-webinar" class="btn btn-primary">Создать вебинар</a>
                        </div>`}
                </div>
            </div>
        `;
        
        // Добавить обработчики событий
        document.querySelectorAll('.join-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const webinarId = e.target.dataset.id;
                this.navigate(`/webinars/${webinarId}`);
            });
        });
    }
    
    async webinarsPage() {
        if (!await this.requireAuth()) return;
        
        const mainContent = document.getElementById('main-content');
        
        // Загрузить вебинары
        const webinars = await this.fetchWebinars();
        
        mainContent.innerHTML = `
            <div class="container">
                <div class="page-header">
                    <h1>Все вебинары</h1>
                    <p>Присоединяйтесь к предстоящим мероприятиям</p>
                </div>
                
                <div class="webinars-filters">
                    <div class="filter-group">
                        <label for="status-filter">Статус:</label>
                        <select id="status-filter">
                            <option value="all">Все</option>
                            <option value="scheduled">Запланированные</option>
                            <option value="live">В прямом эфире</option>
                            <option value="ended">Завершенные</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label for="sort-filter">Сортировка:</label>
                        <select id="sort-filter">
                            <option value="newest">Сначала новые</option>
                            <option value="oldest">Сначала старые</option>
                            <option value="soonest">Ближайшие</option>
                        </select>
                    </div>
                </div>
                
                <div class="webinars-grid" id="webinars-list">
                    ${webinars.length > 0 ? 
                        webinars.map(webinar => `
                            <div class="webinar-card" data-status="${webinar.status}">
                                <div class="webinar-header">
                                    <span class="webinar-status ${webinar.status}">${this.getStatusText(webinar.status)}</span>
                                    <h3>${webinar.title}</h3>
                                </div>
                                <div class="webinar-info">
                                    <p><i class="far fa-calendar"></i> ${new Date(webinar.start_time).toLocaleString()}</p>
                                    <p><i class="far fa-clock"></i> ${webinar.duration} мин.</p>
                                    <p><i class="fas fa-user"></i> ${webinar.organizer_name || 'Не указан'}</p>
                                    <p><i class="fas fa-users"></i> ${webinar.registered_count || 0} участников</p>
                                </div>
                                <div class="webinar-description">
                                    <p>${webinar.description || 'Описание отсутствует'}</p>
                                </div>
                                <div class="webinar-actions">
                                    <a href="/webinars/${webinar.id}" class="btn btn-sm btn-outline">Подробнее</a>
                                    ${webinar.status === 'scheduled' || webinar.status === 'live' ? 
                                        `<button class="btn btn-sm btn-primary join-btn" data-id="${webinar.id}">Присоединиться</button>` : ''}
                                </div>
                            </div>
                        `).join('') : 
                        `<div class="empty-state">
                            <i class="fas fa-video-slash"></i>
                            <h3>Вебинары не найдены</h3>
                            <p>На данный момент нет доступных вебинаров</p>
                        </div>`}
                </div>
            </div>
        `;
        
        // Добавить обработчики фильтров
        document.getElementById('status-filter').addEventListener('change', this.filterWebinars.bind(this));
        document.getElementById('sort-filter').addEventListener('change', this.filterWebinars.bind(this));
        
        // Добавить обработчики кнопок "Присоединиться"
        document.querySelectorAll('.join-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const webinarId = e.target.dataset.id;
                this.navigate(`/webinars/${webinarId}`);
            });
        });
    }
    
    async webinarDetailPage(params) {
        if (!await this.requireAuth()) return;
        
        const mainContent = document.getElementById('main-content');
        const webinarId = params.id;
        
        // Загрузить данные вебинара
        const webinar = await this.fetchWebinar(webinarId);
        
        if (!webinar) {
            mainContent.innerHTML = `
                <div class="container">
                    <div class="error-state">
                        <i class="fas fa-exclamation-circle"></i>
                        <h2>Вебинар не найден</h2>
                        <p>Запрошенный вебинар не существует или у вас нет к нему доступа</p>
                        <a href="/webinars" class="btn btn-primary">Вернуться к списку вебинаров</a>
                    </div>
                </div>
            `;
            return;
        }
        
        // Проверить, является ли пользователь организатором или спикером
        const isOrganizerOrSpeaker = 
            this.app.currentUser.role === 'organizer' || 
            this.app.currentUser.role === 'speaker' ||
            this.app.currentUser.id === webinar.organizer_id ||
            this.app.currentUser.id === webinar.speaker_id;
        
        mainContent.innerHTML = `
            <div class="webinar-detail-container">
                <div class="webinar-detail-header">
                    <div class="container">
                        <a href="/webinars" class="back-link"><i class="fas fa-arrow-left"></i> Назад к списку</a>
                        <h1>${webinar.title}</h1>
                        <div class="webinar-meta">
                            <span class="status-badge ${webinar.status}">${this.getStatusText(webinar.status)}</span>
                            <span><i class="far fa-calendar"></i> ${new Date(webinar.start_time).toLocaleString()}</span>
                            <span><i class="far fa-clock"></i> ${webinar.duration} минут</span>
                            <span><i class="fas fa-user"></i> ${webinar.organizer_name}</span>
                            ${webinar.speaker_name ? `<span><i class="fas fa-microphone"></i> ${webinar.speaker_name}</span>` : ''}
                        </div>
                    </div>
                </div>
                
                <div class="container">
                    <div class="webinar-detail-content">
                        <div class="webinar-main">
                            <div class="webinar-description">
                                <h2>Описание</h2>
                                <p>${webinar.description || 'Описание отсутствует'}</p>
                            </div>
                            
                            <!-- Контрольная панель организатора -->
                            ${isOrganizerOrSpeaker ? `
                                <div class="organizer-controls" style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef;">
                                    <h3 style="margin-top: 0; color: #4361ee;">Управление вебинаром</h3>
                                    <div class="organizer-buttons" style="display: flex; gap: 10px;">
                                        ${webinar.status === 'scheduled' ? 
                                            `<button id="start-webinar-btn" class="btn btn-success">
                                                <i class="fas fa-play"></i> Запустить вебинар
                                            </button>` : ''}
                                        ${webinar.status === 'live' ? 
                                            `<button id="end-webinar-btn" class="btn btn-danger">
                                                <i class="fas fa-stop"></i> Завершить вебинар
                                            </button>` : ''}
                                    </div>
                                </div>
                            ` : ''}
                            
                            <div class="webinar-actions-panel">
                                ${webinar.status === 'live' || webinar.status === 'scheduled' ? 
                                    `<div class="action-buttons">
                                        ${webinar.is_registered ? 
                                            `<button id="join-webinar-btn" class="btn btn-primary btn-lg">
                                                <i class="fas fa-video"></i> Присоединиться к вебинару
                                            </button>` :
                                            `<button id="register-webinar-btn" class="btn btn-primary btn-lg">
                                                <i class="fas fa-user-plus"></i> Зарегистрироваться
                                            </button>`
                                        }
                                        ${isOrganizerOrSpeaker ? 
                                            `<button id="manage-webinar-btn" class="btn btn-outline btn-lg">
                                                <i class="fas fa-cog"></i> Управление
                                            </button>` : ''}
                                    </div>` : 
                                    `<div class="action-buttons">
                                        ${webinar.recordings && webinar.recordings.length > 0 ? 
                                            `<a href="${webinar.recordings[0].url}" class="btn btn-primary btn-lg" target="_blank">
                                                <i class="fas fa-play"></i> Смотреть запись
                                            </a>` : 
                                            `<button class="btn btn-primary btn-lg" disabled>
                                                <i class="fas fa-play"></i> Запись недоступна
                                            </button>`
                                        }
                                    </div>`
                                }
                                
                                <div class="webinar-stats">
                                    <div class="stat">
                                        <h3>${webinar.registered_count || 0}</h3>
                                        <p>Зарегистрировано</p>
                                    </div>
                                    <div class="stat">
                                        <h3>${webinar.attended_count || 0}</h3>
                                        <p>Посетило</p>
                                    </div>
                                    <div class="stat">
                                        <h3>${webinar.duration}</h3>
                                        <p>Длительность (мин)</p>
                                    </div>
                                </div>
                            </div>
                            
                            ${webinar.schedules && webinar.schedules.length > 0 ? `
                                <div class="webinar-schedule">
                                    <h2>Расписание</h2>
                                    <div class="schedule-list">
                                        ${webinar.schedules.map(session => `
                                            <div class="schedule-item">
                                                <div class="session-time">
                                                    <span>${new Date(session.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                    <span>-</span>
                                                    <span>${new Date(session.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                </div>
                                                <div class="session-details">
                                                    <h4>${session.session_title}</h4>
                                                    ${session.speaker_id ? `<p>Спикер: ${session.speaker_name || 'Не указан'}</p>` : ''}
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>` : ''}
                            
                            ${webinar.recordings && webinar.recordings.length > 0 ? `
                                <div class="webinar-recordings">
                                    <h2>Записи вебинара</h2>
                                    <div class="recordings-list">
                                        ${webinar.recordings.map(recording => `
                                            <div class="recording-item">
                                                <div class="recording-info">
                                                    <i class="fas fa-video"></i>
                                                    <div>
                                                        <h4>Запись вебинара</h4>
                                                        <p>${recording.duration ? `Длительность: ${recording.duration} мин.` : ''}</p>
                                                    </div>
                                                </div>
                                                <a href="${recording.url}" class="btn btn-sm btn-outline" target="_blank">
                                                    <i class="fas fa-play"></i> Смотреть
                                                </a>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>` : ''}
                        </div>
                        
                        <div class="webinar-sidebar">
                            <div class="sidebar-card">
                                <h3>Участники</h3>
                                <div id="participants-list">
                                    <div class="loading">Загрузка...</div>
                                </div>
                            </div>
                            
                            <div class="sidebar-card">
                                <h3>Чат вебинара</h3>
                                <div class="chat-container" id="chat-container">
                                    <div class="chat-messages" id="chat-messages"></div>
                                    <div class="chat-input">
                                        <input type="text" id="chat-input" placeholder="Введите сообщение...">
                                        <button id="send-message-btn"><i class="fas fa-paper-plane"></i></button>
                                    </div>
                                    <div class="chat-options">
                                        <label>
                                            <input type="checkbox" id="is-question"> Это вопрос
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Jitsi Meet контейнер (будет показан при присоединении) -->
                <div id="jitsi-container" class="jitsi-container" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: white; z-index: 1000;">
                    <div class="jitsi-header" style="padding: 15px; background: #4361ee; color: white; display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin: 0;">Вебинар: ${webinar.title}</h3>
                        <button id="close-jitsi" class="btn btn-sm btn-outline" style="background: white; color: #4361ee;">
                            <i class="fas fa-times"></i> Закрыть
                        </button>
                    </div>
                    
                    <!-- Контейнер для iframe -->
                    <div id="jitsi-meet" style="width: 100%; height: calc(100% - 60px);"></div>
                </div>
            </div>
        `;
        
        // Загрузить участников
        this.loadParticipants(webinarId);
        
        // Инициализировать чат
        this.initChat(webinarId);
        
        // Добавить обработчики событий
        if (document.getElementById('start-webinar-btn')) {
            document.getElementById('start-webinar-btn').addEventListener('click', async () => {
                try {
                    const response = await fetch(`http://localhost:5000/api/webinars/${webinarId}/start`, {
                        method: 'POST',
                        credentials: 'include'
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        alert('Вебинар успешно запущен!');
                        // Автоматически присоединиться
                        this.joinWebinar(webinar);
                    } else {
                        const errorData = await response.json();
                        alert(`Ошибка: ${errorData.error}`);
                    }
                } catch (error) {
                    alert('Ошибка сети при запуске вебинара');
                    console.error('Error starting webinar:', error);
                }
            });
        }
        
        if (document.getElementById('end-webinar-btn')) {
            document.getElementById('end-webinar-btn').addEventListener('click', async () => {
                if (confirm('Вы уверены, что хотите завершить вебинар?')) {
                    try {
                        const response = await fetch(`http://localhost:5000/api/webinars/${webinarId}/status`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: 'ended' }),
                            credentials: 'include'
                        });
                        
                        if (response.ok) {
                            alert('Вебинар завершен!');
                            location.reload();
                        } else {
                            const data = await response.json();
                            alert(`Ошибка: ${data.error}`);
                        }
                    } catch (error) {
                        alert('Ошибка сети');
                    }
                }
            });
        }
        
        if (document.getElementById('join-webinar-btn')) {
    document.getElementById('join-webinar-btn').addEventListener('click', () => {
        console.log('✅ Кнопка "Присоединиться" нажата!');
        console.log('Webinar object:', webinar);
        this.joinWebinar(webinar);
    });
}
        
        if (document.getElementById('register-webinar-btn')) {
            document.getElementById('register-webinar-btn').addEventListener('click', async () => {
                await this.registerForWebinar(webinarId);
                location.reload(); // Обновить страницу для обновления состояния
            });
        }
        
        if (document.getElementById('close-jitsi')) {
            document.getElementById('close-jitsi').addEventListener('click', () => {
                this.closeJitsi();
            });
        }
    }
    
    async createWebinarPage() {
        if (!await this.requireAuth()) return;
        if (!await this.requireRole(['organizer', 'speaker'])) return;
        
        const mainContent = document.getElementById('main-content');
        
        mainContent.innerHTML = `
            <div class="container">
            <div class="page-header">
                <h1>Создание вебинара</h1>
                <p>Заполните информацию о вашем мероприятии</p>
            </div>
            
            <div class="create-webinar-form">
                <form id="webinar-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="title">Название вебинара *</label>
                            <input type="text" id="title" name="title" required>
                        </div>
                        <div class="form-group">
                            <label for="duration">Длительность (минут) *</label>
                            <input type="number" id="duration" name="duration" min="15" max="480" value="60" required>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="description">Описание</label>
                        <textarea id="description" name="description" rows="4"></textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="start_time">Дата и время начала *</label>
                            <input type="datetime-local" id="start_time" name="start_time" required>
                        </div>
                        <div class="form-group">
                            <label for="max_participants">Максимальное количество участников</label>
                            <input type="number" id="max_participants" name="max_participants" min="1">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="speaker_id">Спикер (опционально)</label>
                        <select id="speaker_id" name="speaker_id">
                            <option value="">Выберите спикера</option>
                            <!-- Спикеры будут загружены динамически -->
                        </select>
                    </div>
                    
                    <!-- НАСТРОЙКИ ДОСТУПА И КОНФЕРЕНЦИИ -->
                    <div class="settings-section">
                        <h3>Настройки доступа к вебинару</h3>
                        
                        <div class="form-group">
                            <label for="access_type">Тип доступа *</label>
                            <select id="access_type" name="access_type" required>
                                <option value="open">Открытый (любой может присоединиться)</option>
                                <option value="members_only">Только для участников (требуется регистрация)</option>
                                <option value="password">С паролем</option>
                            </select>
                        </div>
                        
                        <div id="password-field" style="display: none;">
                            <div class="form-group">
                                <label for="room_password">Пароль комнаты</label>
                                <input type="password" id="room_password" name="room_password" placeholder="Введите пароль для доступа">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="require_moderator" name="require_moderator">
                                <span>Требовать присутствия модератора</span>
                            </label>
                            <small>Если включено, участники будут ждать в лобби до входа модератора</small>
                        </div>
                        
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="enable_recording" name="enable_recording" checked>
                                <span>Включить запись вебинара</span>
                            </label>
                        </div>
                        
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="enable_chat" name="enable_chat" checked>
                                <span>Включить чат</span>
                            </label>
                        </div>
                        
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="enable_screen_sharing" name="enable_screen_sharing" checked>
                                <span>Разрешить демонстрацию экрана</span>
                            </label>
                        </div>
                        
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="mute_on_start" name="mute_on_start" checked>
                                <span>Микрофоны участников выключены при входе</span>
                            </label>
                        </div>
                    </div>
                    <!-- КОНЕЦ НАСТРОЕК ДОСТУПА -->
                    
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Создать вебинар</button>
                        <a href="/dashboard" class="btn btn-outline">Отмена</a>
                    </div>
                </form>
            </div>
        </div>
        
        <style>
            .settings-section {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
                border: 1px solid #e9ecef;
            }
            
            .settings-section h3 {
                margin-top: 0;
                color: #4361ee;
                border-bottom: 2px solid #4361ee;
                padding-bottom: 10px;
                margin-bottom: 20px;
            }
            
            .checkbox-label {
                display: flex;
                align-items: center;
                cursor: pointer;
            }
            
            .checkbox-label input {
                margin-right: 10px;
            }
            
            .checkbox-label span {
                font-weight: 500;
            }
            
            small {
                display: block;
                margin-top: 5px;
                color: #6c757d;
                font-size: 0.9em;
            }
        </style>
    `;
        
        // Установить минимальную дату (текущее время + 1 час)
        const now = new Date();
        now.setHours(now.getHours() + 1);
        const minDate = now.toISOString().slice(0, 16);
        document.getElementById('start_time').min = minDate;
        
        // Обработчик изменения типа доступа
        const accessTypeSelect = document.getElementById('access_type');
        if (accessTypeSelect) {
            accessTypeSelect.addEventListener('change', function() {
                const passwordField = document.getElementById('password-field');
                if (this.value === 'password') {
                    passwordField.style.display = 'block';
                } else {
                    passwordField.style.display = 'none';
                }
            });
        }
        
        // Загрузить спикеров
        await this.loadSpeakers();
        
        // Обработчик формы
        document.getElementById('webinar-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                title: document.getElementById('title').value,
                description: document.getElementById('description').value,
                start_time: document.getElementById('start_time').value,
                duration: parseInt(document.getElementById('duration').value),
                max_participants: document.getElementById('max_participants').value || null,
                speaker_id: document.getElementById('speaker_id').value || null,
                access_type: document.getElementById('access_type').value,
                room_password: document.getElementById('room_password')?.value || null,
                require_moderator: document.getElementById('require_moderator').checked,
                enable_recording: document.getElementById('enable_recording').checked,
                enable_chat: document.getElementById('enable_chat').checked,
                enable_screen_sharing: document.getElementById('enable_screen_sharing').checked,
                mute_on_start: document.getElementById('mute_on_start').checked
            };
            
             // Валидация пароля
        if (formData.access_type === 'password' && !formData.room_password) {
            alert('Для типа доступа "С паролем" необходимо указать пароль комнаты');
            return;
        }

           const result = await this.createWebinar(formData);
        
        if (result.success) {
            alert('Вебинар успешно создан!');
            this.navigate(`/webinars/${result.webinar.id}`);
        } else {
            alert(`Ошибка: ${result.error}`);
        }
    });
}
    
    async profilePage() {
        if (!await this.requireAuth()) return;
        
        const mainContent = document.getElementById('main-content');
        const user = this.app.currentUser;
        
        mainContent.innerHTML = `
            <div class="container">
                <div class="page-header">
                    <h1>Мой профиль</h1>
                    <p>Управление личной информацией</p>
                </div>
                
                <div class="profile-container">
                    <div class="profile-card">
                        <div class="profile-header">
                            <div class="profile-avatar">
                                <i class="fas fa-user-circle"></i>
                            </div>
                            <div class="profile-info">
                                <h2>${user.name}</h2>
                                <p class="profile-role">${this.getRoleText(user.role)}</p>
                                <p class="profile-email">${user.email}</p>
                            </div>
                        </div>
                        
                        <form id="profile-form">
                            <div class="form-group">
                                <label for="profile-name">Имя</label>
                                <input type="text" id="profile-name" value="${user.name}" required>
                            </div>
                            <div class="form-group">
                                <label for="profile-avatar">URL аватара</label>
                                <input type="text" id="profile-avatar" value="${user.avatar || ''}" placeholder="https://example.com/avatar.jpg">
                            </div>
                            <div class="form-actions">
                                <button type="submit" class="btn btn-primary">Сохранить изменения</button>
                            </div>
                        </form>
                    </div>
                    
                    <div class="profile-stats">
                        <h3>Статистика</h3>
                        <div class="stats-grid">
                            <div class="stat-item">
                                <div class="stat-value" id="total-webinars">0</div>
                                <div class="stat-label">Всего вебинаров</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value" id="attended-webinars">0</div>
                                <div class="stat-label">Посещено</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value" id="total-messages">0</div>
                                <div class="stat-label">Сообщений</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value" id="total-questions">0</div>
                                <div class="stat-label">Вопросов</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Загрузить статистику
        const stats = await this.fetchUserStats();
        document.getElementById('total-webinars').textContent = stats.webinarsRegistered || 0;
        document.getElementById('attended-webinars').textContent = stats.webinarsAttended || 0;
        document.getElementById('total-messages').textContent = stats.messagesSent || 0;
        document.getElementById('total-questions').textContent = stats.questionsAsked || 0;
        
        // Обработчик формы профиля
        document.getElementById('profile-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const updates = {
                name: document.getElementById('profile-name').value,
                avatar: document.getElementById('profile-avatar').value || null
            };
            
            const result = await this.updateProfile(updates);
            
            if (result.success) {
                alert('Профиль успешно обновлен!');
                this.app.currentUser = { ...this.app.currentUser, ...updates };
                this.app.ui.loadNavbar(this.app.currentUser);
            } else {
                alert(`Ошибка: ${result.error}`);
            }
        });
    }
    
    async adminPage() {
        if (!await this.requireAuth()) return;
        if (!await this.requireRole(['organizer'])) return;
        
        const mainContent = document.getElementById('main-content');
        
        // Загрузить статистику администратора
        const stats = await this.fetchAdminStats();
        
        mainContent.innerHTML = `
            <div class="container">
                <div class="page-header">
                    <h1>Панель администратора</h1>
                    <p>Управление платформой и аналитика</p>
                </div>
                
                <div class="admin-stats">
                    <div class="admin-stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-video"></i>
                        </div>
                        <div class="stat-info">
                            <h3>${stats.totalWebinars || 0}</h3>
                            <p>Всего вебинаров</p>
                        </div>
                    </div>
                    <div class="admin-stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-users"></i>
                        </div>
                        <div class="stat-info">
                            <h3>${stats.totalUsers || 0}</h3>
                            <p>Всего пользователей</p>
                        </div>
                    </div>
                    <div class="admin-stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-user-check"></i>
                        </div>
                        <div class="stat-info">
                            <h3>${stats.totalRegistrations || 0}</h3>
                            <p>Всего регистраций</p>
                        </div>
                    </div>
                    <div class="admin-stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-broadcast-tower"></i>
                        </div>
                        <div class="stat-info">
                            <h3>${stats.activeWebinars || 0}</h3>
                            <p>Активных вебинаров</p>
                        </div>
                    </div>
                </div>
                
                <div class="admin-tabs">
                    <div class="tab-headers">
                        <button class="tab-header active" data-tab="reports">Отчеты</button>
                        <button class="tab-header" data-tab="users">Пользователи</button>
                        <button class="tab-header" data-tab="moderation">Модерация</button>
                    </div>
                    
                    <div class="tab-content active" id="reports-tab">
                        <h3>Отчеты по посещаемости</h3>
                        <div class="reports-controls">
                            <div class="form-group">
                                <label for="report-start">Начальная дата</label>
                                <input type="date" id="report-start">
                            </div>
                            <div class="form-group">
                                <label for="report-end">Конечная дата</label>
                                <input type="date" id="report-end">
                            </div>
                            <button id="generate-report" class="btn btn-primary">Сгенерировать отчет</button>
                        </div>
                        <div id="reports-content">
                            <p>Выберите период для генерации отчета</p>
                        </div>
                    </div>
                    
                    <div class="tab-content" id="users-tab">
                        <h3>Управление пользователями</h3>
                        <div id="users-list">
                            <div class="loading">Загрузка пользователей...</div>
                        </div>
                    </div>
                    
                    <div class="tab-content" id="moderation-tab">
                        <h3>Модерация контента</h3>
                        <div id="moderation-content">
                            <p>Выберите вебинар для модерации чата</p>
                            <div class="form-group">
                                <label for="moderation-webinar">Вебинар</label>
                                <select id="moderation-webinar">
                                    <option value="">Выберите вебинар</option>
                                </select>
                            </div>
                            <div id="moderation-messages" style="display: none;">
                                <h4>Сообщения чата</h4>
                                <div class="messages-list" id="moderation-messages-list"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Инициализация вкладок
        this.initAdminTabs();
        
        // Загрузить пользователи
        this.loadUsersForAdmin();
        
        // Загрузить вебинары для модерации
        this.loadWebinarsForModeration();
    }
    
    notFoundPage() {
        const mainContent = document.getElementById('main-content');
        
        mainContent.innerHTML = `
            <div class="container">
                <div class="error-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <h2>Страница не найдена</h2>
                    <p>Запрошенная страница не существует</p>
                    <a href="/" class="btn btn-primary">Вернуться на главную</a>
                </div>
            </div>
        `;
    }
    
    // ================ JITSI МЕТОДЫ ================
    
    async joinWebinar(webinar) {
        console.log('🚀 Метод joinWebinar ЗАПУЩЕН!');
    console.log('Jitsi комната:', webinar.jitsi_room);
    
    // 1. Показать контейнер
    const jitsiContainer = document.getElementById('jitsi-container');
    const content = document.querySelector('.webinar-detail-content');
    
    if (!jitsiContainer) {
        console.error('❌ Не найден контейнер jitsi-container!');
        alert('Ошибка: не найден контейнер для вебинара');
        return;
    }
    
    // Показать контейнер Jitsi, скрыть основное содержимое
    jitsiContainer.style.display = 'block';
    if (content) content.style.display = 'none';
    
    // 2. Создать iframe с Jitsi
    const roomName = encodeURIComponent(webinar.jitsi_room);
    const displayName = encodeURIComponent(this.app.currentUser?.name || 'Участник');
    
    console.log('Создаю iframe для комнаты:', roomName);
    
    const iframeHTML = `
        <iframe 
            src="https://meet.jit.si/${roomName}?userInfo.displayName=${displayName}"
            style="width:100%; height:100%; border:none; background:#f0f0f0;"
            allow="camera; microphone; display-capture; autoplay"
            allowfullscreen
            title="Вебинар: ${webinar.title}"
        ></iframe>
    `;
    
    const jitsiMeet = document.getElementById('jitsi-meet');
    if (jitsiMeet) {
        jitsiMeet.innerHTML = iframeHTML;
        console.log('✅ iframe создан и вставлен в jitsi-meet');
    } else {
        console.error('❌ Не найден контейнер jitsi-meet!');
        alert('Ошибка: не найден контейнер для видео');
    }
}
    
    // Метод для отправки уведомлений о входе
    async sendJoinNotification(webinarId) {
        try {
            const response = await fetch(`http://localhost:5000/api/webinars/${webinarId}/join-notification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.app.currentUser.id,
                    userName: this.app.currentUser.name
                }),
                credentials: 'include'
            });
            
            if (response.ok) {
                console.log('Join notification sent');
            }
        } catch (error) {
            console.error('Error sending join notification:', error);
        }
    }
    
    // Метод для закрытия Jitsi
    closeJitsi() {
        // Очистить контейнер
        document.getElementById('jitsi-meet').innerHTML = '';
        
        // Скрыть контейнер
        document.getElementById('jitsi-container').style.display = 'none';
        document.querySelector('.webinar-detail-content').style.display = 'flex';
    }
    
    // ================ ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ================
    
    async requireAuth() {
        const user = await this.app.auth.getCurrentUser();
        if (!user) {
            this.navigate('/login');
            return false;
        }
        return true;
    }
    
    async requireRole(roles) {
        const user = await this.app.auth.getCurrentUser();
        if (!user || !roles.includes(user.role)) {
            this.navigate('/dashboard');
            return false;
        }
        return true;
    }
    
    getStatusText(status) {
        const statusMap = {
            'scheduled': 'Запланирован',
            'live': 'В прямом эфире',
            'ended': 'Завершен',
            'cancelled': 'Отменен'
        };
        return statusMap[status] || status;
    }
    
    getRoleText(role) {
        const roleMap = {
            'organizer': 'Организатор',
            'speaker': 'Спикер',
            'participant': 'Участник'
        };
        return roleMap[role] || role;
    }
    
    async fetchWebinars() {
        try {
            const response = await fetch('http://localhost:5000/api/webinars', {
                method: 'GET',
                credentials: 'include'
            });
            
            if (response.ok) {
                return await response.json();
            }
            return [];
        } catch (error) {
            console.error('Error fetching webinars:', error);
            return [];
        }
    }
    
    async fetchWebinar(id) {
        try {
            const response = await fetch(`http://localhost:5000/api/webinars/${id}`, {
                method: 'GET',
                credentials: 'include'
            });
            
            if (response.ok) {
                return await response.json();
            }
            return null;
        } catch (error) {
            console.error('Error fetching webinar:', error);
            return null;
        }
    }
    
    async fetchUserStats() {
        try {
            const response = await fetch('http://localhost:5000/api/users/my-stats', {
                method: 'GET',
                credentials: 'include'
            });
            
            if (response.ok) {
                return await response.json();
            }
            return {};
        } catch (error) {
            console.error('Error fetching user stats:', error);
            return {};
        }
    }
    
    async fetchAdminStats() {
        try {
            const response = await fetch('http://localhost:5000/api/admin/stats', {
                method: 'GET',
                credentials: 'include'
            });
            
            if (response.ok) {
                return await response.json();
            }
            return {};
        } catch (error) {
            console.error('Error fetching admin stats:', error);
            return {};
        }
    }
    
    async loadParticipants(webinarId) {
        try {
            const response = await fetch(`http://localhost:5000/api/webinars/${webinarId}/participants`, {
                method: 'GET',
                credentials: 'include'
            });
            
            if (response.ok) {
                const participants = await response.json();
                const participantsList = document.getElementById('participants-list');
                
                if (participants.length > 0) {
                    participantsList.innerHTML = participants.map(p => `
                        <div class="participant-item">
                            <div class="participant-avatar">
                                <i class="fas fa-user-circle"></i>
                            </div>
                            <div class="participant-info">
                                <h4>${p.name}</h4>
                                <p>${p.email}</p>
                                <p class="participant-status ${p.attended ? 'attended' : 'not-attended'}">
                                    ${p.attended ? 'Посетил' : 'Не посетил'}
                                </p>
                            </div>
                        </div>
                    `).join('');
                } else {
                    participantsList.innerHTML = '<p>Участники не найдены</p>';
                }
            }
        } catch (error) {
            console.error('Error loading participants:', error);
        }
    }
    
    async initChat(webinarId) {
        const chatMessages = document.getElementById('chat-messages');
        const chatInput = document.getElementById('chat-input');
        const sendButton = document.getElementById('send-message-btn');
        const isQuestionCheckbox = document.getElementById('is-question');
        
        // Подключиться к WebSocket
        const socket = this.app.connectToWebinar(webinarId);
        
        if (!socket) {
            console.error('WebSocket not connected');
            return;
        }
        
        // Обработчик получения истории чата
        socket.on('chat-history', (messages) => {
            if (!chatMessages) return;
            
            chatMessages.innerHTML = messages.map(msg => `
                <div class="message ${msg.is_question ? 'question' : ''} ${msg.user_id === (this.app && this.app.currentUser ? this.app.currentUser.id : null) ? 'own' : ''}
                    <div class="message-header">
                        <span class="message-author">${msg.user_name}</span>
                        <span class="message-time">${new Date(msg.created_at).toLocaleTimeString()}</span>
                        ${msg.is_question ? '<span class="question-badge">Вопрос</span>' : ''}
                        ${msg.answered ? '<span class="answered-badge">Отвечен</span>' : ''}
                    </div>
                    <div class="message-content">${msg.message}</div>
                </div>
            `).join('');
            
            // Прокрутить вниз
            chatMessages.scrollTop = chatMessages.scrollHeight;
        });
        
        // Обработчик нового сообщения
        socket.on('new-message', (message) => {
            if (!chatMessages) return;
            
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${message.is_question ? 'question' : ''} ${message.user_id === this.app.currentUser.id ? 'own' : ''}`;
            messageDiv.innerHTML = `
                <div class="message-header">
                    <span class="message-author">${message.user_name}</span>
                    <span class="message-time">${new Date(message.created_at).toLocaleTimeString()}</span>
                    ${message.is_question ? '<span class="question-badge">Вопрос</span>' : ''}
                    ${message.answered ? '<span class="answered-badge">Отвечен</span>' : ''}
                </div>
                <div class="message-content">${message.message}</div>
            `;
            
            chatMessages.appendChild(messageDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        });
        
        // Обработчик отправки сообщения
        const sendMessage = () => {
            const message = chatInput.value.trim();
            if (message && socket.connected) {
                socket.emit('send-message', {
                    webinarId: webinarId,
                    userId: this.app.currentUser.id,
                    message: message,
                    isQuestion: isQuestionCheckbox.checked
                });
                
                chatInput.value = '';
                isQuestionCheckbox.checked = false;
            }
        };
        
        if (sendButton) {
            sendButton.addEventListener('click', sendMessage);
        }
        
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    sendMessage();
                }
            });
        }
    }
    
    async registerForWebinar(webinarId) {
        try {
            const response = await fetch(`http://localhost:5000/api/webinars/${webinarId}/register`, {
                method: 'POST',
                credentials: 'include'
            });
            
            if (response.ok) {
                alert('Вы успешно зарегистрировались на вебинар!');
                return true;
            } else {
                const data = await response.json();
                alert(`Ошибка: ${data.error}`);
                return false;
            }
        } catch (error) {
            alert('Ошибка сети');
            return false;
        }
    }
    
    async loadSpeakers() {
        try {
            const response = await fetch('http://localhost:5000/api/users', {
                method: 'GET',
                credentials: 'include'
            });
            
            if (response.ok) {
                const users = await response.json();
                const speakers = users.filter(user => user.role === 'speaker');
                
                const select = document.getElementById('speaker_id');
                if (select) {
                    speakers.forEach(speaker => {
                        const option = document.createElement('option');
                        option.value = speaker.id;
                        option.textContent = speaker.name;
                        select.appendChild(option);
                    });
                }
            }
        } catch (error) {
            console.error('Error loading speakers:', error);
        }
    }
    
    async createWebinar(formData) {
        try {
            const response = await fetch('http://localhost:5000/api/webinars', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (response.ok) {
                return { success: true, webinar: data };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    }
    
    async updateProfile(updates) {
        try {
            const response = await fetch('http://localhost:5000/api/users/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (response.ok) {
                return { success: true };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    }
    
    filterWebinars() {
        const statusFilter = document.getElementById('status-filter')?.value;
        const sortFilter = document.getElementById('sort-filter')?.value;
        
        if (!statusFilter || !sortFilter) return;
        
        // Здесь будет логика фильтрации и сортировки вебинаров
        console.log('Filtering webinars:', { statusFilter, sortFilter });
    }
    
    // ================ АДМИН МЕТОДЫ ================
    
    initAdminTabs() {
        document.querySelectorAll('.tab-header').forEach(header => {
            header.addEventListener('click', () => {
                const tabId = header.dataset.tab;
                
                // Убрать активный класс со всех заголовков и контента
                document.querySelectorAll('.tab-header').forEach(h => h.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                // Добавить активный класс к выбранному заголовку и контенту
                header.classList.add('active');
                document.getElementById(`${tabId}-tab`)?.classList.add('active');
            });
        });
        
        // Обработчик генерации отчета
        const generateBtn = document.getElementById('generate-report');
        if (generateBtn) {
            generateBtn.addEventListener('click', async () => {
                const startDate = document.getElementById('report-start')?.value;
                const endDate = document.getElementById('report-end')?.value;
                
                if (!startDate || !endDate) {
                    alert('Пожалуйста, выберите начальную и конечную даты');
                    return;
                }
                
                try {
                    const response = await fetch(`http://localhost:5000/api/admin/attendance-reports?startDate=${startDate}&endDate=${endDate}`, {
                        method: 'GET',
                        credentials: 'include'
                    });
                    
                    if (response.ok) {
                        const reports = await response.json();
                        this.displayReports(reports);
                    }
                } catch (error) {
                    console.error('Error generating report:', error);
                }
            });
        }
    }
    
    displayReports(reports) {
        const reportsContent = document.getElementById('reports-content');
        if (!reportsContent) return;
        
        if (reports.length === 0) {
            reportsContent.innerHTML = '<p>Нет данных за выбранный период</p>';
            return;
        }
        
        let html = `
            <table class="reports-table">
                <thead>
                    <tr>
                        <th>Вебинар</th>
                        <th>Дата</th>
                        <th>Зарегистрировано</th>
                        <th>Посетило</th>
                        <th>Средняя длительность</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        reports.forEach(report => {
            html += `
                <tr>
                    <td>${report.title}</td>
                    <td>${new Date(report.start_time).toLocaleDateString()}</td>
                    <td>${report.total_registered}</td>
                    <td>${report.total_attended}</td>
                    <td>${report.avg_attendance_duration ? Math.round(report.avg_attendance_duration) + ' мин' : 'Н/Д'}</td>
                    <td>
                        <button class="btn btn-sm btn-outline view-report-btn" data-id="${report.id}">
                            Детали
                        </button>
                    </td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        
        reportsContent.innerHTML = html;
        
        // Добавить обработчики для кнопок "Детали"
        document.querySelectorAll('.view-report-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const webinarId = e.target.dataset.id;
                await this.showWebinarReport(webinarId);
            });
        });
    }
    
    async showWebinarReport(webinarId) {
        try {
            const response = await fetch(`http://localhost:5000/api/admin/webinar-report/${webinarId}`, {
                method: 'GET',
                credentials: 'include'
            });
            
            if (response.ok) {
                const report = await response.json();
                
                // Показать модальное окно с детальным отчетом
                const modalHtml = `
                    <div class="modal-overlay active">
                        <div class="modal">
                            <div class="modal-header">
                                <h3>Детальный отчет: ${report.title}</h3>
                                <button class="close-modal">&times;</button>
                            </div>
                            <div class="modal-body">
                                <div class="report-summary">
                                    <div class="summary-item">
                                        <h4>Дата проведения</h4>
                                        <p>${new Date(report.start_time).toLocaleString()}</p>
                                    </div>
                                    <div class="summary-item">
                                        <h4>Организатор</h4>
                                        <p>${report.organizer_name}</p>
                                    </div>
                                    <div class="summary-item">
                                        <h4>Спикер</h4>
                                        <p>${report.speaker_name || 'Не указан'}</p>
                                    </div>
                                    <div class="summary-item">
                                        <h4>Зарегистрировано</h4>
                                        <p>${report.total_participants} участников</p>
                                    </div>
                                    <div class="summary-item">
                                        <h4>Посетило</h4>
                                        <p>${report.attended_count} участников</p>
                                    </div>
                                    <div class="summary-item">
                                        <h4>Сообщений в чате</h4>
                                        <p>${report.total_messages} (${report.total_questions} вопросов, ${report.answered_questions} отвечено)</p>
                                    </div>
                                </div>
                                
                                <h4>Участники (${report.participants?.length || 0})</h4>
                                <div class="participants-table">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Имя</th>
                                                <th>Email</th>
                                                <th>Дата регистрации</th>
                                                <th>Посетил</th>
                                                <th>Время присутствия</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${report.participants?.map(p => `
                                                <tr>
                                                    <td>${p.name}</td>
                                                    <td>${p.email}</td>
                                                    <td>${new Date(p.registration_date).toLocaleDateString()}</td>
                                                    <td>${p.attended ? 'Да' : 'Нет'}</td>
                                                    <td>${p.attendance_duration || 0} мин</td>
                                                </tr>
                                            `).join('') || '<tr><td colspan="5">Нет данных об участниках</td></tr>'}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                
                const modalContainer = document.getElementById('modal-container');
                if (modalContainer) {
                    modalContainer.innerHTML = modalHtml;
                    
                    // Обработчик закрытия модального окна
                    document.querySelector('.close-modal')?.addEventListener('click', () => {
                        modalContainer.innerHTML = '';
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching webinar report:', error);
        }
    }
    
    async loadUsersForAdmin() {
        try {
            const response = await fetch('http://localhost:5000/api/admin/users', {
                method: 'GET',
                credentials: 'include'
            });
            
            if (response.ok) {
                const users = await response.json();
                const usersList = document.getElementById('users-list');
                
                if (!usersList) return;
                
                if (users.length > 0) {
                    let html = `
                        <table class="users-table">
                            <thead>
                                <tr>
                                    <th>Имя</th>
                                    <th>Email</th>
                                    <th>Роль</th>
                                    <th>Дата регистрации</th>
                                    <th>Действия</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;
                    
                    users.forEach(user => {
                        html += `
                            <tr>
                                <td>${user.name}</td>
                                <td>${user.email}</td>
                                <td>
                                    <select class="role-select" data-user-id="${user.id}">
                                        <option value="participant" ${user.role === 'participant' ? 'selected' : ''}>Участник</option>
                                        <option value="speaker" ${user.role === 'speaker' ? 'selected' : ''}>Спикер</option>
                                        <option value="organizer" ${user.role === 'organizer' ? 'selected' : ''}>Организатор</option>
                                    </select>
                                </td>
                                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                                <td>
                                    <button class="btn btn-sm btn-outline update-role-btn" data-user-id="${user.id}">
                                        Обновить
                                    </button>
                                </td>
                            </tr>
                        `;
                    });
                    
                    html += '</tbody></table>';
                    usersList.innerHTML = html;
                    
                    // Добавить обработчики для обновления ролей
                    document.querySelectorAll('.update-role-btn').forEach(button => {
                        button.addEventListener('click', async (e) => {
                            const userId = e.target.dataset.userId;
                            const select = document.querySelector(`.role-select[data-user-id="${userId}"]`);
                            const newRole = select.value;
                            
                            await this.updateUserRole(userId, newRole);
                        });
                    });
                } else {
                    usersList.innerHTML = '<p>Пользователи не найдены</p>';
                }
            }
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }
    
    async updateUserRole(userId, role) {
        try {
            const response = await fetch(`http://localhost:5000/api/admin/users/${userId}/role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role }),
                credentials: 'include'
            });
            
            if (response.ok) {
                alert('Роль пользователя успешно обновлена');
            } else {
                const data = await response.json();
                alert(`Ошибка: ${data.error}`);
            }
        } catch (error) {
            alert('Ошибка сети');
        }
    }
    
    async loadWebinarsForModeration() {
        try {
            const webinars = await this.fetchWebinars();
            const select = document.getElementById('moderation-webinar');
            
            if (!select) return;
            
            webinars.forEach(webinar => {
                const option = document.createElement('option');
                option.value = webinar.id;
                option.textContent = `${webinar.title} (${new Date(webinar.start_time).toLocaleDateString()})`;
                select.appendChild(option);
            });
            
            // Обработчик изменения выбора вебинара
            select.addEventListener('change', async (e) => {
                const webinarId = e.target.value;
                if (webinarId) {
                    await this.loadChatMessagesForModeration(webinarId);
                } else {
                    const messagesDiv = document.getElementById('moderation-messages');
                    if (messagesDiv) messagesDiv.style.display = 'none';
                }
            });
        } catch (error) {
            console.error('Error loading webinars for moderation:', error);
        }
    }
    
    async loadChatMessagesForModeration(webinarId) {
        try {
            const response = await fetch(`http://localhost:5000/api/admin/chat-messages/${webinarId}`, {
                method: 'GET',
                credentials: 'include'
            });
            
            if (response.ok) {
                const messages = await response.json();
                const messagesList = document.getElementById('moderation-messages-list');
                const messagesDiv = document.getElementById('moderation-messages');
                
                if (!messagesList || !messagesDiv) return;
                
                messagesDiv.style.display = 'block';
                
                if (messages.length > 0) {
                    messagesList.innerHTML = messages.map(msg => `
                        <div class="moderation-message ${msg.moderated ? 'moderated' : ''}">
                            <div class="message-header">
                                <span class="message-author">${msg.user_name} (${msg.user_role})</span>
                                <span class="message-time">${new Date(msg.created_at).toLocaleString()}</span>
                                ${msg.is_question ? '<span class="question-badge">Вопрос</span>' : ''}
                                ${msg.answered ? '<span class="answered-badge">Отвечен</span>' : ''}
                                ${msg.moderated ? '<span class="moderated-badge">Удален</span>' : ''}
                            </div>
                            <div class="message-content">${msg.message}</div>
                            ${!msg.moderated ? `
                                <div class="moderation-actions">
                                    ${msg.is_question ? 
                                        `<button class="btn btn-sm btn-outline mark-answered-btn" data-message-id="${msg.id}">
                                            Отметить как отвеченный
                                        </button>` : ''}
                                    <button class="btn btn-sm btn-danger delete-message-btn" data-message-id="${msg.id}">
                                        Удалить сообщение
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    `).join('');
                    
                    // Добавить обработчики для модерации
                    document.querySelectorAll('.mark-answered-btn').forEach(button => {
                        button.addEventListener('click', async (e) => {
                            const messageId = e.target.dataset.messageId;
                            await this.moderateMessage(messageId, 'answer');
                        });
                    });
                    
                    document.querySelectorAll('.delete-message-btn').forEach(button => {
                        button.addEventListener('click', async (e) => {
                            const messageId = e.target.dataset.messageId;
                            await this.moderateMessage(messageId, 'delete');
                        });
                    });
                } else {
                    messagesList.innerHTML = '<p>Сообщений не найдено</p>';
                }
            }
        } catch (error) {
            console.error('Error loading chat messages:', error);
        }
    }
    
    async moderateMessage(messageId, action) {
        if (!this.app.socket || !this.app.socket.connected) {
            alert('Ошибка: соединение с чатом не установлено');
            return;
        }
        
        this.app.socket.emit('moderate-message', {
            messageId: messageId,
            action: action
        });
        
        alert(`Сообщение ${action === 'delete' ? 'удалено' : 'отмечено как отвеченное'}`);
        
        // Обновить список сообщений
        const webinarSelect = document.getElementById('moderation-webinar');
        if (webinarSelect?.value) {
            await this.loadChatMessagesForModeration(webinarSelect.value);
        }
    }
}