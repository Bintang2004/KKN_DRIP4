// Soil Moisture Management System
class SoilMoistureManager {
    constructor() {
        this.settings = {
            currentMoisture: 45, // percentage
            irrigationDuration: 7, // minutes (configurable)
            moistureIncreaseRate: 2.85, // percentage per minute during irrigation
            moistureDecreaseRate: {
                cerah: 1, // percentage per 15 minutes
                mendung: 1, // percentage per 30 minutes
                hujan: 0 // no decrease during rain
            },
            weather: 'cerah', // cerah, mendung, hujan
            isIrrigating: false,
            irrigationStartTime: null,
            irrigationTargetMoisture: 35, // target moisture after irrigation
            lastUpdate: new Date(),
            autoWeatherChange: true,
            scheduledIrrigations: ['07:00', '16:00'], // 7 AM and 4 PM
            lastIrrigationCheck: new Date()
        };
        
        this.moistureRanges = {
            'Sangat Kering': { min: 0, max: 20, color: '#ef4444', status: 'dry' },
            'Kering': { min: 21, max: 24, color: '#f59e0b', status: 'low' },
            'Lembap (Drip Irrigation)': { min: 25, max: 40, color: '#10b981', status: 'wet' },
            'Basah': { min: 41, max: 69, color: '#3b82f6', status: 'very-wet' },
            'Sangat Basah (Hujan)': { min: 70, max: 100, color: '#8b5cf6', status: 'saturated' }
        };
        
        this.weatherIcons = {
            cerah: '☀️',
            mendung: '☁️',
            hujan: '🌧️'
        };
        
        this.loadSettings();
        this.initializeSystem();
        this.startMoistureSimulation();
        this.startScheduledIrrigationCheck();
    }

    loadSettings() {
        const saved = localStorage.getItem('soilMoistureSettings');
        if (saved) {
            const savedSettings = JSON.parse(saved);
            // Ensure all numeric values are valid
            if (typeof savedSettings.currentMoisture === 'number' && !isNaN(savedSettings.currentMoisture)) {
                this.settings.currentMoisture = savedSettings.currentMoisture;
            }
            if (typeof savedSettings.irrigationDuration === 'number' && !isNaN(savedSettings.irrigationDuration)) {
                this.settings.irrigationDuration = savedSettings.irrigationDuration;
            }
            // Copy other valid settings
            this.settings.weather = savedSettings.weather || this.settings.weather;
            this.settings.isIrrigating = savedSettings.isIrrigating || false;
            this.settings.scheduledIrrigations = savedSettings.scheduledIrrigations || this.settings.scheduledIrrigations;
        }
        
        // Sync with irrigation settings if available
        const irrigationSettings = localStorage.getItem('irrigationSettings');
        if (irrigationSettings) {
            const parsed = JSON.parse(irrigationSettings);
            if (parsed.irrigation) {
                this.settings.irrigationDuration = parsed.irrigation.duration || this.settings.irrigationDuration;
            }
            if (parsed.waterLevel) {
                this.settings.scheduledIrrigations = [
                    parsed.waterLevel.schedule1 || '07:00',
                    parsed.waterLevel.schedule2 || '16:00'
                ];
            }
        }
        
        // Ensure currentMoisture is a valid number
        if (typeof this.settings.currentMoisture !== 'number' || isNaN(this.settings.currentMoisture) || this.settings.currentMoisture < 0 || this.settings.currentMoisture > 100) {
            this.settings.currentMoisture = 45;
        }
        
        // Ensure irrigationDuration is valid
        if (typeof this.settings.irrigationDuration !== 'number' || isNaN(this.settings.irrigationDuration) || this.settings.irrigationDuration <= 0) {
            this.settings.irrigationDuration = 7;
        }
    }

    saveSettings() {
        // Validate data before saving
        const settingsToSave = {
            ...this.settings,
            currentMoisture: typeof this.settings.currentMoisture === 'number' && !isNaN(this.settings.currentMoisture) ? this.settings.currentMoisture : 45,
            irrigationDuration: typeof this.settings.irrigationDuration === 'number' && !isNaN(this.settings.irrigationDuration) ? this.settings.irrigationDuration : 7
        };
        localStorage.setItem('soilMoistureSettings', JSON.stringify(this.settings));
    }

    initializeSystem() {
        this.updateDisplay();
        this.createWeatherControl();
        
        // Listen for irrigation events from water volume manager
        if (window.waterVolumeManager) {
            this.setupIrrigationListener();
        }
        
        // Listen for weather updates from WeatherAPI
        this.setupWeatherListener();
    }

