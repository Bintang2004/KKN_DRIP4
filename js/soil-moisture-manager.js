// Soil Moisture Management System
class SoilMoistureManager {
    constructor() {
        this.settings = {
            currentMoisture: 45, // percentage
            irrigationDuration: 15, // minutes (configurable from settings)
            moistureIncreaseRate: 2.0, // percentage per minute during irrigation
            moistureDecreaseRate: {
                cerah: 1, // percentage per 15 minutes (faster evaporation)
                mendung: 1, // percentage per 30 minutes (slower evaporation)
                hujan: 0 // no decrease during rain
            },
            weather: 'cerah', // cerah, mendung, hujan
            isIrrigating: false,
            irrigationStartTime: null,
            irrigationTargetMoisture: 40, // target moisture after irrigation (25-40% range)
            lastUpdate: new Date(),
            autoWeatherChange: true,
            scheduledIrrigations: ['07:00', '16:00'], // 7 AM and 4 PM
            lastIrrigationCheck: new Date(),
            lastMoistureDecrease: new Date(),
            moistureDecreaseAccumulator: 0 // Track partial decreases
        };
        
        this.moistureRanges = {
            'Sangat Kering': { min: 0, max: 15, color: '#ef4444', status: 'dry' },
            'Kering': { min: 16, max: 24, color: '#f59e0b', status: 'low' },
            'Optimal (Drip Irrigation)': { min: 25, max: 40, color: '#10b981', status: 'wet' },
            'Lembap': { min: 41, max: 69, color: '#3b82f6', status: 'very-wet' },
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
        // Load saved settings from localStorage
        const saved = localStorage.getItem('soilMoistureSettings');
        if (saved) {
            try {
                const savedSettings = JSON.parse(saved);
                // Merge saved settings with defaults, ensuring data integrity
                Object.keys(savedSettings).forEach(key => {
                    if (key === 'currentMoisture' && (typeof savedSettings[key] !== 'number' || isNaN(savedSettings[key]))) {
                        // Skip corrupted moisture data
                        return;
                    }
                    if (this.settings.hasOwnProperty(key)) {
                        this.settings[key] = savedSettings[key];
                    }
                });
            } catch (e) {
                console.warn('Failed to load soil moisture settings:', e);
            }
        }

        // Sync with global irrigation settings if available
        if (typeof window !== 'undefined' && window.irrigationSettings) {
            const globalSettings = window.irrigationSettings.getCurrentSettings();
            if (globalSettings) {
                this.settings.irrigationDuration = globalSettings.irrigation?.duration || this.settings.irrigationDuration;
                
                // Extract schedule times from waterLevel schedules
                if (globalSettings.waterLevel?.schedule1 && globalSettings.waterLevel?.schedule2) {
                    const schedules = [];
                    if (globalSettings.waterLevel.schedule1Enabled) {
                        schedules.push(globalSettings.waterLevel.schedule1);
                    }
                    if (globalSettings.waterLevel.schedule2Enabled) {
                        schedules.push(globalSettings.waterLevel.schedule2);
                    }
                    this.settings.scheduledIrrigations = schedules;
                }
            }
        }
    }

    saveSettings() {
        localStorage.setItem('soilMoistureSettings', JSON.stringify(this.settings));
    }

    initializeSystem() {
        this.updateDisplay();
        this.insertWeatherControl();
    }

    startMoistureSimulation() {
        // Simulate moisture changes every 30 seconds
        this.moistureInterval = setInterval(() => {
            this.updateMoisture();
        }, 30000);
    }

    startScheduledIrrigationCheck() {
        // Check for scheduled irrigations every minute
        this.scheduleInterval = setInterval(() => {
            this.checkScheduledIrrigation();
        }, 60000);
    }

    updateMoisture() {
        const now = new Date();
        const timeDiff = now - this.settings.lastUpdate;
        const minutesPassed = timeDiff / (1000 * 60);

        if (this.settings.isIrrigating) {
            // Increase moisture during irrigation
            const increase = this.settings.moistureIncreaseRate * minutesPassed;
            this.settings.currentMoisture = Math.min(100, this.settings.currentMoisture + increase);
            
            // Check if irrigation should stop
            if (this.settings.currentMoisture >= this.settings.irrigationTargetMoisture || 
                (now - this.settings.irrigationStartTime) >= (this.settings.irrigationDuration * 60 * 1000)) {
                this.stopIrrigation();
            }
        } else {
            // Decrease moisture based on weather
            let decreaseRate = 0;
            switch (this.settings.weather) {
                case 'cerah':
                    decreaseRate = this.settings.moistureDecreaseRate.cerah / 15; // per minute
                    break;
                case 'mendung':
                    decreaseRate = this.settings.moistureDecreaseRate.mendung / 30; // per minute
                    break;
                case 'hujan':
                    // Increase moisture during rain
                    this.settings.currentMoisture = Math.min(100, this.settings.currentMoisture + 0.5 * minutesPassed);
                    break;
            }
            
            if (decreaseRate > 0) {
                this.settings.currentMoisture = Math.max(0, this.settings.currentMoisture - (decreaseRate * minutesPassed));
            }
        }

        this.settings.lastUpdate = now;
        this.updateDisplay();
        this.saveSettings();
    }

    checkScheduledIrrigation() {
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        if (this.settings.scheduledIrrigations.includes(currentTime) && !this.settings.isIrrigating) {
            // Check if irrigation is needed
            if (this.shouldTriggerIrrigation()) {
                this.startIrrigation();
            }
        }
    }

    shouldTriggerIrrigation() {
        // Check if soil moisture is below optimal range
        return this.settings.currentMoisture < 35 && !this.settings.isIrrigating;
    }

    startIrrigation() {
        if (this.settings.isIrrigating) return;
        
        this.settings.isIrrigating = true;
        this.settings.irrigationStartTime = new Date();
        this.settings.irrigationTargetMoisture = Math.min(65, this.settings.currentMoisture + 25);
        
        this.updateDisplay();
        this.saveSettings();
        
        console.log('🌱 Soil irrigation started');
    }

    stopIrrigation() {
        this.settings.isIrrigating = false;
        this.settings.irrigationStartTime = null;
        
        this.updateDisplay();
        this.saveSettings();
        
        console.log('🌱 Soil irrigation stopped');
    }

    setWeather(weather) {
        if (['cerah', 'mendung', 'hujan'].includes(weather)) {
            this.settings.weather = weather;
            this.updateDisplay();
            this.saveSettings();
        }
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

        // Update weather control if it exists
        this.updateWeatherControl();
    }

    getMoistureRange(moisture) {
        for (const [name, range] of Object.entries(this.moistureRanges)) {
            if (moisture >= range.min && moisture <= range.max) {
                return range;
            }
        }
        return this.moistureRanges['Sangat Kering']; // fallback
    }

    insertWeatherControl() {
        const soilCard = document.querySelector('.metric-card:nth-child(2)');
        if (soilCard && !document.getElementById('weather-control')) {
            const weatherControl = document.createElement('div');
            weatherControl.id = 'weather-control';
            weatherControl.className = 'weather-control';
            weatherControl.innerHTML = `
                <div class="weather-label">Cuaca Saat Ini</div>
                <div class="weather-buttons">
                    <button class="weather-btn ${this.settings.weather === 'cerah' ? 'active' : ''}" 
                            onclick="soilMoistureManager.setWeather('cerah')">
                        ☀️ Cerah
                    </button>
                    <button class="weather-btn ${this.settings.weather === 'mendung' ? 'active' : ''}" 
                            onclick="soilMoistureManager.setWeather('mendung')">
                        ☁️ Mendung
                    </button>
                    <button class="weather-btn ${this.settings.weather === 'hujan' ? 'active' : ''}" 
                            onclick="soilMoistureManager.setWeather('hujan')">
                        🌧️ Hujan
                    </button>
                </div>
            `;
            
            // Insert after metric description
            const metricDescription = soilCard.querySelector('.metric-description');
            if (metricDescription) {
                metricDescription.parentNode.insertBefore(weatherControl, metricDescription.nextSibling);
            }
        }
    }

    updateWeatherControl() {
        const weatherButtons = document.querySelectorAll('.weather-btn');
        weatherButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.textContent.includes(this.weatherIcons[this.settings.weather])) {
                btn.classList.add('active');
            }
        });
    }

    getCurrentMoistureStatus() {
        return {
            moisture: this.settings.currentMoisture,
            status: this.getMoistureRange(this.settings.currentMoisture).status,
            isIrrigating: this.settings.isIrrigating,
            weather: this.settings.weather
        };
    }

    updateSettings(newSettings) {
        // Update settings with validation
        if (newSettings.irrigationDuration) {
            this.settings.irrigationDuration = newSettings.irrigationDuration;
        }
        if (newSettings.scheduledIrrigations) {
            this.settings.scheduledIrrigations = newSettings.scheduledIrrigations;
        }
        if (newSettings.forceSync) {
            this.forceSyncScheduledIrrigations();
        }
        
        this.saveSettings();
        this.updateDisplay();
    }

    forceSyncScheduledIrrigations() {
        // Sync with water volume manager schedules
        if (window.waterVolumeManager) {
            const waterSchedules = window.waterVolumeManager.settings.schedules
                .filter(schedule => schedule.enabled)
                .map(schedule => schedule.time);
            
            this.settings.scheduledIrrigations = waterSchedules;
            this.saveSettings();
            
            console.log('🔄 Soil manager schedules synced:', this.settings.scheduledIrrigations);
        }
    }

    updateNextScheduleDisplay() {
        // This method is called by other managers to update schedule display
        // Implementation can be added if needed for soil-specific schedule display
    }

    getChartData(period) {
        // Generate mock chart data for soil moisture
        const now = new Date();
        const data = [];
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
        
        // Generate realistic moisture data
        const points = period === 'daily' ? 24 : period === 'weekly' ? 168 : 720;
        const timeStep = (now - startDate) / points;
        
        for (let i = 0; i <= points; i++) {
            const time = new Date(startDate.getTime() + (i * timeStep));
            let moisture = this.settings.currentMoisture;
            
            // Add some variation based on time and weather patterns
            const variation = Math.sin(i / 10) * 5 + (Math.random() - 0.5) * 3;
            moisture = Math.max(0, Math.min(100, moisture + variation));
            
            data.push({
                x: time,
                y: parseFloat(moisture.toFixed(1))
            });
        }
        
        return data;
    }

    updateChart() {
        // Update chart if it exists
        if (window.charts && window.charts['chart2']) {
            const newData = this.getChartData('daily');
            window.charts['chart2'].data.datasets[0].data = newData;
            window.charts['chart2'].update('none');
        }
    }
}

// Initialize soil moisture manager
let soilMoistureManager;

document.addEventListener('DOMContentLoaded', function() {
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
    
    // Initialize immediately
    soilMoistureManager = new SoilMoistureManager();
    window.soilMoistureManager = soilMoistureManager;
    
    // Force initial display update
    setTimeout(() => {
        if (window.soilMoistureManager) {
            window.soilMoistureManager.updateDisplay();
        }
    }, 100);
});