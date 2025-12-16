class DashboardManager {
    constructor(currentUser) {
        this.currentUser = currentUser;
        this.isInitialized = false;
        this.init();
    }

    init() {
        if (this.isInitialized) return;
        
        this.setupEventListeners();
        this.setupDashboardCards();
        this.updateDashboardStats();
        this.loadUserInterests();
        
        this.isInitialized = true;
    }

    setupEventListeners() {
        // Обработчики для кнопок выбора типа участия
        const chooseEventBtn = document.getElementById('chooseEventBtn');
        const quickJoinBtn = document.getElementById('quickJoinBtn');
        const backToDashboardBtn = document.getElementById('backToDashboardBtn');

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

        // Обработчик поиска мероприятий
        const eventSearch = document.getElementById('eventSearch');
        if (eventSearch) {
            eventSearch.addEventListener('input', (e) => {
                this.searchEvents(e.target.value);
            });
        }

        // Обработчик сортировки мероприятий
        const sortSelect = document.getElementById('sortEvents');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.sortEvents(e.target.value);
            });
        }
    }

    setupDashboardCards() {
        // Настраиваем фон для карточек действий
        const chooseEventCard = document.getElementById('chooseEventCard');
        const quickJoinCard = document.getElementById('quickJoinCard');

        if (chooseEventCard) {
            chooseEventCard.style.backgroundImage = 'linear-gradient(rgba(27, 94, 32, 0.7), rgba(27, 94, 32, 0.9)), url("images/choose-event-bg.jpg")';
        }

        if (quickJoinCard) {
            quickJoinCard.style.backgroundImage = 'linear-gradient(rgba(27, 94, 32, 0.7), rgba(27, 94, 32, 0.9)), url("images/quick-join-bg.jpg")';
        }
    }

    showDashboard() {
        const dashboardSection = document.getElementById('dashboard');
        const eventsSection = document.getElementById('events');

        if (dashboardSection) dashboardSection.style.display = 'block';
        if (eventsSection) eventsSection.style.display = 'none';

        // Обновляем статистику при показе дашборда
        this.updateDashboardStats();
    }

    showEventsList() {
        const dashboardSection = document.getElementById('dashboard');
        const eventsSection = document.getElementById('events');

        if (dashboardSection) dashboardSection.style.display = 'none';
        if (eventsSection) eventsSection.style.display = 'block';

        // Загружаем и отображаем мероприятия
        this.loadAndDisplayEvents();
    }

    async handleQuickJoin() {
        if (!window.algorithmManager) {
            EcoConnectApp.showNotification('Система быстрой записи недоступна', 'error');
            return;
        }

        try {
            // Показываем индикатор загрузки
            this.showLoadingIndicator();

            // Ищем ближайшее мероприятие
            const nearestEvent = await window.algorithmManager.findNearestEvent();
            
            if (nearestEvent) {
                // Записываем пользователя на мероприятие
                if (window.app && window.app.eventsManager) {
                    window.app.eventsManager.joinEvent(nearestEvent.id);
                }
            } else {
                EcoConnectApp.showNotification('Подходящих мероприятий не найдено', 'info');
            }
        } catch (error) {
            console.error('Ошибка при быстрой записи:', error);
            EcoConnectApp.showNotification('Произошла ошибка при поиске мероприятия', 'error');
        } finally {
            this.hideLoadingIndicator();
        }
    }

    showLoadingIndicator() {
        // Создаем индикатор загрузки
        const loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'quickJoinLoading';
        loadingOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(27, 94, 32, 0.8);
            backdrop-filter: blur(10px);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            color: white;
        `;

        loadingOverlay.innerHTML = `
            <div class="loading-spinner" style="
                width: 60px;
                height: 60px;
                border: 4px solid rgba(255, 255, 255, 0.3);
                border-top-color: #4caf50;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-bottom: 20px;
            "></div>
            <h3 style="margin-bottom: 10px;">Ищем ближайшее мероприятие...</h3>
            <p>Определяем ваше местоположение и подбираем оптимальный вариант</p>
            <style>
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            </style>
        `;

        document.body.appendChild(loadingOverlay);
    }

    hideLoadingIndicator() {
        const loadingOverlay = document.getElementById('quickJoinLoading');
        if (loadingOverlay) {
            loadingOverlay.remove();
        }
    }

    async loadAndDisplayEvents() {
        try {
            const events = database.getEvents();
            
            // Сортируем мероприятия: сначала ближайшие по дате
            const sortedEvents = this.sortEventsByDate(events);
            
            // Фильтруем мероприятия по интересам пользователя
            const filteredEvents = this.filterEventsByInterests(sortedEvents);
            
            // Отображаем мероприятия
            this.displayEvents(filteredEvents);
            
            // Обновляем счетчик найденных мероприятий
            this.updateEventsCount(filteredEvents.length);
            
        } catch (error) {
            console.error('Ошибка при загрузке мероприятий:', error);
            EcoConnectApp.showNotification('Не удалось загрузить мероприятия', 'error');
        }
    }

    sortEventsByDate(events) {
        return events.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateA - dateB;
        });
    }

    filterEventsByInterests(events) {
        if (!this.currentUser.interests || this.currentUser.interests.length === 0) {
            return events;
        }

        return events.filter(event => {
            if (!event.tags || event.tags.length === 0) return true;
            
            // Проверяем, есть ли совпадения тегов мероприятия с интересами пользователя
            return event.tags.some(tag => 
                this.currentUser.interests.includes(tag)
            );
        });
    }

    displayEvents(events) {
        const eventsContainer = document.getElementById('eventsContainer');
        if (!eventsContainer) return;

        if (events.length === 0) {
            eventsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <h3>Мероприятий не найдено</h3>
                    <p>Попробуйте изменить параметры поиска или создайте своё мероприятие</p>
                </div>
            `;
            return;
        }

        // Группируем мероприятия по дате
        const groupedEvents = this.groupEventsByDate(events);

        let eventsHTML = '';

        for (const [date, dateEvents] of Object.entries(groupedEvents)) {
            eventsHTML += `
                <div class="date-group">
                    <h3 class="date-header">${this.formatDateHeader(date)}</h3>
                    <div class="date-events">
                        ${dateEvents.map(event => this.createEventCard(event)).join('')}
                    </div>
                </div>
            `;
        }

        eventsContainer.innerHTML = eventsHTML;

        // Добавляем обработчики событий для кнопок
        this.attachEventCardHandlers();
    }

    groupEventsByDate(events) {
        const grouped = {};

        events.forEach(event => {
            const date = event.date;
            if (!grouped[date]) {
                grouped[date] = [];
            }
            grouped[date].push(event);
        });

        return grouped;
    }

    formatDateHeader(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Сегодня';
        } else if (date.toDateString() === tomorrow.toDateString()) {
            return 'Завтра';
        } else {
            return date.toLocaleDateString('ru-RU', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
            });
        }
    }

    createEventCard(event) {
        const isRegistered = this.isUserRegistered(event.id);
        const isCreator = event.creatorId === this.currentUser.id;
        const canEdit = this.currentUser.accountType === 'curator' && isCreator;
        const canDelete = this.currentUser.accountType === 'curator' && isCreator;
        
        const buttonText = isRegistered ? 'Вы записаны' : 'Присоединиться';
        const buttonClass = isRegistered ? 'btn-success' : 'btn-primary';
        const buttonDisabled = isRegistered || (event.currentVolunteers >= event.maxVolunteers);
        
        const distance = this.calculateEventDistance(event);
        const distanceText = distance ? ` · ${distance} км от вас` : '';

        return `
            <div class="event-card" data-event-id="${event.id}">
                <div class="event-header">
                    <h3 class="event-title">${event.title}</h3>
                    <span class="event-date">${EcoConnectApp.formatDate(event.date)}</span>
                </div>
                
                <p class="event-description">${event.description}</p>
                
                <div class="event-info">
                    <div class="event-location">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${this.getEventLocationText(event)}${distanceText}</span>
                    </div>
                    <div class="event-time">
                        <i class="fas fa-clock"></i>
                        <span>${EcoConnectApp.formatTime(event.time)}</span>
                    </div>
                    <div class="event-volunteers">
                        <i class="fas fa-users"></i>
                        <span>${event.currentVolunteers || 0}/${event.maxVolunteers} участников</span>
                    </div>
                    ${event.tags && event.tags.length > 0 ? `
                        <div class="event-tags">
                            ${event.tags.map(tag => `
                                <span class="event-tag">${this.getTagIcon(tag)} ${tag}</span>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
                
                <div class="event-actions">
                    <button class="btn ${buttonClass} join-btn" 
                            data-event="${event.id}" 
                            ${buttonDisabled ? 'disabled' : ''}>
                        ${buttonText}
                    </button>
                    
                    ${isCreator ? `
                        <button class="btn btn-info participants-btn" data-event="${event.id}">
                            <i class="fas fa-users"></i> Участники
                        </button>
                    ` : ''}
                    
                    ${canEdit ? `
                        <button class="btn btn-secondary edit-btn" data-event="${event.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                    ` : ''}
                    
                    ${canDelete ? `
                        <button class="btn btn-danger delete-btn" data-event="${event.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    getEventLocationText(event) {
        if (event.address) {
            return event.address;
        } else if (event.location) {
            return `Широта: ${event.location.lat.toFixed(4)}, Долгота: ${event.location.lng.toFixed(4)}`;
        }
        return 'Местоположение не указано';
    }

    getTagIcon(tag) {
        const icons = {
            'мусор': '♻️',
            'листья': '🍂',
            'озеленение': '🌳',
            'озера': '💧',
            'парки': '🌲',
            'реки': '🌊',
            'пляжи': '🏖️',
            'леса': '🌲'
        };
        return icons[tag] || '🏷️';
    }

    calculateEventDistance(event) {
        if (!event.location || !this.currentUser.city) return null;
        
        const userCityCoords = database.getCityCoordinates(this.currentUser.city);
        if (!userCityCoords) return null;
        
        // Простое вычисление расстояния (для демо)
        const latDiff = Math.abs(event.location.lat - userCityCoords.lat);
        const lngDiff = Math.abs(event.location.lng - userCityCoords.lng);
        const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111; // Примерно 111 км на градус
        
        return distance.toFixed(1);
    }

    isUserRegistered(eventId) {
        const userRegistrations = database.getUserRegistrations(this.currentUser.id);
        return userRegistrations.some(reg => reg.eventId === eventId);
    }

    attachEventCardHandlers() {
        // Обработчики для кнопок присоединения
        document.querySelectorAll('.join-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const eventId = e.target.closest('.join-btn').getAttribute('data-event');
                if (window.app && window.app.eventsManager) {
                    window.app.eventsManager.joinEvent(eventId);
                }
            });
        });

        // Обработчики для кнопок просмотра участников
        document.querySelectorAll('.participants-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const eventId = e.target.closest('.participants-btn').getAttribute('data-event');
                this.showEventParticipants(eventId);
            });
        });

        // Обработчики для кнопок редактирования
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const eventId = e.target.closest('.edit-btn').getAttribute('data-event');
                this.editEvent(eventId);
            });
        });

        // Обработчики для кнопок удаления
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const eventId = e.target.closest('.delete-btn').getAttribute('data-event');
                this.deleteEvent(eventId);
            });
        });
    }

    searchEvents(query) {
        const events = database.getEvents();
        
        if (!query.trim()) {
            this.loadAndDisplayEvents();
            return;
        }

        const filteredEvents = events.filter(event => {
            const searchText = query.toLowerCase();
            return event.title.toLowerCase().includes(searchText) ||
                   event.description.toLowerCase().includes(searchText) ||
                   (event.tags && event.tags.some(tag => tag.toLowerCase().includes(searchText)));
        });

        this.displayEvents(filteredEvents);
        this.updateEventsCount(filteredEvents.length);
    }

    sortEvents(sortBy) {
        let events = database.getEvents();
        
        switch (sortBy) {
            case 'date-asc':
                events.sort((a, b) => new Date(a.date) - new Date(b.date));
                break;
            case 'date-desc':
                events.sort((a, b) => new Date(b.date) - new Date(a.date));
                break;
            case 'title-asc':
                events.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'title-desc':
                events.sort((a, b) => b.title.localeCompare(a.title));
                break;
            case 'participants-asc':
                events.sort((a, b) => (a.currentVolunteers || 0) - (b.currentVolunteers || 0));
                break;
            case 'participants-desc':
                events.sort((a, b) => (b.currentVolunteers || 0) - (a.currentVolunteers || 0));
                break;
        }

        this.displayEvents(events);
    }

    updateEventsCount(count) {
        const eventsCountElement = document.getElementById('eventsCount');
        if (eventsCountElement) {
            eventsCountElement.textContent = count;
        }
    }

    showEventParticipants(eventId) {
        if (window.app && window.app.eventsManager) {
            window.app.eventsManager.showEventParticipants(eventId);
        }
    }

    editEvent(eventId) {
        // TODO: Реализовать редактирование мероприятия
        EcoConnectApp.showNotification('Редактирование мероприятия будет доступно в следующем обновлении', 'info');
    }

    deleteEvent(eventId) {
        if (confirm('Вы уверены, что хотите удалить это мероприятие? Все данные участников будут удалены.')) {
            if (window.app && window.app.eventsManager) {
                window.app.eventsManager.deleteEvent(eventId);
            }
        }
    }

    updateDashboardStats() {
        const userStats = database.getUserStats(this.currentUser.id);
        
        // Обновляем статистику на дашборде
        const statsElements = {
            'totalEvents': userStats ? userStats.totalParticipations : 0,
            'createdEvents': userStats ? userStats.createdEvents : 0,
            'upcomingEvents': userStats ? userStats.upcomingEvents : 0,
            'completedEvents': userStats ? userStats.completedEvents : 0
        };

        Object.entries(statsElements).forEach(([elementId, value]) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.textContent = value;
            }
        });
    }

    loadUserInterests() {
        if (!this.currentUser.interests || this.currentUser.interests.length === 0) {
            return;
        }

        // Отображаем интересы пользователя на дашборде
        const interestsContainer = document.getElementById('userInterests');
        if (interestsContainer) {
            const interestsHTML = this.currentUser.interests
                .map(interest => `
                    <span class="interest-badge">
                        ${this.getTagIcon(interest)} ${interest}
                    </span>
                `).join('');
            
            interestsContainer.innerHTML = interestsHTML;
        }
    }

    getUpcomingEvents(count = 3) {
        const events = database.getEvents();
        const now = new Date();
        
        return events
            .filter(event => new Date(event.date) >= now)
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(0, count);
    }

    getRecommendedEvents() {
        if (!this.currentUser.interests || this.currentUser.interests.length === 0) {
            return this.getUpcomingEvents(5);
        }

        const events = database.getEvents();
        const now = new Date();
        
        // Фильтруем мероприятия по интересам и дате
        return events
            .filter(event => {
                if (new Date(event.date) < now) return false;
                if (!event.tags || event.tags.length === 0) return true;
                
                // Оцениваем релевантность по совпадению тегов
                const matchingTags = event.tags.filter(tag => 
                    this.currentUser.interests.includes(tag)
                ).length;
                
                return matchingTags > 0;
            })
            .sort((a, b) => {
                // Сортируем по количеству совпадающих тегов, затем по дате
                const aMatches = a.tags ? a.tags.filter(tag => 
                    this.currentUser.interests.includes(tag)
                ).length : 0;
                
                const bMatches = b.tags ? b.tags.filter(tag => 
                    this.currentUser.interests.includes(tag)
                ).length : 0;
                
                if (bMatches !== aMatches) {
                    return bMatches - aMatches;
                }
                
                return new Date(a.date) - new Date(b.date);
            })
            .slice(0, 5);
    }
}