class MapManager {
    constructor() {
        this.mainMap = null;
        this.locationMap = null;
        this.mainMarkers = [];
        this.locationMarker = null;
        this.selectedLocation = null;
        this.geocoder = null;
        this.userCity = null;
        this.userCoordinates = null;
    }

    initMainMap(city = null) {
        const mapElement = document.getElementById('mainMap');
        if (!mapElement) return;

        // Определяем центр карты
        let defaultCenter = { lat: 55.7558, lng: 37.6173 }; // Москва по умолчанию
        
        if (city) {
            this.userCity = city;
            const cityCoords = database.getCityCoordinates(city);
            if (cityCoords) {
                defaultCenter = cityCoords;
                this.userCoordinates = cityCoords;
            }
        }
        
        this.mainMap = new google.maps.Map(mapElement, {
            zoom: city ? 12 : 10,
            center: defaultCenter,
            styles: this.getMapStyles(),
            mapTypeControl: true,
            streetViewControl: true,
            fullscreenControl: true,
            zoomControl: true
        });

        this.geocoder = new google.maps.Geocoder();
        this.addMapControls();
    }

    initLocationMap(city = null) {
        const mapElement = document.getElementById('locationMap');
        if (!mapElement) return;

        // Определяем центр карты
        let defaultCenter = { lat: 55.7558, lng: 37.6173 };
        
        if (city) {
            const cityCoords = database.getCityCoordinates(city);
            if (cityCoords) {
                defaultCenter = cityCoords;
            }
        }
        
        this.locationMap = new google.maps.Map(mapElement, {
            zoom: 12,
            center: defaultCenter,
            styles: this.getMapStyles(),
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false
        });

        this.locationMap.addListener('click', (event) => {
            this.setSelectedLocation(event.latLng);
        });

        this.addSearchBox();
    }

    setSelectedLocation(latLng) {
        this.selectedLocation = {
            lat: latLng.lat(),
            lng: latLng.lng(),
            address: null
        };

        // Получаем адрес по координатам
        this.geocoder.geocode({ location: latLng }, (results, status) => {
            if (status === 'OK' && results[0]) {
                this.selectedLocation.address = results[0].formatted_address;
                this.updateLocationInfo();
            }
        });

        if (this.locationMarker) {
            this.locationMarker.setMap(null);
        }

        this.locationMarker = new google.maps.Marker({
            position: latLng,
            map: this.locationMap,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: '#f44336',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2
            },
            animation: google.maps.Animation.BOUNCE
        });

