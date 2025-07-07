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
            this.settings.irrigationDuration = window.irrigationSettings.duration || this.settings.irrigationDuration;
            this.settings.scheduledIrrigations = window.irrigationSettings.scheduledTimes || this.settings.scheduledIrrigations;
        }
    }

    initializeSystem() {
        this.updateDisplay();
    }

    startMoistureSimulation() {
        // Method implementation will be added later
    }

    startScheduledIrrigationCheck() {
        // Method implementation will be added later
    }

    updateDisplay() {
        // Method implementation will be added later
    }

} // Class closing brace

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
}); // Added closing parenthesis and brace