    createWeatherControl() {
        // Add weather control to the soil moisture card
        const soilCard = document.querySelector('.metric-card:nth-child(2)');
        if (soilCard && !document.getElementById('weather-control')) {
            const weatherControl = document.createElement('div');
            weatherControl.id = 'weather-control';
            weatherControl.className = 'weather-control';
            weatherControl.innerHTML = `
                <div class="weather-header">
                    <span class="weather-label">Cuaca:</span>
                    <span class="weather-display" id="weather-display">${this.weatherIcons[this.settings.weather]} ${this.settings.weather.charAt(0).toUpperCase() + this.settings.weather.slice(1)}</span>
                </div>
                <div class="weather-buttons">
                    <button class="weather-btn ${this.settings.weather === 'cerah' ? 'active' : ''}" onclick="soilMoistureManager.setWeather('cerah')">☀️ Cerah</button>
                    <button class="weather-btn ${this.settings.weather === 'mendung' ? 'active' : ''}" onclick="soilMoistureManager.setWeather('mendung')">☁️ Mendung</button>
                    <button class="weather-btn ${this.settings.weather === 'hujan' ? 'active' : ''}" onclick="soilMoistureManager.setWeather('hujan')">🌧️ Hujan</button>
                </div>
            `;
            
            soilCard.appendChild(weatherControl);
        }
    }

    setupWeatherListener() {
        // Check for weather updates every minute
        setInterval(() => {
            if (window.weatherAPI) {
                const currentWeather = window.weatherAPI.getCurrentWeather();
                if (currentWeather.condition !== this.settings.weather) {
                    this.settings.weather = currentWeather.condition;
                    this.updateWeatherDisplay();
                    this.saveSettings();
                }
            }
        }, 60000);
    }

    updateWeatherDisplay() {
        const weatherDisplay = document.getElementById('weather-display');
        if (weatherDisplay) {
            weatherDisplay.textContent = `${this.weatherIcons[this.settings.weather]} ${this.settings.weather.charAt(0).toUpperCase() + this.settings.weather.slice(1)}`;
        }
        this.updateWeatherButtons();
    }

    setupIrrigationListener() {
        // Override the performIrrigation method to trigger soil moisture increase
        const originalPerformIrrigation = window.waterVolumeManager.performIrrigation.bind(window.waterVolumeManager);
        
        window.waterVolumeManager.performIrrigation = () => {
            const result = originalPerformIrrigation();
            if (window.waterVolumeManager.settings.currentLevel >= window.waterVolumeManager.settings.irrigationVolume) {
                this.startIrrigation();
            }
            return result;
        };
    }

    startScheduledIrrigationCheck() {
        // Check every minute for scheduled irrigations
        setInterval(() => {
            this.checkScheduledIrrigation();
        }, 60000);
    }

    checkScheduledIrrigation() {
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        // Check if it's time for scheduled irrigation
        if (this.settings.scheduledIrrigations.includes(currentTime)) {
            const lastCheck = new Date(this.settings.lastIrrigationCheck);
            const timeSinceLastCheck = (now - lastCheck) / 1000 / 60; // minutes
            
            // Only trigger if we haven't checked in the last 2 minutes (prevent multiple triggers)
            if (timeSinceLastCheck > 2) {
                this.settings.lastIrrigationCheck = now;
                this.saveSettings();
                
                // Check if water level is sufficient and auto irrigation is enabled
                if (window.waterVolumeManager && 
                    window.waterVolumeManager.settings.currentLevel >= window.waterVolumeManager.settings.irrigationVolume) {
                    
                    // Check if soil moisture is low enough to warrant irrigation
                    if (this.settings.currentMoisture < 40) {
                        this.startIrrigation();
                        this.showNotification(`🕐 Penyiraman terjadwal ${currentTime} dimulai`, 'success');
                    } else {
                        this.showNotification(`🕐 Penyiraman terjadwal ${currentTime} dilewati - tanah masih lembap`, 'info');
                    }
                } else {
                    this.showNotification(`🕐 Penyiraman terjadwal ${currentTime} gagal - air tidak cukup`, 'error');
                }
            }
        }
    }

