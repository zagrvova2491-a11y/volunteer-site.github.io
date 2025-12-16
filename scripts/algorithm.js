class AlgorithmManager {
    constructor(currentUser) {
        this.currentUser = currentUser;
        this.userLocation = null;
        this.geocoder = null;
        this.init();
    }

    init() {
        this.geocoder = new google.maps.Geocoder();
        this.getUserLocation();
    }

    async getUserLocation() {
        // Получаем координаты города пользователя
        const city = this.currentUser.city;
        if (!city) {
            console.error('Город пользователя не указан');
            return;
        }

        try {
            const coordinates = database.getCityCoordinates(city);
            if (coordinates) {
                this.userLocation = coordinates;
                return;
            }

            // Если города нет в базе, геокодируем его
            const response = await this.geocodeCity(city);
            if (response) {
                this.userLocation = response;
                database.addCityCoordinates(city, response);
            }
        } catch (error) {
            console.error('Ошибка получения местоположения пользователя:', error);
        }
    }

    geocodeCity(cityName) {
        return new Promise((resolve, reject) => {
            this.geocoder.geocode({ address: cityName + ', Россия' }, (results, status) => {
                if (status === 'OK' && results[0]) {
                    const location = results[0].geometry.location;
                    resolve({
                        lat: location.lat(),
                        lng: location.lng()
                    });
                } else {
                    reject(new Error('Город не найден: ' + cityName));
                }
            });
        });
    }

    async findNearestEvent() {
        if (!this.userLocation) {
            await this.getUserLocation();
        }

        const events = database.getEvents();
        if (events.length === 0) {
            EcoConnectApp.showNotification('Нет доступных мероприятий', 'info');
            return null;
        }

        // Фильтруем мероприятия: только будущие и с местами
        const now = new Date();
        const availableEvents = events.filter(event => {
            const eventDate = new Date(event.date + 'T' + (event.time || '00:00'));
            const hasSpace = (event.currentVolunteers || 0) < (event.maxVolunteers || 50);
            const isNotRegistered = !this.isUserRegistered(event.id);
            return eventDate > now && hasSpace && isNotRegistered;
        });

        if (availableEvents.length === 0) {
            EcoConnectApp.showNotification('Нет доступных мероприятий для быстрой записи', 'info');
            return null;
        }

        // Сортируем по расстоянию (жадный алгоритм)
        const eventsWithDistance = availableEvents.map(event => {
            const distance = this.calculateDistance(this.userLocation, event.location);
            return { ...event, distance };
        });

        // Сортируем по расстоянию и дате
        eventsWithDistance.sort((a, b) => {
            // Сначала по расстоянию, потом по дате
            if (Math.abs(a.distance - b.distance) < 10) {
                // Если расстояния близки, выбираем ближайшее по времени
                return new Date(a.date) - new Date(b.date);
            }
            return a.distance - b.distance;
        });

        // Берем ближайшее мероприятие
        const nearestEvent = eventsWithDistance[0];
        
        // Показываем информацию о найденном мероприятии
        this.showQuickJoinModal(nearestEvent);
        
        return nearestEvent;
    }

    calculateDistance(point1, point2) {
        if (!point1 || !point2) return Infinity;
        
        const R = 6371; // Радиус Земли в км
        const dLat = this.toRad(point2.lat - point1.lat);
        const dLon = this.toRad(point2.lng - point1.lng);
        const lat1 = this.toRad(point1.lat);
        const lat2 = this.toRad(point2.lat);

        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2); 
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        return R * c;
    }

    toRad(value) {
        return value * Math.PI / 180;
    }

    isUserRegistered(eventId) {
        const userRegistrations = database.getUserRegistrations(this.currentUser.id);
        return userRegistrations.some(reg => reg.eventId === eventId);
    }

    showQuickJoinModal(event) {
        // Создаем модальное окно для быстрой записи
        const modalHTML = `
            <div id="quickJoinModal" class="modal show">
                <div class="modal-content" style="max-width: 500px;">
                    <div class="quick-join-content">
                        <div class="quick-join-icon">
                            <i class="fas fa-bolt"></i>
                        </div>
                        <h3>Найден ближайшее мероприятие!</h3>
                        
                        <div class="found-event">
                            <h4>${event.title}</h4>
                            <div class="found-event-details">
                                <div class="found-event-detail">
                                    <i class="fas fa-calendar"></i>
                                    <span>${EcoConnectApp.formatDate(event.date)}</span>
                                </div>
                                <div class="found-event-detail">
                                    <i class="fas fa-clock"></i>
                                    <span>${event.time || 'Время не указано'}</span>
                                </div>
                                <div class="found-event-detail">
                                    <i class="fas fa-map-marker-alt"></i>
                                    <span>Расстояние: ${Math.round(event.distance)} км от вас</span>
                                </div>
                                <div class="found-event-detail">
                                    <i class="fas fa-users"></i>
                                    <span>Участников: ${event.currentVolunteers || 0}/${event.maxVolunteers || 50}</span>
                                </div>
                            </div>
                            <div class="event-distance">
                                <i class="fas fa-running"></i> Это самое близкое мероприятие от вашего местоположения
                            </div>
                        </div>
                        
                        <div class="form-actions">
                            <button class="btn btn-secondary" id="cancelQuickJoin">
                                <i class="fas fa-times"></i> Отмена
                            </button>
                            <button class="btn btn-primary" id="confirmQuickJoin">
                                <i class="fas fa-check"></i> Записаться
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Удаляем старую модалку если есть
        const oldModal = document.getElementById('quickJoinModal');
        if (oldModal) oldModal.remove();

        // Добавляем новую модалку
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Добавляем обработчики
        const cancelBtn = document.getElementById('cancelQuickJoin');
        const confirmBtn = document.getElementById('confirmQuickJoin');
        const modal = document.getElementById('quickJoinModal');

        cancelBtn.addEventListener('click', () => {
            modal.remove();
            document.body.style.overflow = '';
        });

        confirmBtn.addEventListener('click', () => {
            this.joinEvent(event);
            modal.remove();
            document.body.style.overflow = '';
        });

        // Закрытие по клику вне модалки
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                document.body.style.overflow = '';
            }
        });

        // Закрытие по ESC
        document.addEventListener('keydown', function closeOnEsc(e) {
            if (e.key === 'Escape') {
                modal.remove();
                document.body.style.overflow = '';
                document.removeEventListener('keydown', closeOnEsc);
            }
        });
    }

    joinEvent(event) {
        if (!window.app || !window.app.eventsManager) {
            console.error('EventsManager не доступен');
            return;
        }

        window.app.eventsManager.joinEvent(event.id);
    }

    // Алгоритм подбора мероприятий по интересам
    findEventsByInterests() {
        const userInterests = this.currentUser.interests || [];
        if (userInterests.length === 0) return [];

        const events = database.getEvents();
        const now = new Date();

        // Взвешиваем мероприятия по совпадению интересов
        const scoredEvents = events.map(event => {
            let score = 0;
            
            // Совпадение тегов
            if (event.tags) {
                const commonTags = event.tags.filter(tag => 
                    userInterests.includes(tag)
                ).length;
                score += commonTags * 10; // 10 баллов за каждый совпадающий тег
            }

            // Близость по расстоянию
            if (this.userLocation && event.location) {
                const distance = this.calculateDistance(this.userLocation, event.location);
                if (distance < 10) score += 20; // Ближе 10 км
                else if (distance < 50) score += 10; // Ближе 50 км
                else if (distance < 100) score += 5; // Ближе 100 км
            }

            // Близость по времени (чем ближе дата, тем выше балл)
            const eventDate = new Date(event.date);
            const timeDiff = eventDate - now;
            const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
            
            if (daysDiff >= 0) {
                if (daysDiff < 7) score += 15; // На этой неделе
                else if (daysDiff < 30) score += 10; // В этом месяце
                else if (daysDiff < 90) score += 5; // В этом квартале
            }

            // Наличие свободных мест
            const freeSpots = (event.maxVolunteers || 50) - (event.currentVolunteers || 0);
            if (freeSpots > 10) score += 10;
            else if (freeSpots > 5) score += 5;
            else if (freeSpots > 0) score += 2;

            return { ...event, score };
        });

        // Сортируем по баллам и фильтруем недоступные
        return scoredEvents
            .filter(event => event.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5); // Топ-5 мероприятий
    }

    // Рекомендации для пользователя
    getRecommendations() {
        const recommendations = {
            nearestEvent: null,
            interestEvents: [],
            upcomingEvents: [],
            popularEvents: []
        };

        // Ближайшее мероприятие
        recommendations.nearestEvent = this.findNearestEvent();

        // Мероприятия по интересам
        recommendations.interestEvents = this.findEventsByInterests();

        // Ближайшие мероприятия по времени
        const now = new Date();
        const events = database.getEvents();
        recommendations.upcomingEvents = events
            .filter(event => {
                const eventDate = new Date(event.date);
                return eventDate > now && !this.isUserRegistered(event.id);
            })
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(0, 3);

        // Популярные мероприятия (по количеству участников)
        recommendations.popularEvents = events
            .filter(event => {
                const eventDate = new Date(event.date);
                return eventDate > now && !this.isUserRegistered(event.id);
            })
            .sort((a, b) => (b.currentVolunteers || 0) - (a.currentVolunteers || 0))
            .slice(0, 3);

        return recommendations;
    }

    // Проверка возможности записи на мероприятие
    canJoinEvent(event) {
        if (!event) return false;

        // Проверка даты
        const now = new Date();
        const eventDate = new Date(event.date + 'T' + (event.time || '00:00'));
        if (eventDate <= now) {
            return { canJoin: false, reason: 'Мероприятие уже прошло' };
        }

        // Проверка свободных мест
        const freeSpots = (event.maxVolunteers || 50) - (event.currentVolunteers || 0);
        if (freeSpots <= 0) {
            return { canJoin: false, reason: 'Нет свободных мест' };
        }

        // Проверка уже записан ли пользователь
        if (this.isUserRegistered(event.id)) {
            return { canJoin: false, reason: 'Вы уже записаны на это мероприятие' };
        }

        // Проверка расстояния (предупреждение если далеко)
        let warning = null;
        if (this.userLocation && event.location) {
            const distance = this.calculateDistance(this.userLocation, event.location);
            if (distance > 100) {
                warning = `Мероприятие находится далеко от вас (${Math.round(distance)} км)`;
            }
        }

        return { canJoin: true, warning };
    }
}