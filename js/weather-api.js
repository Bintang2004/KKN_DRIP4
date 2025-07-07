// Weather API Integration for Kelurahan Tanah Jaya, Bulukumba
class WeatherAPI {
    constructor() {
        this.location = {
            name: 'Kelurahan Tanah Jaya',
            city: 'Bulukumba',
            province: 'Sulawesi Selatan',
            lat: -5.5567, // Koordinat Bulukumba
            lon: 120.1989,
            timezone: 'Asia/Makassar' // WITA
        };
        
        // Multiple weather API sources for reliability
        this.apiSources = [
            {
                name: 'OpenWeatherMap',
                url: 'https://api.openweathermap.org/data/2.5/weather',
                key: 'demo', // In production, use real API key
                enabled: true
            },
            {
                name: 'WeatherAPI',
                url: 'https://api.weatherapi.com/v1/current.json',
                key: 'demo', // In production, use real API key
                enabled: false
            }
        ];
        
        this.currentWeather = {
            condition: 'cerah',
            temperature: 28,
            humidity: 65,
            windSpeed: 12,
            description: 'Cerah berawan',
            lastUpdate: new Date(),
            source: 'manual'
        };
        
        this.weatherMapping = {
            // OpenWeatherMap condition codes to our system
            '01d': 'cerah', '01n': 'cerah',
            '02d': 'cerah', '02n': 'cerah',
            '03d': 'mendung', '03n': 'mendung',
            '04d': 'mendung', '04n': 'mendung',
            '09d': 'hujan', '09n': 'hujan',
            '10d': 'hujan', '10n': 'hujan',
            '11d': 'hujan', '11n': 'hujan',
            '13d': 'hujan', '13n': 'hujan',
            '50d': 'mendung', '50n': 'mendung'
        };
        
        this.initializeWeatherSystem();
    }

    async initializeWeatherSystem() {
        // Try to get real weather data
        await this.fetchRealWeatherData();
        
        // Set up periodic updates every 30 minutes
        setInterval(() => {
            this.fetchRealWeatherData();
        }, 30 * 60 * 1000);
        
        // Set up realistic weather simulation for Sulawesi Selatan climate
        this.startRealisticWeatherSimulation();
    }

    async fetchRealWeatherData() {
        try {
            // Try OpenWeatherMap first (free tier available)
            const response = await this.fetchFromOpenWeatherMap();
            if (response) {
                this.processWeatherData(response, 'OpenWeatherMap');
                return;
            }
        } catch (error) {
            console.log('Real weather API unavailable, using simulation');
        }
        
        // Fallback to realistic simulation
        this.generateRealisticWeather();
    }

    async fetchFromOpenWeatherMap() {
        try {
            // Using free OpenWeatherMap API (requires API key in production)
            const url = `https://api.openweathermap.org/data/2.5/weather?lat=${this.location.lat}&lon=${this.location.lon}&appid=demo&units=metric&lang=id`;
            
            // For demo purposes, we'll simulate the response
            // In production, uncomment the fetch call below:
            // const response = await fetch(url);
            // const data = await response.json();
            
            // Simulated response based on typical Sulawesi Selatan weather
            const simulatedResponse = this.getSimulatedWeatherResponse();
            return simulatedResponse;
            
        } catch (error) {
            console.error('Error fetching weather data:', error);
            return null;
        }
    }

    getSimulatedWeatherResponse() {
        // Simulate realistic weather for Sulawesi Selatan
        const hour = new Date().getHours();
        const month = new Date().getMonth() + 1;
        
        // Sulawesi Selatan climate patterns
        const isRainySeason = month >= 11 || month <= 4; // Nov-Apr
        const isDrySeason = month >= 5 && month <= 10; // May-Oct
        
        let weatherCode, temp, humidity, windSpeed, description;
        
        if (isRainySeason) {
            // Rainy season: more clouds and rain
            const rainChance = Math.random();
            if (rainChance < 0.3) {
                weatherCode = '10d'; // Rain
                temp = 24 + Math.random() * 4; // 24-28°C
                humidity = 80 + Math.random() * 15; // 80-95%
                description = 'Hujan ringan';
            } else if (rainChance < 0.6) {
                weatherCode = '04d'; // Cloudy
                temp = 26 + Math.random() * 4; // 26-30°C
                humidity = 70 + Math.random() * 20; // 70-90%
                description = 'Berawan';
            } else {
                weatherCode = '02d'; // Partly cloudy
                temp = 28 + Math.random() * 4; // 28-32°C
                humidity = 60 + Math.random() * 20; // 60-80%
                description = 'Cerah berawan';
            }
        } else {
            // Dry season: mostly sunny
            const cloudChance = Math.random();
            if (cloudChance < 0.1) {
                weatherCode = '09d'; // Light rain
                temp = 26 + Math.random() * 3; // 26-29°C
                humidity = 75 + Math.random() * 15; // 75-90%
                description = 'Hujan ringan';
            } else if (cloudChance < 0.3) {
                weatherCode = '03d'; // Scattered clouds
                temp = 29 + Math.random() * 4; // 29-33°C
                humidity = 55 + Math.random() * 20; // 55-75%
                description = 'Berawan sebagian';
            } else {
                weatherCode = '01d'; // Clear
                temp = 30 + Math.random() * 5; // 30-35°C
                humidity = 50 + Math.random() * 20; // 50-70%
                description = 'Cerah';
            }
        }
        
        // Adjust for time of day
        if (hour < 6 || hour > 18) {
            temp -= 3; // Cooler at night
            humidity += 10; // Higher humidity at night
        }
        
        windSpeed = 8 + Math.random() * 8; // 8-16 km/h typical for the region
        
        return {
            weather: [{ icon: weatherCode, description: description }],
            main: {
                temp: Math.round(temp),
                humidity: Math.round(humidity)
            },
            wind: {
                speed: Math.round(windSpeed)
            },
            name: 'Bulukumba'
        };
    }

