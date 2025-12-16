class AuthService {
    constructor() {
        this.apiUrl = '/api'; // ← относительный путь
        this.currentUser = null;
    }
    
    async login(email, password) {
        try {
            const response = await fetch(`${this.apiUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.currentUser = data.user;
                return { success: true, user: data.user };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    }
    
    async register(userData) {
        try {
            const response = await fetch(`${this.apiUrl}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.currentUser = data.user;
                return { success: true, user: data.user };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    }
    
    async logout() {
        try {
            await fetch(`${this.apiUrl}/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });
            this.currentUser = null;
            return { success: true };
        } catch (error) {
            return { success: false, error: 'Logout failed' };
        }
    }
    
    async getCurrentUser() {
        if (this.currentUser) {
            return this.currentUser;
        }
        
        try {
            const response = await fetch(`${this.apiUrl}/auth/verify`, {
                method: 'GET',
                credentials: 'include'
            });
            
              if (response.ok) {
            const data = await response.json();
            this.currentUser = data.user;
            return data.user;
        } else if (response.status === 401) {
            // 401 - не авторизован, это нормально
            console.log('Пользователь не авторизован (401)');
            this.currentUser = null;
            return null;
        }
        return null;
    } catch (error) {
        console.log('Ошибка при проверке аутентификации:', error.message);
        return null;
    }
}

    isAuthenticated() {
        return this.currentUser !== null;
    }
    
    getUser() {
        return this.currentUser;
    }
}

export { AuthService };