    startIrrigation() {
        if (this.settings.isIrrigating) return;
        
        // Ensure currentMoisture is valid before starting irrigation
        if (typeof this.settings.currentMoisture !== 'number' || isNaN(this.settings.currentMoisture)) {
            this.settings.currentMoisture = 45;
        }
        
        this.settings.isIrrigating = true;
        this.settings.irrigationStartTime = new Date();
        
        // Calculate target moisture and increase rate
        const currentMoisture = this.settings.currentMoisture;
        const targetMoisture = Math.min(40, Math.max(25, currentMoisture + 15)); // Target 25-40% range
        this.settings.irrigationTargetMoisture = targetMoisture;
        
        // Calculate increase rate: (target - current) / duration
        const duration = typeof this.settings.irrigationDuration === 'number' && !isNaN(this.settings.irrigationDuration) ? this.settings.irrigationDuration : 7;
        this.settings.moistureIncreaseRate = Math.max(0.5, (targetMoisture - currentMoisture) / duration);
        
        this.saveSettings();
        
        this.showNotification(`🌱 Drip irrigation dimulai (${duration} menit)`, 'success');
        
        // Stop irrigation after duration
        setTimeout(() => {
            this.stopIrrigation();
        }, duration * 60 * 1000);
    }

    stopIrrigation() {
        if (!this.settings.isIrrigating) return;
        
        this.settings.isIrrigating = false;
        this.settings.irrigationStartTime = null;
        this.saveSettings();
        
        this.showNotification('🌱 Drip irrigation selesai', 'success');
        
        // Log the irrigation event
        this.logMoisture('irrigation_complete');
    }

    setWeather(weather) {
        const oldWeather = this.settings.weather;
        this.settings.weather = weather;
        this.saveSettings();
        
        // Update weather display
        const weatherDisplay = document.getElementById('weather-display');
        if (weatherDisplay) {
            weatherDisplay.textContent = `${this.weatherIcons[weather]} ${weather.charAt(0).toUpperCase() + weather.slice(1)}`;
        }
        
        // Update active button
        this.updateWeatherButtons();
        
        // Handle rain effect
        if (weather === 'hujan' && oldWeather !== 'hujan') {
            this.applyRainEffect();
        }
        
        this.showNotification(`Cuaca diubah ke ${weather}`, 'success');
    }

    applyRainEffect() {
        // Rain immediately increases moisture to 70-90%
        const rainMoisture = 70 + Math.random() * 20; // 70-90%
        this.settings.currentMoisture = Math.min(100, Math.max(0, rainMoisture));
        this.updateDisplay();
        this.saveSettings();
        this.logMoisture('rain_event');
        this.showNotification('🌧️ Hujan meningkatkan kelembaban tanah!', 'success');
    }

    startMoistureSimulation() {
        // Update moisture every 30 seconds for smooth transitions
        this.moistureInterval = setInterval(() => {
            this.updateMoisture();
        }, 30000);
    }

