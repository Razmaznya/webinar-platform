export class UI {
    loadNavbar(user) {
        const navbarContainer = document.getElementById('navbar-container');
        
        if (user) {
            navbarContainer.innerHTML = `
                <nav class="navbar">
                    <div class="container">
                        <div class="navbar-brand">
                            <a href="/" class="logo">
                                <i class="fas fa-video"></i>
                                <span>WebinarPlatform</span>
                            </a>
                        </div>
                        <div class="navbar-menu">
                            <a href="/dashboard" class="nav-link">Дашборд</a>
                            <a href="/webinars" class="nav-link">Вебинары</a>
                            ${user.role === 'organizer' || user.role === 'speaker' ? 
                                `<a href="/create-webinar" class="nav-link">Создать вебинар</a>` : ''}
                            ${user.role === 'organizer' ? 
                                `<a href="/admin" class="nav-link">Админ-панель</a>` : ''}
                        </div>
                        <div class="navbar-user">
                            <div class="user-dropdown">
                                <button class="user-toggle">
                                    <div class="user-avatar">
                                        <i class="fas fa-user-circle"></i>
                                    </div>
                                    <span>${user.name}</span>
                                    <i class="fas fa-chevron-down"></i>
                                </button>
                                <div class="dropdown-menu">
                                    <a href="/profile" class="dropdown-item">
                                        <i class="fas fa-user"></i> Профиль
                                    </a>
                                    <a href="/dashboard" class="dropdown-item">
                                        <i class="fas fa-tachometer-alt"></i> Дашборд
                                    </a>
                                    <div class="dropdown-divider"></div>
                                    <a href="#" id="logout-btn" class="dropdown-item">
                                        <i class="fas fa-sign-out-alt"></i> Выйти
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </nav>
            `;
            
            // Обработчик выхода
            document.getElementById('logout-btn').addEventListener('click', (e) => {
                e.preventDefault();
                window.app.logout();
                window.app.router.navigate('/');
            });
            
            // Обработчик dropdown пользователя
            const userToggle = document.querySelector('.user-toggle');
            const dropdownMenu = document.querySelector('.dropdown-menu');
            
            userToggle.addEventListener('click', () => {
                dropdownMenu.classList.toggle('show');
            });
            
            // Закрыть dropdown при клике вне его
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.user-dropdown')) {
                    dropdownMenu.classList.remove('show');
                }
            });
        } else {
            navbarContainer.innerHTML = `
                <nav class="navbar">
                    <div class="container">
                        <div class="navbar-brand">
                            <a href="/" class="logo">
                                <i class="fas fa-video"></i>
                                <span>WebinarPlatform</span>
                            </a>
                        </div>
                        <div class="navbar-menu">
                            <a href="/" class="nav-link">Главная</a>
                            <a href="/webinars" class="nav-link">Вебинары</a>
                            <a href="#features" class="nav-link">Возможности</a>
                            <a href="#pricing" class="nav-link">Тарифы</a>
                        </div>
                        <div class="navbar-auth">
                            <a href="/login" class="btn btn-outline">Вход</a>
                            <a href="/register" class="btn btn-primary">Регистрация</a>
                        </div>
                    </div>
                </nav>
            `;
        }
    }
    
    loadFooter() {
        const footerContainer = document.getElementById('footer-container');
        
        footerContainer.innerHTML = `
            <footer class="footer">
                <div class="container">
                    <div class="footer-content">
                        <div class="footer-section">
                            <h3>WebinarPlatform</h3>
                            <p>Профессиональная платформа для проведения вебинаров и онлайн-конференций</p>
                            <div class="social-links">
                                <a href="#"><i class="fab fa-facebook"></i></a>
                                <a href="#"><i class="fab fa-twitter"></i></a>
                                <a href="#"><i class="fab fa-linkedin"></i></a>
                                <a href="#"><i class="fab fa-youtube"></i></a>
                            </div>
                        </div>
                        <div class="footer-section">
                            <h4>Продукт</h4>
                            <ul>
                                <li><a href="#">Возможности</a></li>
                                <li><a href="#">Тарифы</a></li>
                                <li><a href="#">Интеграции</a></li>
                                <li><a href="#">Обновления</a></li>
                            </ul>
                        </div>
                        <div class="footer-section">
                            <h4>Ресурсы</h4>
                            <ul>
                                <li><a href="#">Документация</a></li>
                                <li><a href="#">Блог</a></li>
                                <li><a href="#">Вебинары</a></li>
                                <li><a href="#">Поддержка</a></li>
                            </ul>
                        </div>
                        <div class="footer-section">
                            <h4>Компания</h4>
                            <ul>
                                <li><a href="#">О нас</a></li>
                                <li><a href="#">Карьера</a></li>
                                <li><a href="#">Контакты</a></li>
                                <li><a href="#">Политика конфиденциальности</a></li>
                            </ul>
                        </div>
                    </div>
                    <div class="footer-bottom">
                        <p>&copy; ${new Date().getFullYear()} WebinarPlatform. </p>
                    </div>
                </div>
            </footer>
        `;
    }
}