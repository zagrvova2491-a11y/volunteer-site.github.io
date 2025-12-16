class AuthManager {
    constructor() {
        this.loginForm = document.getElementById('loginForm');
        this.registerForm = document.getElementById('registerForm');
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkExistingAuth();
    }

    setupEventListeners() {
        if (this.loginForm) {
            this.loginForm.addEventListener('submit', (e) => {
                this.handleLogin(e);
            });
        }

        if (this.registerForm) {
            this.registerForm.addEventListener('submit', (e) => {
                this.handleRegister(e);
            });
        }

        const toggleButtons = document.querySelectorAll('.password-toggle');
        toggleButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.togglePasswordVisibility(e.target.closest('.password-toggle'));
            });
        });

        const passwordInput = document.getElementById('password');
        if (passwordInput) {
            passwordInput.addEventListener('input', (e) => {
                this.checkPasswordStrength(e.target.value);
            });
        }

        // Обработчики для выбора типа аккаунта
        const accountTypeOptions = document.querySelectorAll('input[name="accountType"]');
        accountTypeOptions.forEach(option => {
            option.addEventListener('change', () => {
                this.updateAccountTypeVisual();
            });
        });

        // Ограничение выбора интересов (максимум 5)
        const interestCheckboxes = document.querySelectorAll('input[name="interests"]');
        interestCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.limitInterestsSelection();
            });
        });
    }

    checkExistingAuth() {
        const currentUser = database.getCurrentUser();
        if (currentUser && (window.location.pathname.includes('login.html') || 
                           window.location.pathname.includes('register.html'))) {
            window.location.href = 'main.html';
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const formData = new FormData(this.loginForm);
        const email = formData.get('email');
        const password = formData.get('password');

        try {
            const user = database.loginUser(email, password);
            this.showNotification('Вход выполнен успешно!', 'success');
            
            setTimeout(() => {
                window.location.href = 'main.html';
            }, 1000);

        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const formData = new FormData(this.registerForm);
        const countryCode = document.getElementById('countryCode').value;
        
        const userData = {
            lastName: formData.get('lastName'),
            firstName: formData.get('firstName'), 
            middleName: formData.get('middleName'),
            fullName: `${formData.get('lastName')} ${formData.get('firstName')} ${formData.get('middleName')}`,
            city: formData.get('city'),
            email: formData.get('email'),
            countryCode: countryCode,
            phone: formData.get('phone'),
            accountType: formData.get('accountType'),
            interests: this.getSelectedInterests(),
            password: formData.get('password'),
            confirmPassword: formData.get('confirmPassword')
        };

        if (!this.validateRegisterData(userData)) {
            return;
        }

        try {
            const user = database.registerUser(userData);
            this.showNotification('Регистрация прошла успешно!', 'success');
            
            setTimeout(() => {
                window.location.href = 'main.html';
            }, 1000);

        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }

    validateRegisterData(data) {
        // Валидация ФИО
        if (!/^[А-Яа-яЁё]{2,}$/.test(data.lastName)) {
            this.showNotification('Введите корректную фамилию на русском языке', 'error');
            return false;
        }

        if (!/^[А-Яа-яЁё]{2,}$/.test(data.firstName)) {
            this.showNotification('Введите корректное имя на русском языке', 'error');
            return false;
        }

        if (!/^[А-Яа-яЁё]{2,}$/.test(data.middleName)) {
            this.showNotification('Введите корректное отчество на русском языке', 'error');
            return false;
        }

        // Валидация города
        if (!data.city || data.city.trim().length < 2) {
            this.showNotification('Введите корректный город', 'error');
            return false;
        }

        // Валидация email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            this.showNotification('Введите корректный email', 'error');
            return false;
        }

        // Валидация телефона
        const phoneRegex = /^[0-9\s\-\(\)]+$/;
        const phoneWithoutSpaces = data.phone.replace(/[\s\-\(\)]/g, '');
        
        if (!phoneRegex.test(data.phone) || phoneWithoutSpaces.length < 10) {
            this.showNotification('Введите корректный номер телефона', 'error');
            return false;
        }

        // Валидация пароля
        if (data.password.length < 6) {
            this.showNotification('Пароль должен содержать минимум 6 символов', 'error');
            return false;
        }

        if (data.password !== data.confirmPassword) {
            this.showNotification('Пароли не совпадают', 'error');
            return false;
        }

        // Проверка выбора типа аккаунта
        if (!data.accountType) {
            this.showNotification('Выберите тип аккаунта', 'error');
            return false;
        }

        // Проверка согласия с условиями
        const agreeTerms = document.getElementById('agreeTerms');
        if (agreeTerms && !agreeTerms.checked) {
            this.showNotification('Необходимо согласие с условиями использования', 'error');
            return false;
        }

        return true;
    }

    getSelectedInterests() {
        const selectedInterests = [];
        const interestCheckboxes = document.querySelectorAll('input[name="interests"]:checked');
        
        interestCheckboxes.forEach(checkbox => {
            selectedInterests.push(checkbox.value);
        });
        
        return selectedInterests;
    }

    limitInterestsSelection() {
        const selectedCheckboxes = document.querySelectorAll('input[name="interests"]:checked');
        
        if (selectedCheckboxes.length > 5) {
            this.showNotification('Можно выбрать не более 5 интересов', 'warning');
            selectedCheckboxes[selectedCheckboxes.length - 1].checked = false;
        }
    }

    updateAccountTypeVisual() {
        const accountTypeCards = document.querySelectorAll('.account-type-card');
        accountTypeCards.forEach(card => {
            card.style.opacity = '0.7';
        });

        const selectedOption = document.querySelector('input[name="accountType"]:checked');
        if (selectedOption) {
            const selectedCard = selectedOption.nextElementSibling;
            selectedCard.style.opacity = '1';
        }
    }

    togglePasswordVisibility(button) {
        const input = button.parentElement.querySelector('input');
        const icon = button.querySelector('i');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'fas fa-eye-slash';
        } else {
            input.type = 'password';
            icon.className = 'fas fa-eye';
        }
    }

    checkPasswordStrength(password) {
        const strengthBar = document.querySelector('.strength-bar');
        const strengthText = document.querySelector('.strength-text');
        
        if (!strengthBar || !strengthText) return;

        let strength = 0;
        let color = '#ff6b6b';
        let text = 'Слабый';

        if (password.length >= 6) strength += 25;
        if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength += 25;
        if (password.match(/\d/)) strength += 25;
        if (password.match(/[^a-zA-Z\d]/)) strength += 25;

        if (strength >= 75) {
            color = '#4caf50';
            text = 'Сильный';
        } else if (strength >= 50) {
            color = '#ffa726';
            text = 'Средний';
        }

        strengthBar.style.setProperty('--strength-width', strength + '%');
        strengthBar.style.setProperty('--strength-color', color);
        strengthText.textContent = text;
        strengthText.style.color = color;
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        if (!notification) return;

        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.style.display = 'block';

        setTimeout(() => {
            notification.style.display = 'none';
        }, 5000);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    window.authManager = new AuthManager();
});