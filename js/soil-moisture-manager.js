// Soil Moisture Management System
class SoilMoistureManager {
    constructor() {
        this.settings = {
            currentMoisture: 45, // percentage
            irrigationDuration: 7, // minutes
            moistureIncreaseRate: 2, // percentage per minute during irrigation
            moistureDecreaseRate: {
                cerah: 1, // percentage per 15 minutes
                mendung: 1, // percentage per 30 minutes
                hujan: 0 // no decrease during rain
            },
            weather: 'cerah', // cerah, mendung, hujan
            isIrrigating: false,
            irrigationStartTime: null,
            lastUpdate: new Date(),
            autoWeatherChange: true
        };
        
        this.moistureRanges = {
            'Sangat Kering': { min: 0, max: 20, color: '#ef4444', status: 'dry' },
            'Kering': { min: 21, max: 40, color: '#f59e0b', status: 'low' },
            'Lembap (Drip Irrigation)': { min: 41, max: 60, color: '#10b981', status: 'wet' },
            'Basah': { min: 61, max: 80, color: '#3b82f6', status: 'very-wet' },
            'Sangat Basah (Hujan)': { min: 81, max: 100, color: '#8b5cf6', status: 'saturated' }
        };
        
        this.weatherIcons = {
            cerah: '☀️',
            mendung: '☁️',
            hujan: '🌧️'
        };
        
        this.loadSettings();
        this.initializeSystem();
        this.startMoistureSimulation();
        // Weather is now managed by WeatherAPI
        // this.startWeatherSimulation();
    }

