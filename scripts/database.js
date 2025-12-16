class Database {
    constructor() {
        this.usersKey = 'ecoConnectUsers';
        this.eventsKey = 'ecoConnectEvents';
        this.currentUserKey = 'ecoConnectCurrentUser';
        this.registrationsKey = 'ecoConnectRegistrations';
        this.eventFilesKey = 'ecoConnectEventFiles';
        this.citiesKey = 'ecoConnectCities';
        this.init();
    }

    init() {
        // Инициализация пользователей по умолчанию
        if (!localStorage.getItem(this.usersKey)) {
            const defaultUsers = [{
                id: '1',
                email: 'admin@ecoconnect.ru',
                password: this.hashPassword('admin123'),
                phone: '+79991234567',
                countryCode: '+7',
                lastName: 'Администратор',
                firstName: 'Системы',
                middleName: '',
                fullName: 'Администратор Системы',
                city: 'Москва',
                accountType: 'curator',
                interests: ['мусор', 'листья', 'озеленение'],
                registeredAt: new Date().toISOString(),
                participatedEvents: [],
                createdEvents: []
            }];
            localStorage.setItem(this.usersKey, JSON.stringify(defaultUsers));
        }

        // Инициализация мероприятий
        if (!localStorage.getItem(this.eventsKey)) {
            localStorage.setItem(this.eventsKey, JSON.stringify([]));
        }

        // Инициализация регистраций
        if (!localStorage.getItem(this.registrationsKey)) {
            localStorage.setItem(this.registrationsKey, JSON.stringify([]));
        }

        // Инициализация файлов мероприятий
        if (!localStorage.getItem(this.eventFilesKey)) {
            localStorage.setItem(this.eventFilesKey, JSON.stringify({}));
        }

        // Инициализация городов для геокодирования
        if (!localStorage.getItem(this.citiesKey)) {
            const defaultCities = {
                'Москва': { lat: 55.7558, lng: 37.6173 },
                'Санкт-Петербург': { lat: 59.9343, lng: 30.3351 },
                'Новосибирск': { lat: 55.0084, lng: 82.9357 },
                'Екатеринбург': { lat: 56.8389, lng: 60.6057 },
                'Казань': { lat: 55.7961, lng: 49.1064 },
                'Нижний Новгород': { lat: 56.3269, lng: 44.0075 },
                'Челябинск': { lat: 55.1644, lng: 61.4368 },
                'Самара': { lat: 53.1959, lng: 50.1002 },
                'Омск': { lat: 54.9893, lng: 73.3682 },
                'Ростов-на-Дону': { lat: 47.2357, lng: 39.7015 }
            };
            localStorage.setItem(this.citiesKey, JSON.stringify(defaultCities));
        }
    }

    hashPassword(password) {
        return btoa(unescape(encodeURIComponent(password)));
    }

    verifyPassword(inputPassword, storedPassword) {
        return this.hashPassword(inputPassword) === storedPassword;
    }

    registerUser(userData) {
        const users = this.getUsers();
        
        // Проверка существующего email
        if (users.find(u => u.email === userData.email)) {
            throw new Error('Пользователь с таким email уже существует');
        }

        // Проверка существующего телефона
        if (users.find(u => u.phone === userData.phone)) {
            throw new Error('Пользователь с таким телефоном уже существует');
        }

        const newUser = {
            id: this.generateId(),
            email: userData.email,
            password: this.hashPassword(userData.password),
            countryCode: userData.countryCode,
            phone: userData.phone,
            lastName: userData.lastName,
            firstName: userData.firstName,
            middleName: userData.middleName,
            fullName: userData.fullName,
            city: userData.city,
            accountType: userData.accountType,
            interests: userData.interests || [],
            registeredAt: new Date().toISOString(),
            participatedEvents: [],
            createdEvents: []
        };

        users.push(newUser);
        localStorage.setItem(this.usersKey, JSON.stringify(users));
        
        return newUser;
    }

    loginUser(email, password) {
        const users = this.getUsers();
        const user = users.find(u => u.email === email);
        
        if (!user) {
            throw new Error('Пользователь не найден');
        }

        if (!this.verifyPassword(password, user.password)) {
            throw new Error('Неверный пароль');
        }

        const { password: _, ...userWithoutPassword } = user;
        this.setCurrentUser(userWithoutPassword);
        
        return userWithoutPassword;
    }

    logoutUser() {
        localStorage.removeItem(this.currentUserKey);
    }

    getCurrentUser() {
        const userData = localStorage.getItem(this.currentUserKey);
        return userData ? JSON.parse(userData) : null;
    }

    setCurrentUser(user) {
        localStorage.setItem(this.currentUserKey, JSON.stringify(user));
    }

    getUsers() {
        return JSON.parse(localStorage.getItem(this.usersKey)) || [];
    }

    updateUser(userId, updates) {
        const users = this.getUsers();
        const userIndex = users.findIndex(u => u.id === userId);
        
        if (userIndex === -1) {
            throw new Error('Пользователь не найден');
        }

        users[userIndex] = { ...users[userIndex], ...updates };
        localStorage.setItem(this.usersKey, JSON.stringify(users));

        const currentUser = this.getCurrentUser();
        if (currentUser && currentUser.id === userId) {
            this.setCurrentUser({ ...currentUser, ...updates });
        }

        return users[userIndex];
    }

    addUserParticipation(userId, eventId) {
        const user = this.getUsers().find(u => u.id === userId);
        if (!user) return;

        if (!user.participatedEvents.includes(eventId)) {
            user.participatedEvents.push(eventId);
            this.updateUser(userId, { participatedEvents: user.participatedEvents });
        }
    }

    addUserCreatedEvent(userId, eventId) {
        const user = this.getUsers().find(u => u.id === userId);
        if (!user) return;

        if (!user.createdEvents.includes(eventId)) {
            user.createdEvents.push(eventId);
            this.updateUser(userId, { createdEvents: user.createdEvents });
        }
    }

    generateId() {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    }

    getEvents() {
        return JSON.parse(localStorage.getItem(this.eventsKey)) || [];
    }

    saveEvents(events) {
        localStorage.setItem(this.eventsKey, JSON.stringify(events));
    }

    // Методы для регистраций
    addRegistration(registration) {
        const registrations = this.getRegistrations();
        registrations.push(registration);
        localStorage.setItem(this.registrationsKey, JSON.stringify(registrations));
        return registration;
    }

    getRegistrations() {
        return JSON.parse(localStorage.getItem(this.registrationsKey)) || [];
    }

    getEventRegistrations(eventId) {
        const registrations = this.getRegistrations();
        return registrations.filter(reg => reg.eventId === eventId);
    }

    getUserRegistrations(userId) {
        const registrations = this.getRegistrations();
        return registrations.filter(reg => reg.userId === userId);
    }

    removeRegistration(eventId, userId) {
        const registrations = this.getRegistrations();
        const index = registrations.findIndex(reg => 
            reg.eventId === eventId && reg.userId === userId
        );
        
        if (index !== -1) {
            registrations.splice(index, 1);
            localStorage.setItem(this.registrationsKey, JSON.stringify(registrations));
            return true;
        }
        
        return false;
    }

    // Методы для работы с TXT файлами мероприятий
    createEventFile(event) {
        const eventFiles = this.getEventFiles();
        const fileName = `event_${event.id}_${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
        const header = 'Фамилия, Имя, Отчество, Телефон, Email, Дата регистрации\n';
        
        eventFiles[event.id] = {
            fileName: fileName,
            content: header,
            eventTitle: event.title,
            createdAt: new Date().toISOString(),
            participantsCount: 0
        };
        
        localStorage.setItem(this.eventFilesKey, JSON.stringify(eventFiles));
        return eventFiles[event.id];
    }

    addParticipantToEventFile(eventId, userData) {
        const eventFiles = this.getEventFiles();
        if (!eventFiles[eventId]) return null;

        const participantData = `${userData.lastName}, ${userData.firstName}, ${userData.middleName}, ${userData.phone}, ${userData.email}, ${new Date().toLocaleDateString('ru-RU')}\n`;
        eventFiles[eventId].content += participantData;
        eventFiles[eventId].participantsCount = (eventFiles[eventId].participantsCount || 0) + 1;
        eventFiles[eventId].lastUpdated = new Date().toISOString();
        
        localStorage.setItem(this.eventFilesKey, JSON.stringify(eventFiles));
        return eventFiles[eventId];
    }

    getEventFiles() {
        return JSON.parse(localStorage.getItem(this.eventFilesKey)) || {};
    }

    getEventFile(eventId) {
        const eventFiles = this.getEventFiles();
        return eventFiles[eventId] || null;
    }

    // Методы для работы с городами
    getCityCoordinates(cityName) {
        const cities = JSON.parse(localStorage.getItem(this.citiesKey) || '{}');
        return cities[cityName] || null;
    }

    addCityCoordinates(cityName, coordinates) {
        const cities = JSON.parse(localStorage.getItem(this.citiesKey) || '{}');
        cities[cityName] = coordinates;
        localStorage.setItem(this.citiesKey, JSON.stringify(cities));
        return coordinates;
    }

    // Методы для работы с интересами пользователей
    getUsersByInterest(interest) {
        const users = this.getUsers();
        return users.filter(user => 
            user.interests && user.interests.includes(interest)
        );
    }

    // Методы для работы с мероприятиями по тегам
    getEventsByTag(tag) {
        const events = this.getEvents();
        return events.filter(event => 
            event.tags && event.tags.includes(tag)
        );
    }

    // Методы для статистики
    getUserStats(userId) {
        const user = this.getUsers().find(u => u.id === userId);
        if (!user) return null;

        const registrations = this.getUserRegistrations(userId);
        const events = this.getEvents();
        const userEvents = events.filter(event => registrations.some(reg => reg.eventId === event.id));

        return {
            totalParticipations: registrations.length,
            upcomingEvents: userEvents.filter(event => new Date(event.date) > new Date()).length,
            completedEvents: userEvents.filter(event => new Date(event.date) <= new Date()).length,
            createdEvents: user.createdEvents ? user.createdEvents.length : 0,
            favoriteInterests: user.interests || []
        };
    }

    getSystemStats() {
        const users = this.getUsers();
        const events = this.getEvents();
        const registrations = this.getRegistrations();

        return {
            totalUsers: users.length,
            totalCurators: users.filter(u => u.accountType === 'curator').length,
            totalParticipants: users.filter(u => u.accountType === 'participant').length,
            totalEvents: events.length,
            activeEvents: events.filter(e => new Date(e.date) >= new Date()).length,
            totalRegistrations: registrations.length,
            popularCities: this.getPopularCities(),
            popularTags: this.getPopularTags()
        };
    }

    getPopularCities() {
        const users = this.getUsers();
        const cityCounts = {};
        
        users.forEach(user => {
            if (user.city) {
                cityCounts[user.city] = (cityCounts[user.city] || 0) + 1;
            }
        });

        return Object.entries(cityCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
    }

    getPopularTags() {
        const events = this.getEvents();
        const tagCounts = {};
        
        events.forEach(event => {
            if (event.tags) {
                event.tags.forEach(tag => {
                    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                });
            }
        });

        return Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
    }
}

window.database = new Database();