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

    // ... rest of the code ...

} // Added closing brace for class

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