    loadSettings() {
        const saved = localStorage.getItem('soilMoistureSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
        
        // Sync with irrigation settings if available
        const irrigationSettings = localStorage.getItem('irrigationSettings');
        if (irrigationSettings) {
            const parsed = JSON.parse(irrigationSettings);
            if (parsed.irrigation) {
                this.settings.irrigationDuration = parsed.irrigation.duration || this.settings.irrigationDuration;
            }
        }
    }

    saveSettings() {
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
            
            // Add styles
            const style = document.createElement('style');
            style.textContent = `
                .weather-control {
                    margin-top: 16px;
                    padding: 12px;
                    background: var(--bg-gray-50);
                    border-radius: var(--radius-md);
                    border: 1px solid var(--border-gray);
                }
                
                .weather-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                }
                
                .weather-label {
                    font-size: 12px;
                    font-weight: 600;
                    color: var(--text-gray);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                .weather-display {
                    font-size: 14px;
                    font-weight: 700;
                    color: var(--text-dark);
                }
                
                .weather-buttons {
                    display: flex;
                    gap: 4px;
                }
                
                .weather-btn {
                    flex: 1;
                    background: white;
                    border: 1px solid var(--border-gray);
                    padding: 6px 8px;
                    border-radius: var(--radius-sm);
                    font-size: 11px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    color: var(--text-gray);
                }
                
                .weather-btn:hover {
                    background: var(--bg-gray-50);
                    color: var(--text-dark);
                }
                
                .weather-btn.active {
                    background: var(--success-green);
                    color: white;
                    border-color: var(--success-green);
                }
            `;
            
            if (!document.getElementById('weather-styles')) {
                style.id = 'weather-styles';
                document.head.appendChild(style);
            }
            
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

    startIrrigation() {
        if (this.settings.isIrrigating) return;
        
        this.settings.isIrrigating = true;
        this.settings.irrigationStartTime = new Date();
        this.saveSettings();
        
        this.showNotification('🌱 Drip irrigation dimulai', 'success');
        
        // Stop irrigation after duration
        setTimeout(() => {
            this.stopIrrigation();
        }, this.settings.irrigationDuration * 60 * 1000);
    }

    stopIrrigation() {
        if (!this.settings.isIrrigating) return;
        
        this.settings.isIrrigating = false;
        this.settings.irrigationStartTime = null;
        this.saveSettings();
        
        this.showNotification('🌱 Drip irrigation selesai', 'success');
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
        document.querySelectorAll('.weather-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        // Handle rain effect
        if (weather === 'hujan' && oldWeather !== 'hujan') {
            this.applyRainEffect();
        }
        
        this.showNotification(`Cuaca diubah ke ${weather}`, 'success');
    }

    applyRainEffect() {
        // Rain immediately increases moisture to 70-90%
        const rainMoisture = 70 + Math.random() * 20; // 70-90%
        this.settings.currentMoisture = Math.min(100, rainMoisture);
        this.updateDisplay();
        this.showNotification('🌧️ Hujan meningkatkan kelembaban tanah!', 'success');
    }

    startMoistureSimulation() {
        // Update moisture every 30 seconds
        this.moistureInterval = setInterval(() => {
            this.updateMoisture();
        }, 30000);
    }

    updateWeatherButtons() {
        document.querySelectorAll('.weather-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.querySelector(`.weather-btn[onclick*="${this.settings.weather}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    }

    updateMoisture() {
        const now = new Date();
        const timeDiff = (now - this.settings.lastUpdate) / 1000 / 60; // minutes
        
        if (this.settings.isIrrigating) {
            // Increase moisture during irrigation
            const irrigationTime = (now - this.settings.irrigationStartTime) / 1000 / 60; // minutes
            if (irrigationTime <= this.settings.irrigationDuration) {
                this.settings.currentMoisture += this.settings.moistureIncreaseRate * (timeDiff / 30); // Adjust for 30-second intervals
                this.settings.currentMoisture = Math.min(100, this.settings.currentMoisture);
            }
        } else if (this.settings.weather !== 'hujan') {
            // Decrease moisture based on weather
            let decreaseRate = 0;
            let interval = 15; // default interval in minutes
            
            switch (this.settings.weather) {
                case 'cerah':
                    decreaseRate = this.settings.moistureDecreaseRate.cerah;
                    interval = 15;
                    break;
                case 'mendung':
                    decreaseRate = this.settings.moistureDecreaseRate.mendung;
                    interval = 30;
                    break;
            }
            
            // Calculate decrease based on time passed
            const decreaseAmount = (decreaseRate * timeDiff) / interval;
            this.settings.currentMoisture -= decreaseAmount;
            this.settings.currentMoisture = Math.max(0, this.settings.currentMoisture);
        }
        
        this.settings.lastUpdate = now;
        this.saveSettings();
        this.updateDisplay();
    }

    updateDisplay() {
        // Update soil moisture value
        const soilMoistureValue = document.getElementById('soil-moisture-value');
        if (soilMoistureValue) {
            soilMoistureValue.textContent = `${this.settings.currentMoisture.toFixed(1)}%`;
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
                
                if (statusBadge) statusBadge.textContent = 'IRRIGATING';
                if (metricValue) metricValue.textContent = 'Drip Active';
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
        
        // Generate simulated data if no logs exist
        if (logs.length === 0) {
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
        const intervalMinutes = period === 'daily' ? 60 : period === 'weekly' ? 360 : 1440; // 1h, 6h, 24h
        
        let currentTime = new Date(startDate);
        let moisture = 30 + Math.random() * 20; // Start with 30-50%
        
        while (currentTime <= endDate) {
            // Simulate irrigation at 7 AM and 4 PM
            const hour = currentTime.getHours();
            if ((hour === 7 || hour === 16) && currentTime.getMinutes() === 0) {
                moisture = Math.min(100, moisture + 15 + Math.random() * 10); // Irrigation boost
            } else {
                // Natural decrease
                moisture -= 0.5 + Math.random() * 1;
                moisture = Math.max(0, moisture);
            }
            
            data.push({
                x: new Date(currentTime),
                y: parseFloat(moisture.toFixed(1))
            });
            
            currentTime = new Date(currentTime.getTime() + intervalMinutes * 60 * 1000);
        }
        
        return data;
    }

    logMoisture() {
        const logs = JSON.parse(localStorage.getItem('soilMoistureLogs') || '[]');
        logs.push({
            timestamp: new Date().toISOString(),
            moisture: this.settings.currentMoisture,
            weather: this.settings.weather,
            isIrrigating: this.settings.isIrrigating
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
        this.saveSettings();
        this.updateDisplay();
    }
}

// Initialize soil moisture manager
let soilMoistureManager;

document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for water volume manager to initialize first
    setTimeout(() => {
        soilMoistureManager = new SoilMoistureManager();
        window.soilMoistureManager = soilMoistureManager;
    }, 500);
});