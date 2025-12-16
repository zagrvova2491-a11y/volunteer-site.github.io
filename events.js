class EventsManager {
    constructor(events, currentUser) {
        this.events = events || [];
        this.currentUser = currentUser;
        this.currentEventId = null;
    }

    renderEvents(events = this.events) {
        const container = document.getElementById('eventsContainer');
        if (!container) return;

        // Сортируем мероприятия по дате (от ближайших к дальним)
        const sortedEvents = this.sortEventsByDate(events);

        if (sortedEvents.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <h3>Мероприятий не найдено</h3>
                    <p>Попробуйте изменить параметры поиска</p>
                </div>
            `;
            return;
        }

        container.innerHTML = sortedEvents.map(event => {
            const registered = this.isUserRegistered(event.id);
            const isCreator = event.creatorId === this.currentUser.id;
            const buttonText = this.getButtonText(registered, isCreator);
            const buttonClass = this.getButtonClass(registered, isCreator);
            const buttonDisabled = this.shouldDisableButton(registered, isCreator, event);
            
            // Информация о файле
            const eventFiles = database.getEventFiles();
            const eventFile = eventFiles[event.id];
            const participantsCount = eventFile ? (eventFile.participantsCount || 0) : 0;
            
            return `
                <div class="event-card" data-event-id="${event.id}">
                    <div class="event-header">
                        <h3 class="event-title">${event.title}</h3>
                        <div class="event-header-right">
                            <span class="event-date">${this.formatDate(event.date)}</span>
                            ${isCreator ? '<span class="creator-badge">Вы организатор</span>' : ''}
                        </div>
                    </div>
                    <p class="event-description">${event.description}</p>
                    <div class="event-info">
                        <span class="event-location">📍 ${this.getLocationAddress(event.location)}</span>
                        <span class="event-time">⏰ ${event.time || 'Время не указано'}</span>
                        <span class="event-volunteers">👥 ${event.currentVolunteers || 0}/${event.maxVolunteers} участников</span>
                        ${event.tags && event.tags.length > 0 ? `
                            <div class="event-tags">
                                ${event.tags.map(tag => `<span class="event-tag">${this.getTagIcon(tag)} ${tag}</span>`).join('')}
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
                                <i class="fas fa-users"></i> Участники (${participantsCount})
                            </button>
                        ` : ''}
                        
                        ${eventFile ? `
                            <button class="btn btn-secondary download-txt-btn" data-event="${event.id}">
                                <i class="fas fa-file-download"></i> Список
                            </button>
                        ` : ''}
                        
                        ${isCreator ? `
                            <button class="btn btn-danger delete-btn" data-event="${event.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

        this.attachEventHandlers();
        this.attachDownloadHandlers();
        this.attachParticipantsHandlers();
    }

    sortEventsByDate(events) {
        return events.sort((a, b) => {
            const dateA = new Date(a.date + ' ' + (a.time || '00:00'));
            const dateB = new Date(b.date + ' ' + (b.time || '00:00'));
            return dateA - dateB;
        });
    }

    getButtonText(registered, isCreator) {
        if (isCreator) return 'Вы организатор';
        if (registered) return 'Вы записаны';
        return 'Присоединиться';
    }

    getButtonClass(registered, isCreator) {
        if (isCreator) return 'btn-success';
        if (registered) return 'btn-success';
        return 'btn-primary';
    }

    shouldDisableButton(registered, isCreator, event) {
        if (isCreator) return true;
        if (registered) return true;
        if (event.currentVolunteers >= event.maxVolunteers) return true;
        return false;
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

    isUserRegistered(eventId) {
        if (!this.currentUser) return false;
        
        const userRegistrations = database.getUserRegistrations(this.currentUser.id);
        return userRegistrations.some(reg => reg.eventId === eventId);
    }

    getLocationAddress(location) {
        if (!location) return 'Местоположение не указано';
        
        if (location.address) {
            return location.address;
        }
        
        return `Широта: ${location.lat.toFixed(4)}, Долгота: ${location.lng.toFixed(4)}`;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        if (date.toDateString() === today.toDateString()) {
            return 'Сегодня';
        } else if (date.toDateString() === tomorrow.toDateString()) {
            return 'Завтра';
        }
        
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    attachEventHandlers() {
        document.querySelectorAll('.join-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const eventId = e.target.closest('.join-btn').getAttribute('data-event');
                const event = this.events.find(e => e.id === eventId);
                
                if (event && event.creatorId === this.currentUser.id) {
                    EcoConnectApp.showNotification('Вы организатор этого мероприятия', 'info');
                    return;
                }
                
                this.joinEvent(eventId);
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const eventId = e.target.closest('.delete-btn').getAttribute('data-event');
                this.deleteEvent(eventId);
            });
        });
    }

    attachDownloadHandlers() {
        document.querySelectorAll('.download-txt-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const eventId = e.target.closest('.download-txt-btn').getAttribute('data-event');
                this.downloadTxtFile(eventId);
            });
        });
    }

    attachParticipantsHandlers() {
        document.querySelectorAll('.participants-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const eventId = e.target.closest('.participants-btn').getAttribute('data-event');
                this.showParticipantsModal(eventId);
            });
        });
    }

    joinEvent(eventId) {
        const event = this.events.find(e => e.id === eventId);
        
        if (!event || !this.currentUser) {
            EcoConnectApp.showNotification('Ошибка записи', 'error');
            return;
        }

        if (event.currentVolunteers >= event.maxVolunteers) {
            EcoConnectApp.showNotification('На это мероприятие уже набрано максимальное количество участников', 'error');
            return;
        }

        if (this.isUserRegistered(eventId)) {
            EcoConnectApp.showNotification('Вы уже записаны на это мероприятие', 'info');
            return;
        }

        // Создаем регистрацию
        const registration = {
            id: database.generateId(),
            eventId: eventId,
            userId: this.currentUser.id,
            userData: {
                lastName: this.currentUser.lastName,
                firstName: this.currentUser.firstName,
                middleName: this.currentUser.middleName,
                fullName: this.currentUser.fullName,
                email: this.currentUser.email,
                phone: this.currentUser.phone
            },
            eventData: {
                title: event.title,
                date: event.date,
                time: event.time,
                location: event.location
            },
            registeredAt: new Date().toISOString()
        };

        database.addRegistration(registration);
        
        // Обновляем счетчик участников
        event.currentVolunteers = (event.currentVolunteers || 0) + 1;
        event.volunteers = event.volunteers || [];
        event.volunteers.push(this.currentUser.id);
        
        // Добавляем участника в TXT файл
        this.addParticipantToTxtFile(eventId, this.currentUser);
        
        // Обновляем статистику пользователя
        database.addUserParticipation(this.currentUser.id, eventId);
        
        // Обновляем UI
        document.dispatchEvent(new CustomEvent('eventsUpdated', {
            detail: { events: this.events }
        }));

        // Показываем модальное окно успеха
        this.showSuccessModal(registration);
        
        EcoConnectApp.showNotification('Вы успешно записались на мероприятие!', 'success');
    }

    leaveEvent(eventId) {
        const event = this.events.find(e => e.id === eventId);
        
        if (!event || !this.currentUser) {
            EcoConnectApp.showNotification('Ошибка', 'error');
            return;
        }

        if (event.creatorId === this.currentUser.id) {
            EcoConnectApp.showNotification('Организатор не может покинуть мероприятие', 'error');
            return;
        }

        if (!this.isUserRegistered(eventId)) {
            EcoConnectApp.showNotification('Вы не записаны на это мероприятие', 'info');
            return;
        }

        if (confirm('Вы уверены, что хотите покинуть мероприятие?')) {
            // Удаляем регистрацию
            const removed = database.removeRegistration(eventId, this.currentUser.id);
            
            if (removed) {
                // Обновляем счетчик участников
                event.currentVolunteers = Math.max((event.currentVolunteers || 1) - 1, 0);
                event.volunteers = (event.volunteers || []).filter(id => id !== this.currentUser.id);
                
                // Обновляем UI
                document.dispatchEvent(new CustomEvent('eventsUpdated', {
                    detail: { events: this.events }
                }));
                
                EcoConnectApp.showNotification('Вы покинули мероприятие', 'info');
            }
        }
    }

    showSuccessModal(registration) {
        const event = this.events.find(e => e.id === registration.eventId);
        if (!event) return;

        // Заполняем данные в модальном окне
        const successDate = document.getElementById('successDate');
        const successTime = document.getElementById('successTime');
        const successLocation = document.getElementById('successLocation');
        const successUserName = document.getElementById('successUserName');

        if (successDate) successDate.textContent = this.formatDate(event.date);
        if (successTime) successTime.textContent = event.time || 'Время не указано';
        if (successLocation) successLocation.textContent = this.getLocationAddress(event.location);
        if (successUserName) successUserName.textContent = registration.userData.fullName;

        // Показываем модальное окно
        ModalManager.openModal('successModal');
    }

    createEvent(eventData) {
        const existingEvent = this.events.find(event => 
            event.title === eventData.title && event.date === eventData.date
        );
        
        if (existingEvent) {
            EcoConnectApp.showNotification('Мероприятие с таким названием и датой уже существует', 'error');
            return null;
        }

        const newEvent = {
            id: EcoConnectApp.generateId(),
            title: eventData.title,
            date: eventData.date,
            time: eventData.time,
            location: eventData.location,
            description: eventData.description,
            maxVolunteers: eventData.maxVolunteers,
            currentVolunteers: 1, // Организатор считается первым участником
            volunteers: [this.currentUser.id],
            tags: eventData.tags || [],
            creatorId: eventData.creatorId,
            creatorName: this.currentUser.fullName,
            createdAt: new Date().toISOString()
        };

        this.events.push(newEvent);
        
        // Добавляем мероприятие в список созданных пользователем
        database.addUserCreatedEvent(this.currentUser.id, newEvent.id);
        
        // Создаем TXT файл для мероприятия
        database.createEventFile(newEvent);
        
        // Добавляем организатора в файл как первого участника
        database.addParticipantToEventFile(newEvent.id, this.currentUser);
        
        document.dispatchEvent(new CustomEvent('eventsUpdated', {
            detail: { events: this.events }
        }));

        EcoConnectApp.showNotification('Мероприятие успешно создано!', 'success');
        return newEvent;
    }

    deleteEvent(eventId) {
        const event = this.events.find(e => e.id === eventId);
        
        if (!event) {
            EcoConnectApp.showNotification('Мероприятие не найдено', 'error');
            return;
        }

        if (event.creatorId !== this.currentUser.id) {
            EcoConnectApp.showNotification('Вы можете удалять только свои мероприятия', 'error');
            return;
        }

        if (!confirm('Вы уверены, что хотите удалить это мероприятие? Все данные участников также будут удалены.')) {
            return;
        }

        const eventIndex = this.events.findIndex(e => e.id === eventId);
        if (eventIndex === -1) return;

        // Удаляем файл мероприятия из localStorage
        const eventFiles = database.getEventFiles();
        delete eventFiles[eventId];
        database.saveEventFiles(eventFiles);

        this.events.splice(eventIndex, 1);
        
        document.dispatchEvent(new CustomEvent('eventDeleted', {
            detail: { id: eventId }
        }));

        EcoConnectApp.showNotification('Мероприятие и файл участников удалены', 'info');
    }

    addParticipantToTxtFile(eventId, userData) {
        const eventFiles = database.getEventFiles();
        const eventFile = eventFiles[eventId];
        
        if (!eventFile) {
            console.error(`TXT файл для мероприятия ${eventId} не найден`);
            return null;
        }

        const participantData = `${userData.lastName}, ${userData.firstName}, ${userData.middleName}, ${userData.phone}, ${userData.email}, ${new Date().toLocaleDateString('ru-RU')}\n`;
        eventFile.content += participantData;
        eventFile.participantsCount = (eventFile.participantsCount || 0) + 1;
        eventFile.lastUpdated = new Date().toISOString();
        
        localStorage.setItem('eventFiles', JSON.stringify(eventFiles));
        
        console.log(`Участник ${userData.fullName} добавлен в TXT файл: ${eventFile.fileName}`);
        
        return eventFile;
    }

    downloadTxtFile(eventId) {
        const eventFiles = database.getEventFiles();
        const eventFile = eventFiles[eventId];
        
        if (!eventFile || !eventFile.content) {
            EcoConnectApp.showNotification('Файл с участниками не найден', 'error');
            return;
        }

        // Создаем Blob и скачиваем файл
        const blob = new Blob([eventFile.content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = eventFile.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        EcoConnectApp.showNotification(`Файл ${eventFile.fileName} успешно скачан!`, 'success');
    }

    showParticipantsModal(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;

        const registrations = database.getEventRegistrations(eventId);
        
        // Заполняем заголовок
        document.getElementById('participantsEventTitle').textContent = event.title;
        document.getElementById('totalParticipants').textContent = registrations.length;
        
        // Заполняем таблицу
        const tableBody = document.getElementById('participantsTableBody');
        tableBody.innerHTML = '';
        
        // Сортируем участников по фамилии
        const sortedRegistrations = registrations.sort((a, b) => 
            a.userData.lastName.localeCompare(b.userData.lastName)
        );
        
        sortedRegistrations.forEach(reg => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${reg.userData.lastName}</td>
                <td>${reg.userData.firstName}</td>
                <td>${reg.userData.middleName}</td>
                <td>${reg.userData.phone}</td>
                <td>${reg.userData.email}</td>
                <td>${new Date(reg.registeredAt).toLocaleDateString('ru-RU')}</td>
            `;
            tableBody.appendChild(row);
        });

        // Настраиваем поиск
        const searchInput = document.getElementById('searchParticipant');
        searchInput.addEventListener('input', (e) => {
            this.searchParticipants(e.target.value, tableBody);
        });

        // Настраиваем экспорт
        const exportBtn = document.getElementById('exportParticipantsBtn');
        exportBtn.onclick = () => {
            this.downloadTxtFile(eventId);
        };

        // Показываем модальное окно
        ModalManager.openModal('participantsModal');
    }

    searchParticipants(query, tableBody) {
        const rows = tableBody.getElementsByTagName('tr');
        
        Array.from(rows).forEach(row => {
            const cells = row.getElementsByTagName('td');
            let found = false;
            
            for (let cell of cells) {
                if (cell.textContent.toLowerCase().includes(query.toLowerCase())) {
                    found = true;
                    break;
                }
            }
            
            row.style.display = found ? '' : 'none';
        });
    }

    getEventsByCity(city) {
        return this.events.filter(event => {
            // Здесь должна быть логика определения города мероприятия
            // Пока возвращаем все мероприятия
            return true;
        });
    }

    getEventsByInterests(interests) {
        if (!interests || interests.length === 0) return this.events;
        
        return this.events.filter(event => {
            if (!event.tags || event.tags.length === 0) return false;
            
            return event.tags.some(tag => 
                interests.includes(tag)
            );
        });
    }

    getUpcomingEvents() {
        const now = new Date();
        return this.events.filter(event => {
            const eventDate = new Date(event.date + ' ' + (event.time || '00:00'));
            return eventDate >= now;
        });
    }

    getEventsForUser(user) {
        const userInterests = user.interests || [];
        const upcomingEvents = this.getUpcomingEvents();
        
        // Фильтруем по интересам пользователя
        const recommendedEvents = this.getEventsByInterests(userInterests);
        
        // Объединяем и удаляем дубликаты
        const allEvents = [...upcomingEvents, ...recommendedEvents];
        const uniqueEvents = allEvents.filter((event, index, self) =>
            index === self.findIndex(e => e.id === event.id)
        );
        
        return uniqueEvents;
    }
}