    updateWeatherButtons() {
        document.querySelectorAll('.weather-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Find and activate the correct button
        const buttons = document.querySelectorAll('.weather-btn');
        buttons.forEach(btn => {
            if (btn.textContent.toLowerCase().includes(this.settings.weather)) {
                btn.classList.add('active');
            }
        });
    }

    updateMoisture() {
        const now = new Date();
        const lastUpdate = this.settings.lastUpdate ? new Date(this.settings.lastUpdate) : new Date(now.getTime() - 30000);
        const timeDiff = (now - lastUpdate) / 1000 / 60; // minutes
        
        // Prevent excessive time differences (max 1 hour)
        const actualTimeDiff = Math.min(timeDiff, 60);
        
        // Ensure currentMoisture is valid before calculations
        if (typeof this.settings.currentMoisture !== 'number' || isNaN(this.settings.currentMoisture)) {
            this.settings.currentMoisture = 45;
        }
        
        if (this.settings.isIrrigating) {
            // Increase moisture during irrigation
            const irrigationStartTime = this.settings.irrigationStartTime ? new Date(this.settings.irrigationStartTime) : now;
            const irrigationTime = (now - irrigationStartTime) / 1000 / 60; // minutes
            if (irrigationTime <= this.settings.irrigationDuration) {
                // Gradual increase based on calculated rate
                const increaseRate = typeof this.settings.moistureIncreaseRate === 'number' && !isNaN(this.settings.moistureIncreaseRate) ? this.settings.moistureIncreaseRate : 2.85;
                const increaseAmount = increaseRate * actualTimeDiff;
                this.settings.currentMoisture = Math.min(100, this.settings.currentMoisture + increaseAmount);
                this.settings.currentMoisture = Math.min(100, this.settings.currentMoisture);
            }
        } else if (this.settings.weather !== 'hujan') {
            // Decrease moisture based on weather (evaporation)
            let decreaseRate = 0;
            let interval = 15; // default interval in minutes
            
            switch (this.settings.weather) {
                case 'cerah':
                    decreaseRate = this.settings.moistureDecreaseRate.cerah; // 1% per 15 minutes
                    interval = 15;
                    break;
                case 'mendung':
                    decreaseRate = this.settings.moistureDecreaseRate.mendung; // 1% per 30 minutes
                    interval = 30;
                    break;
            }
            
            // Calculate decrease based on time passed
            const decreaseAmount = (decreaseRate * actualTimeDiff) / interval;
            this.settings.currentMoisture = Math.max(0, this.settings.currentMoisture - decreaseAmount);
            this.settings.currentMoisture = Math.max(0, this.settings.currentMoisture);
        }
        
        // Ensure final value is valid
        if (typeof this.settings.currentMoisture !== 'number' || isNaN(this.settings.currentMoisture)) {
            this.settings.currentMoisture = 45;
        }
        
        // Clamp values to valid range
        this.settings.currentMoisture = Math.max(0, Math.min(100, this.settings.currentMoisture));
        
        this.settings.lastUpdate = now;
        this.saveSettings();
        this.updateDisplay();
        
        // Log moisture changes periodically
        if (Math.random() < 0.1) { // 10% chance to log each update
            this.logMoisture('periodic_update');
        }
    }

    updateDisplay() {
        // Ensure currentMoisture is a valid number
        if (typeof this.settings.currentMoisture !== 'number' || isNaN(this.settings.currentMoisture) || this.settings.currentMoisture < 0 || this.settings.currentMoisture > 100) {
            this.settings.currentMoisture = 45;
            this.saveSettings();
        }
        
        // Update soil moisture value
        const soilMoistureValue = document.getElementById('soil-moisture-value');
        if (soilMoistureValue) {
            const moistureValue = parseFloat(this.settings.currentMoisture);
            if (!isNaN(moistureValue)) {
                soilMoistureValue.textContent = `${moistureValue.toFixed(1)}%`;
            } else {
                soilMoistureValue.textContent = '45.0%';
                this.settings.currentMoisture = 45;
                this.saveSettings();
            }
        }
        
        // Update status badge
        const statusBadge = document.querySelector('.metric-card:nth-child(2) .status-badge');
        if (statusBadge) {
            const range = this.getMoistureRange(this.settings.currentMoisture);
            statusBadge.textContent = range.status.toUpperCase();
            statusBadge.className = `status-badge ${range.status}`;
        }
        
        // Update irrigation status if currently irrigating
        if (this.settings.isIrrigating) {
            const irrigationCard = document.querySelector('.metric-card:nth-child(3)');
            if (irrigationCard) {
                const statusBadge = irrigationCard.querySelector('.status-badge');
                const metricValue = irrigationCard.querySelector('.metric-value');
                
                if (statusBadge) {
                    statusBadge.textContent = 'IRRIGATING';
                    statusBadge.className = 'status-badge running';
                }
                if (metricValue) metricValue.textContent = 'Drip Active';
            }
        } else {
            // Reset irrigation status when not irrigating
            const irrigationCard = document.querySelector('.metric-card:nth-child(3)');
            if (irrigationCard) {
                const statusBadge = irrigationCard.querySelector('.status-badge');
                const metricValue = irrigationCard.querySelector('.metric-value');
                
                if (statusBadge) {
                    statusBadge.textContent = 'STANDBY';
                    statusBadge.className = 'status-badge running';
                }
                if (metricValue) metricValue.textContent = 'Ready';
            }
        }
    }

    getMoistureRange(moisture) {
        for (const [name, range] of Object.entries(this.moistureRanges)) {
            if (moisture >= range.min && moisture <= range.max) {
                return { ...range, name };
            }
        }
        return this.moistureRanges['Sangat Kering']; // fallback
    }

    getChartData(period) {
        // Generate realistic chart data based on irrigation and weather patterns
        const logs = JSON.parse(localStorage.getItem('soilMoistureLogs') || '[]');
        const now = new Date();
        let startDate;
        
        switch (period) {
            case 'daily':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'weekly':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'monthly':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        }
        
        // Generate simulated data if no logs exist or insufficient data
        if (logs.length < 10) {
            return this.generateSimulatedData(startDate, now, period);
        }
        
        const filteredLogs = logs.filter(log => new Date(log.timestamp) >= startDate);
        
        const chartData = [];
        filteredLogs.forEach(log => {
            chartData.push({
                x: new Date(log.timestamp),
                y: log.moisture
            });
        });
        
        // Add current moisture as end point
        chartData.push({
            x: now,
            y: this.settings.currentMoisture
        });
        
        return chartData;
    }

    generateSimulatedData(startDate, endDate, period) {
        const data = [];
        const intervalMinutes = period === 'daily' ? 30 : period === 'weekly' ? 180 : 720; // 30min, 3h, 12h
        
        let currentTime = new Date(startDate);
        let moisture = 20 + Math.random() * 15; // Start with 20-35%
        
        while (currentTime <= endDate) {
            const hour = currentTime.getHours();
            const minute = currentTime.getMinutes();
            
            // Simulate irrigation at scheduled times
            if ((hour === 7 || hour === 16) && minute === 0) {
                // Irrigation event - gradual increase over 7 minutes
                for (let i = 0; i <= 7; i++) {
                    const irrigationTime = new Date(currentTime.getTime() + i * 60 * 1000);
                    moisture += 2.5; // Increase by ~2.5% per minute
                    moisture = Math.min(40, moisture);
                    
                    data.push({
                        x: new Date(irrigationTime),
                        y: parseFloat(moisture.toFixed(1))
                    });
                }
            } else {
                // Natural decrease based on time of day and weather simulation
                let decreaseRate = 0.5; // Base rate
                
                // Simulate weather effects
                if (hour >= 10 && hour <= 16) {
                    decreaseRate = 1.0; // Faster evaporation during hot hours
                } else if (hour >= 18 || hour <= 6) {
                    decreaseRate = 0.2; // Slower at night
                }
                
                // Random weather events
                if (Math.random() < 0.05) { // 5% chance of rain
                    moisture = 75 + Math.random() * 15; // Rain effect
                } else {
                    moisture -= decreaseRate * (intervalMinutes / 30);
                    moisture = Math.max(5, moisture);
                }
            }
            
            data.push({
                x: new Date(currentTime),
                y: parseFloat(moisture.toFixed(1))
            });
            
            currentTime = new Date(currentTime.getTime() + intervalMinutes * 60 * 1000);
        }
        
        return data;
    }

    logMoisture(eventType = 'update') {
        const logs = JSON.parse(localStorage.getItem('soilMoistureLogs') || '[]');
        logs.push({
            timestamp: new Date().toISOString(),
            moisture: this.settings.currentMoisture,
            weather: this.settings.weather,
            isIrrigating: this.settings.isIrrigating,
            eventType: eventType
        });
        
        // Keep only last 1000 logs
        if (logs.length > 1000) {
            logs.splice(0, logs.length - 1000);
        }
        
        localStorage.setItem('soilMoistureLogs', JSON.stringify(logs));
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 12px;
            color: white;
            font-weight: 600;
            z-index: 1001;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
            font-size: 14px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        `;
        
        if (type === 'success') {
            notification.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        } else if (type === 'info') {
            notification.style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)';
        } else {
            notification.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        
        // Validate numeric settings
        if (typeof this.settings.currentMoisture !== 'number' || isNaN(this.settings.currentMoisture)) {
            this.settings.currentMoisture = 45;
        }
        
        // Update irrigation duration and recalculate rates if needed
        if (newSettings.irrigationDuration) {
            const duration = parseFloat(newSettings.irrigationDuration);
            if (!isNaN(duration) && duration > 0) {
                this.settings.irrigationDuration = duration;
            }
        }
        
        // Update scheduled irrigation times
        if (newSettings.scheduledIrrigations) {
            this.settings.scheduledIrrigations = newSettings.scheduledIrrigations;
        }
        
        this.saveSettings();
        this.updateDisplay();
    }

    // Manual irrigation trigger (for testing)
    triggerManualIrrigation() {
        if (!this.settings.isIrrigating) {
            this.startIrrigation();
        }
    }

    // Get current moisture status for other systems
    getCurrentMoistureStatus() {
        // Ensure valid data before returning
        if (typeof this.settings.currentMoisture !== 'number' || isNaN(this.settings.currentMoisture)) {
            this.settings.currentMoisture = 45;
            this.saveSettings();
        }
        
        return {
            moisture: this.settings.currentMoisture,
            range: this.getMoistureRange(this.settings.currentMoisture),
            isIrrigating: this.settings.isIrrigating,
            weather: this.settings.weather
        };
    }
}

// Initialize soil moisture manager
let soilMoistureManager;

document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for water volume manager to initialize first
    setTimeout(() => {
        // Clear any corrupted data first
        const saved = localStorage.getItem('soilMoistureSettings');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (typeof parsed.currentMoisture !== 'number' || isNaN(parsed.currentMoisture)) {
                    localStorage.removeItem('soilMoistureSettings');
                }
            } catch (e) {
                localStorage.removeItem('soilMoistureSettings');
            }
        }
        
        soilMoistureManager = new SoilMoistureManager();
        window.soilMoistureManager = soilMoistureManager;
    }, 500);
});