        this.updateLocationInfo();
        this.locationMap.panTo(latLng);
    }

    async geocodeAddress(address) {
        return new Promise((resolve, reject) => {
            if (!this.geocoder) {
                reject(new Error('Geocoder не инициализирован'));
                return;
            }

            this.geocoder.geocode({ address: address }, (results, status) => {
                if (status === 'OK' && results[0]) {
                    const location = results[0].geometry.location;
                    resolve({
                        lat: location.lat(),
                        lng: location.lng(),
                        address: results[0].formatted_address
                    });
                } else {
                    reject(new Error('Не удалось найти адрес: ' + status));
                }
            });
        });
    }

    updateLocationInfo() {
        const latElement = document.getElementById('latValue');
        const lngElement = document.getElementById('lngValue');
        const locationText = document.getElementById('selectedLocationText');

        if (latElement && lngElement && locationText) {
            latElement.textContent = this.selectedLocation ? this.selectedLocation.lat.toFixed(6) : '-';
            lngElement.textContent = this.selectedLocation ? this.selectedLocation.lng.toFixed(6) : '-';
            
            if (this.selectedLocation && this.selectedLocation.address) {
                locationText.textContent = this.selectedLocation.address;
            } else {
                locationText.textContent = this.selectedLocation 
                    ? `Широта: ${this.selectedLocation.lat.toFixed(6)}, Долгота: ${this.selectedLocation.lng.toFixed(6)}`
                    : 'Кликните на карте чтобы выбрать местоположение';
            }
        }
    }

    addSearchBox() {
        if (!this.locationMap) return;

        const input = document.getElementById('eventAddress');
        if (!input) return;

        // Создаем Autocomplete
        const autocomplete = new google.maps.places.Autocomplete(input, {
            types: ['geocode', 'establishment'],
            componentRestrictions: { country: 'ru' }
        });

        // Привязываем autocomplete к карте
        autocomplete.bindTo('bounds', this.locationMap);

        autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            
            if (!place.geometry) {
                EcoConnectApp.showNotification('Место не найдено', 'error');
                return;
            }

            this.setSelectedLocation(place.geometry.location);
            
            if (place.geometry.viewport) {
                this.locationMap.fitBounds(place.geometry.viewport);
            } else {
                this.locationMap.setCenter(place.geometry.location);
                this.locationMap.setZoom(17);
            }
        });
    }

    updateEvents(events) {
        this.clearMainMarkers();

        events.forEach(event => {
            if (event.location) {
                this.addEventMarker(event);
            }
        });

        this.fitMapBounds();
    }

    addEventMarker(event) {
        if (!this.mainMap || !event.location) return;

        const marker = new google.maps.Marker({
            position: event.location,
            map: this.mainMap,
            title: event.title,
            icon: {
                url: 'data:image/svg+xml;base64,' + btoa(`
                    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="16" cy="16" r="14" fill="#4caf50" stroke="white" stroke-width="2"/>
                        <text x="16" y="21" text-anchor="middle" fill="white" font-size="12" font-weight="bold">${event.currentVolunteers || 0}</text>
                    </svg>
                `),
                scaledSize: new google.maps.Size(32, 32)
            }
        });

        const infoWindow = new google.maps.InfoWindow({
            content: `
                <div class="marker-info">
                    <div class="marker-title">${event.title}</div>
                    <div class="marker-date">${EcoConnectApp.formatDate(event.date)}</div>
                    <div class="marker-time">⏰ ${event.time || 'Время не указано'}</div>
                    <div class="marker-volunteers">👥 ${event.currentVolunteers || 0}/${event.maxVolunteers} участников</div>
                    ${event.tags && event.tags.length > 0 ? `
                        <div class="marker-tags">
                            ${event.tags.map(tag => `<span class="marker-tag">${tag}</span>`).join('')}
                        </div>
                    ` : ''}
                    <div class="marker-actions">
                        <button onclick="app.eventsManager.joinEvent('${event.id}')">
                            Присоединиться
                        </button>
                    </div>
                </div>
            `
        });

        marker.addListener('click', () => {
            infoWindow.open(this.mainMap, marker);
        });

        this.mainMarkers.push(marker);
    }

    clearMainMarkers() {
        this.mainMarkers.forEach(marker => {
            marker.setMap(null);
        });
        this.mainMarkers = [];
    }

    fitMapBounds() {
        if (this.mainMarkers.length === 0 || !this.mainMap) return;

        const bounds = new google.maps.LatLngBounds();
        this.mainMarkers.forEach(marker => {
            bounds.extend(marker.getPosition());
        });

        this.mainMap.fitBounds(bounds);

        if (this.mainMarkers.length === 1) {
            google.maps.event.addListenerOnce(this.mainMap, 'bounds_changed', () => {
                if (this.mainMap.getZoom() > 15) {
                    this.mainMap.setZoom(15);
                }
            });
        }
    }

    addMapControls() {
        if (!this.mainMap) return;

        const locationButton = document.createElement('button');
        locationButton.innerHTML = '<i class="fas fa-location-arrow"></i>';
        locationButton.title = 'Мое местоположение';
        locationButton.style.cssText = `
            background: white;
            border: none;
            border-radius: 6px;
            padding: 8px;
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            margin-bottom: 5px;
        `;

        locationButton.addEventListener('click', () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const pos = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        };
                        this.mainMap.setCenter(pos);
                        this.mainMap.setZoom(14);
                        
                        // Сохраняем текущее местоположение пользователя
                        this.userCoordinates = pos;
                    },
                    () => {
                        EcoConnectApp.showNotification('Не удалось получить ваше местоположение', 'error');
                    }
                );
            }
        });

        this.mainMap.controls[google.maps.ControlPosition.RIGHT_TOP].push(locationButton);
    }

    getMapStyles() {
        return [
            {
                "featureType": "all",
                "elementType": "geometry.fill",
                "stylers": [{ "weight": "2.00" }]
            },
            {
                "featureType": "all",
                "elementType": "geometry.stroke",
                "stylers": [{ "color": "#9c9c9c" }]
            },
            {
                "featureType": "all",
                "elementType": "labels.text.fill",
                "stylers": [{ "gamma": 0.01 }, { "lightness": 20 }]
            },
            {
                "featureType": "all",
                "elementType": "labels.text.stroke",
                "stylers": [{ "saturation": -31 }, { "lightness": -33 }, { "weight": "2.00" }]
            },
            {
                "featureType": "landscape",
                "elementType": "geometry",
                "stylers": [{ "lightness": 30 }, { "saturation": 30 }]
            },
            {
                "featureType": "poi",
                "elementType": "geometry",
                "stylers": [{ "saturation": 20 }]
            },
            {
                "featureType": "poi.park",
                "elementType": "geometry",
                "stylers": [{ "lightness": 20 }, { "saturation": -20 }]
            },
            {
                "featureType": "road",
                "elementType": "geometry",
                "stylers": [{ "lightness": 10 }, { "saturation": -30 }]
            },
            {
                "featureType": "road",
                "elementType": "geometry.stroke",
                "stylers": [{ "saturation": 25 }, { "lightness": 25 }]
            },
            {
                "featureType": "water",
                "elementType": "all",
                "stylers": [{ "lightness": -20 }]
            }
        ];
    }

    getSelectedLocation() {
        return this.selectedLocation;
    }

    resetLocationSelection() {
        this.selectedLocation = null;
        if (this.locationMarker) {
            this.locationMarker.setMap(null);
            this.locationMarker = null;
        }
        
        const latElement = document.getElementById('latValue');
        const lngElement = document.getElementById('lngValue');
        const locationText = document.getElementById('selectedLocationText');
        
        if (latElement && lngElement && locationText) {
            latElement.textContent = '-';
            lngElement.textContent = '-';
            locationText.textContent = 'Кликните на карте чтобы выбрать местоположение';
        }
    }

    // Методы для работы с координатами
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Радиус Земли в километрах
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    toRad(value) {
        return value * Math.PI / 180;
    }

    getUserCoordinates() {
        return this.userCoordinates;
    }

    setUserCoordinates(coordinates) {
        this.userCoordinates = coordinates;
    }
}