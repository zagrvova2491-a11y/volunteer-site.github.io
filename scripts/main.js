class EcoConnectApp {
    constructor() {
        const currentUser = database.getCurrentUser();
        if (!currentUser) {
            window.location.href = 'login.html';
            return;
        }

        this.currentUser = currentUser;
        this.events = database.getEvents();
        this.currentEventId = null;
        this.init();
    }

    init() {
        this.initializeModules();
        this.setupEventListeners();
        this.setupSmoothScroll();
        this.setupModalHandlers();
        this.setupDashboard();
        this.loadData();
        this.updateUserStats();
        this.updateUIForUserType();
        this.setupNavigation();
        this.setupAnimations();
    }

    initializeModules() {
        if (typeof MapManager !== 'undefined') {
            this.mapManager = new MapManager();
            this.mapManager.initMainMap(this.currentUser.city);
        }

        if (typeof EventsManager !== 'undefined') {
            this.eventsManager = new EventsManager(this.events, this.currentUser);
        }

        if (typeof DashboardManager !== 'undefined') {
            this.dashboardManager = new DashboardManager(this.currentUser);
        }

        if (typeof AlgorithmManager !== 'undefined') {
            this.algorithmManager = new AlgorithmManager(this.currentUser);
        }
    }

    setupEventListeners() {
        document.addEventListener('eventsUpdated', (event) => {
            this.events = event.detail.events;
            this.saveData();
            this.updateUI();
            this.updateUserStats();
        });

        document.addEventListener('eventCreated', (event) => {
            this.events.push(event.detail);
            this.saveData();
            this.updateUI();
            this.updateUserStats();
        });

        document.addEventListener('eventDeleted', (event) => {
            this.events = this.events.filter(e => e.id !== event.detail.id);
            this.saveData();
            this.updateUI();
            this.updateUserStats();
        });

        // Пользовательское меню
        const userMenuBtn = document.getElementById('userMenuBtn');
        const userDropdown = document.getElementById('userDropdown');
        const logoutBtn = document.getElementById('logoutBtn');

        if (userMenuBtn && userDropdown) {
            userMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                userDropdown.style.display = userDropdown.style.display === 'block' ? 'none' : 'block';
            });

            document.addEventListener('click', () => {
                userDropdown.style.display = 'none';
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                database.logoutUser();
                window.location.href = 'login.html';
            });
        }

        // Обновление данных при изменении пользователя
        document.addEventListener('userUpdated', () => {
            this.currentUser = database.getCurrentUser();
            this.updateUserStats();
            this.updateUIForUserType();
        });
    }

    setupSmoothScroll() {
        const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
        
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                
                const targetId = this.getAttribute('href').substring(1);
                const targetSection = document.getElementById(targetId);
                
                if (targetSection) {
                    const headerHeight = document.querySelector('.header').offsetHeight;
                    const targetPosition = targetSection.offsetTop - headerHeight - 20;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    setupModalHandlers() {
        ModalManager.setupModalCloseHandlers();
        this.updateModalHandlers();
    }

    updateModalHandlers() {
        const createEventBtn = document.getElementById('createEventBtn');
        const cancelCreate = document.getElementById('cancelCreate');
        const createEventForm = document.getElementById('createEventForm');
        const closeSuccessBtn = document.getElementById('closeSuccessBtn');
        const closeSuccessModal = document.getElementById('closeSuccessModal');
        const closeParticipantsBtn = document.getElementById('closeParticipantsBtn');
        const closeParticipantsModal = document.getElementById('closeParticipantsModal');

        if (createEventBtn) {
            createEventBtn.addEventListener('click', () => {
                ModalManager.openModal('createEventModal');
                if (this.mapManager) {
                    setTimeout(() => this.mapManager.initLocationMap(this.currentUser.city), 100);
                }
            });
        }

        if (cancelCreate) {
            cancelCreate.addEventListener('click', () => {
                ModalManager.closeModal('createEventModal');
                if (this.mapManager) {
                    this.mapManager.resetLocationSelection();
                }
            });
        }

        if (createEventForm) {
            createEventForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCreateEvent();
            });
        }

        if (closeSuccessBtn) {
            closeSuccessBtn.addEventListener('click', () => {
                ModalManager.closeModal('successModal');
            });
        }

        if (closeSuccessModal) {
            closeSuccessModal.addEventListener('click', () => {
                ModalManager.closeModal('successModal');
            });
        }

        if (closeParticipantsBtn) {
            closeParticipantsBtn.addEventListener('click', () => {
                ModalManager.closeModal('participantsModal');
            });
        }

        if (closeParticipantsModal) {
            closeParticipantsModal.addEventListener('click', () => {
                ModalManager.closeModal('participantsModal');
            });
        }
    }

    setupDashboard() {
        const chooseEventBtn = document.getElementById('chooseEventBtn');
        const quickJoinBtn = document.getElementById('quickJoinBtn');
        const backToDashboardBtn = document.getElementById('backToDashboardBtn');
        const eventSearch = document.getElementById('eventSearch');

        if (chooseEventBtn) {
            chooseEventBtn.addEventListener('click', () => {
                this.showEventsList();
            });
        }

        if (quickJoinBtn) {
            quickJoinBtn.addEventListener('click', () => {
                this.handleQuickJoin();
            });
        }

        if (backToDashboardBtn) {
            backToDashboardBtn.addEventListener('click', () => {
                this.showDashboard();
            });
        }

        if (eventSearch) {
            eventSearch.addEventListener('input', (e) => {
                this.searchEvents(e.target.value);
            });
        }
    }

    showDashboard() {
        document.getElementById('dashboard').style.display = 'block';
        document.getElementById('events').style.display = 'none';
        
        // Показываем кнопку создания мероприятия для кураторов
        const createEventBtn = document.getElementById('createEventBtn');
        if (createEventBtn && this.currentUser.accountType === 'curator') {
            createEventBtn.style.display = 'flex';
        }
    }

    showEventsList() {
        document.getElementById('dashboard').style.display = 'none';
        document.getElementById('events').style.display = 'block';
        
        // Обновляем список мероприятий
        if (this.eventsManager) {
            this.eventsManager.renderEvents();
        }
    }

    searchEvents(query) {
        if (!this.eventsManager) return;
        
        const filteredEvents = this.events.filter(event => 
            event.title.toLowerCase().includes(query.toLowerCase()) ||
            event.description.toLowerCase().includes(query.toLowerCase()) ||
            (event.tags && event.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase())))
        );
        
        this.eventsManager.renderEvents(filteredEvents);
    }

    handleQuickJoin() {
        if (this.algorithmManager) {
            this.algorithmManager.findNearestEvent();
        }
    }

    handleCreateEvent() {
        const title = document.getElementById('eventTitle').value;
        const date = document.getElementById('eventDate').value;
        const time = document.getElementById('eventTime').value;
        const maxVolunteers = document.getElementById('eventMaxVolunteers').value;
        const description = document.getElementById('eventDescription').value;
        const locationType = document.querySelector('input[name="locationType"]:checked').value;
        
        let location = null;
        
        if (locationType === 'map') {
            location = this.mapManager ? this.mapManager.getSelectedLocation() : null;
        } else if (locationType === 'address') {
            const address = document.getElementById('eventAddress').value;
            if (address && this.mapManager) {
                location = this.mapManager.geocodeAddress(address);
            }
        }

        if (!location) {
            EcoConnectApp.showNotification('Выберите местоположение мероприятия', 'error');
            return;
        }

        // Получаем выбранные теги
        const selectedTags = [];
        document.querySelectorAll('input[name="tags"]:checked').forEach(checkbox => {
            selectedTags.push(checkbox.value);
        });

        const eventData = {
            title,
            date,
            time,
            location,
            description,
            maxVolunteers: parseInt(maxVolunteers),
            tags: selectedTags,
            creatorId: this.currentUser.id
        };

        if (this.eventsManager.createEvent(eventData)) {
            ModalManager.closeModal('createEventModal');
            if (this.mapManager) {
                this.mapManager.resetLocationSelection();
            }
        }
    }

    loadData() {
        this.updateUI();
        this.updateProgressStats();
    }

    saveData() {
        database.saveEvents(this.events);
    }

    updateUI() {
        this.updateEventsList();
        this.updateMap();
        this.updateProgressStats();
        this.updateUserStats();
    }

    updateEventsList() {
        if (this.eventsManager) {
            this.eventsManager.renderEvents(this.events);
        }
    }

    updateMap() {
        if (this.mapManager) {
            this.mapManager.updateEvents(this.events);
        }
    }

    updateProgressStats() {
        const progressStats = document.getElementById('progressStats');
        if (!progressStats) return;

        const userStats = database.getUserStats(this.currentUser.id);
        const systemStats = database.getSystemStats();

        let statsHTML = '';

        if (this.currentUser.accountType === 'curator') {
            statsHTML = `
                <div class="stat-card">
                    <div class="stat-value">${userStats ? userStats.createdEvents : 0}</div>
                    <div class="stat-label">Создано мероприятий</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${userStats ? userStats.totalParticipations : 0}</div>
                    <div class="stat-label">Участий в мероприятиях</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${systemStats.totalEvents}</div>
                    <div class="stat-label">Всего мероприятий в системе</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${systemStats.totalParticipants}</div>
                    <div class="stat-label">Участников в системе</div>
                </div>
            `;
        } else {
            statsHTML = `
                <div class="stat-card">
                    <div class="stat-value">${userStats ? userStats.totalParticipations : 0}</div>
                    <div class="stat-label">Всего участий</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${userStats ? userStats.upcomingEvents : 0}</div>
                    <div class="stat-label">Предстоящих мероприятий</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${userStats ? userStats.completedEvents : 0}</div>
                    <div class="stat-label">Завершенных мероприятий</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${systemStats.activeEvents}</div>
                    <div class="stat-label">Активных мероприятий</div>
                </div>
            `;
        }

        progressStats.innerHTML = statsHTML;
    }

    updateUserStats() {
        const userName = document.getElementById('userName');
        const userFullName = document.getElementById('userFullName');
        const userEmail = document.getElementById('userEmail');
        const userRole = document.getElementById('userRole');
        const userAvatar = document.getElementById('userAvatar');
        const participatedCount = document.getElementById('participatedCount');
        const daysInSystem = document.getElementById('daysInSystem');
        const createdEventsCount = document.getElementById('createdEventsCount');
        const curatorStats = document.getElementById('curatorStats');
        const statItem1 = document.getElementById('statItem1');
        const statItem2 = document.getElementById('statItem2');

        if (userName) userName.textContent = this.currentUser.firstName;
        if (userFullName) userFullName.textContent = this.currentUser.fullName;
        if (userEmail) userEmail.textContent = this.currentUser.email;
        
        if (userRole) {
            userRole.textContent = this.currentUser.accountType === 'curator' ? 'Куратор' : 'Участник';
        }
        
        if (userAvatar) {
            userAvatar.innerHTML = this.currentUser.accountType === 'curator' 
                ? '<i class="fas fa-user-tie"></i>' 
                : '<i class="fas fa-user-friends"></i>';
        }

        if (participatedCount) {
            const userRegistrations = database.getUserRegistrations(this.currentUser.id);
            participatedCount.textContent = userRegistrations.length;
        }

        if (daysInSystem) {
            const registeredDate = new Date(this.currentUser.registeredAt);
            const today = new Date();
            const days = Math.floor((today - registeredDate) / (1000 * 60 * 60 * 24));
            daysInSystem.textContent = Math.max(days, 0);
        }

        if (this.currentUser.accountType === 'curator') {
            if (curatorStats) curatorStats.style.display = 'flex';
            if (createdEventsCount) {
                createdEventsCount.textContent = this.currentUser.createdEvents ? this.currentUser.createdEvents.length : 0;
            }
            
            // Обновляем текст для кураторов
            if (statItem1) {
                statItem1.querySelector('span').innerHTML = `Участвовал в <strong id="participatedCount">${participatedCount.textContent}</strong> мероприятиях`;
            }
            if (statItem2) {
                statItem2.querySelector('span').innerHTML = `В системе <strong id="daysInSystem">${daysInSystem.textContent}</strong> дней`;
            }
        } else {
            if (curatorStats) curatorStats.style.display = 'none';
        }
    }

    setupAnimations() {
        // Загружаем анимации скролла
        if (typeof ScrollAnimations !== 'undefined') {
            this.scrollAnimations = new ScrollAnimations();
        }

        // Добавляем эффект частиц для CTA секции
        this.createParticles();
    }

    createParticles() {
        const ctaSection = document.querySelector('.section-cta');
        if (!ctaSection) return;

        const particleCount = 30;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            // Случайные свойства
            const size = Math.random() * 20 + 5;
            const posX = Math.random() * 100;
            const posY = Math.random() * 100;
            const duration = Math.random() * 10 + 10;
            const delay = Math.random() * 5;
            
            particle.style.cssText = `
                width: ${size}px;
                height: ${size}px;
                left: ${posX}%;
                top: ${posY}%;
                animation: float ${duration}s ease-in-out infinite;
                animation-delay: ${delay}s;
                opacity: ${Math.random() * 0.3 + 0.1};
            `;
            
            ctaSection.appendChild(particle);
        }
    }

    updateUIForUserType() {
        const createEventBtn = document.getElementById('createEventBtn');
        
        // Показываем/скрываем кнопку создания мероприятий
        if (createEventBtn) {
            if (this.currentUser.accountType === 'curator') {
                createEventBtn.style.display = 'flex';
            } else {
                createEventBtn.style.display = 'none';
            }
        }

        // Обновляем заголовки и текст в зависимости от типа пользователя
        const sectionTitle = document.querySelector('.section-title');
        if (sectionTitle && this.currentUser.accountType === 'curator') {
            sectionTitle.textContent = 'Добро пожаловать, Куратор!';
        }
    }

    static showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-triangle' : 'info'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? 'rgba(46, 125, 50, 0.9)' : type === 'error' ? 'rgba(211, 47, 47, 0.9)' : 'rgba(25, 118, 210, 0.9)'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            z-index: 3000;
            animation: slideInRight 0.3s ease-out;
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    static formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    static formatTime(timeString) {
        if (!timeString) return 'Время не указано';
        return timeString;
    }

    static generateId() {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    }
}

class ModalManager {
    static openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
            
            const firstInput = modal.querySelector('input, textarea, select');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 300);
            }
        }
    }

    static closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('closing');
            setTimeout(() => {
                modal.classList.remove('show', 'closing');
                document.body.style.overflow = '';
            }, 300);
        }
    }

    static setupModalCloseHandlers() {
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', function() {
                const modal = this.closest('.modal');
                if (modal) {
                    ModalManager.closeModal(modal.id);
                }
            });
        });

        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', function(e) {
                if (e.target === this) {
                    ModalManager.closeModal(this.id);
                }
            });
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.modal.show');
                if (openModal) {
                    ModalManager.closeModal(openModal.id);
                }
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', function() {
    window.app = new EcoConnectApp();
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        
        .notification-content {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
    `;
    document.head.appendChild(style);
});