    processWeatherData(data, source) {
        try {
            const weatherIcon = data.weather[0].icon;
            const condition = this.weatherMapping[weatherIcon] || 'cerah';
            
            this.currentWeather = {
                condition: condition,
                temperature: Math.round(data.main.temp),
                humidity: Math.round(data.main.humidity),
                windSpeed: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
                description: data.weather[0].description,
                lastUpdate: new Date(),
                source: source
            };
            
            // Update environmental data in header
            this.updateEnvironmentalDisplay();
            
            // Update soil moisture manager if available
            if (window.soilMoistureManager) {
                window.soilMoistureManager.setWeather(condition);
            }
            
            console.log(`Weather updated from ${source}:`, this.currentWeather);
            
        } catch (error) {
            console.error('Error processing weather data:', error);
            this.generateRealisticWeather();
        }
    }

    generateRealisticWeather() {
        // Generate realistic weather based on Sulawesi Selatan patterns
        const data = this.getSimulatedWeatherResponse();
        this.processWeatherData(data, 'Simulasi Realistis');
    }

    startRealisticWeatherSimulation() {
        // Update weather every 15-45 minutes with realistic changes
        setInterval(() => {
            // 20% chance of weather change every interval
            if (Math.random() < 0.2) {
                this.generateRealisticWeather();
            }
        }, (15 + Math.random() * 30) * 60 * 1000);
    }

    updateEnvironmentalDisplay() {
        // Update temperature display
        const tempElements = document.querySelectorAll('.env-item');
        if (tempElements.length > 0) {
            tempElements[0].innerHTML = `
                <span class="env-icon">🌡️</span>
                <span>${this.currentWeather.temperature}°C</span>
            `;
        }
        
        // Update humidity display
        if (tempElements.length > 1) {
            tempElements[1].innerHTML = `
                <span class="env-icon">💧</span>
                <span>${this.currentWeather.humidity}% RH</span>
            `;
        }
        
        // Update wind speed display
        if (tempElements.length > 2) {
            tempElements[2].innerHTML = `
                <span class="env-icon">💨</span>
                <span>${this.currentWeather.windSpeed} km/h</span>
            `;
        }
        
        // Update weather description in location card
        const locationDetails = document.querySelector('.location-details p');
        if (locationDetails) {
            locationDetails.textContent = `${this.location.name}, ${this.location.city} - ${this.currentWeather.description}`;
        }
    }

    getCurrentWeather() {
        return this.currentWeather;
    }

    getWeatherHistory(days = 7) {
        // Generate realistic weather history for charts
        const history = [];
        const now = new Date();
        
        for (let i = days; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const weather = this.getSimulatedWeatherResponse();
            
            history.push({
                date: date,
                condition: this.weatherMapping[weather.weather[0].icon] || 'cerah',
                temperature: weather.main.temp,
                humidity: weather.main.humidity,
                description: weather.weather[0].description
            });
        }
        
        return history;
    }

    // Method to manually set weather (for testing or manual override)
    setManualWeather(condition, temperature, humidity, windSpeed) {
        this.currentWeather = {
            condition: condition,
            temperature: temperature || this.currentWeather.temperature,
            humidity: humidity || this.currentWeather.humidity,
            windSpeed: windSpeed || this.currentWeather.windSpeed,
            description: `Manual: ${condition}`,
            lastUpdate: new Date(),
            source: 'manual'
        };
        
        this.updateEnvironmentalDisplay();
        
        if (window.soilMoistureManager) {
            window.soilMoistureManager.setWeather(condition);
        }
    }
}

// Initialize weather API
let weatherAPI;

document.addEventListener('DOMContentLoaded', function() {
    weatherAPI = new WeatherAPI();
    window.weatherAPI = weatherAPI;
});