// Water Level Management System
class WaterLevelManager {
    constructor() {
        this.settings = {
            tankCapacity: 100, // liters
            currentLevel: 80, // liters
            irrigationVolume: 7, // liters per irrigation
            schedules: [
                { time: '07:00', enabled: true },
                { time: '16:00', enabled: true }
            ],
            lowLevelThreshold: 20, // percentage
            emptyTankTime: null, // when tank will be empty
            lastRefill: new Date(),
            autoIrrigation: true
        };
        
        this.loadSettings();
        this.initializeSystem();
        this.startCountdown();
        this.scheduleIrrigations();
    }

    loadSettings() {
        const saved = localStorage.getItem('waterLevelSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
    }

    saveSettings() {
        localStorage.setItem('waterLevelSettings', JSON.stringify(this.settings));
    }

    initializeSystem() {
        this.updateDisplay();
        this.updateStatus();
        this.calculateEmptyTime();
    }

    calculateEmptyTime() {
        if (!this.settings.autoIrrigation) {
            this.settings.emptyTankTime = null;
            return;
        }

        const now = new Date();
        const dailyConsumption = this.settings.irrigationVolume * this.settings.schedules.filter(s => s.enabled).length;
        
        if (dailyConsumption === 0) {
            this.settings.emptyTankTime = null;
            return;
        }

        const daysUntilEmpty = this.settings.currentLevel / dailyConsumption;
        const emptyDate = new Date(now.getTime() + (daysUntilEmpty * 24 * 60 * 60 * 1000));
        
        this.settings.emptyTankTime = emptyDate;
        this.saveSettings();
    }

    updateDisplay() {
        // Update water level display
        const waterLevelValue = document.getElementById('water-level-value');
        const percentage = (this.settings.currentLevel / this.settings.tankCapacity * 100).toFixed(1);
        
        if (waterLevelValue) {
            waterLevelValue.textContent = `${this.settings.currentLevel.toFixed(1)}L (${percentage}%)`;
        }

        // Update status badge
        const statusBadge = document.querySelector('.metric-card .status-badge');
        if (statusBadge) {
            const percentage = (this.settings.currentLevel / this.settings.tankCapacity * 100);
            
            if (percentage <= this.settings.lowLevelThreshold) {
                statusBadge.textContent = 'LOW';
                statusBadge.className = 'status-badge low';
            } else if (percentage <= 50) {
                statusBadge.textContent = 'MEDIUM';
                statusBadge.className = 'status-badge medium';
            } else {
                statusBadge.textContent = 'GOOD';
                statusBadge.className = 'status-badge good';
            }
        }

        // Update countdown display
        this.updateCountdownDisplay();
    }

    updateCountdownDisplay() {
        const countdownElement = document.getElementById('tank-countdown');
        if (!countdownElement) return;

        if (!this.settings.emptyTankTime) {
            countdownElement.textContent = 'Tidak terjadwal';
            return;
        }

        const now = new Date();
        const timeLeft = this.settings.emptyTankTime - now;

        if (timeLeft <= 0) {
            countdownElement.textContent = 'Tandon kosong!';
            countdownElement.style.color = '#ef4444';
            return;
        }

        const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

        let countdownText = '';
        if (days > 0) {
            countdownText = `${days} hari ${hours} jam`;
        } else if (hours > 0) {
            countdownText = `${hours} jam ${minutes} menit`;
        } else {
            countdownText = `${minutes} menit`;
        }

        countdownElement.textContent = countdownText;
        
        // Change color based on urgency
        const percentage = (this.settings.currentLevel / this.settings.tankCapacity * 100);
        if (percentage <= this.settings.lowLevelThreshold) {
            countdownElement.style.color = '#ef4444';
        } else if (percentage <= 50) {
            countdownElement.style.color = '#f59e0b';
        } else {
            countdownElement.style.color = '#10b981';
        }
    }

    updateStatus() {
        const percentage = (this.settings.currentLevel / this.settings.tankCapacity * 100);
        
        // Show low level warning
        if (percentage <= this.settings.lowLevelThreshold) {
            this.showLowLevelWarning();
        } else {
            this.hideLowLevelWarning();
        }
    }

    showLowLevelWarning() {
        let warningElement = document.getElementById('low-level-warning');
        
        if (!warningElement) {
            warningElement = document.createElement('div');
            warningElement.id = 'low-level-warning';
            warningElement.className = 'low-level-warning';
            warningElement.innerHTML = `
                <div class="warning-content">
                    <div class="warning-icon">⚠️</div>
                    <div class="warning-text">
                        <h4>Level Air Rendah!</h4>
                        <p>Tandon perlu diisi ulang segera</p>
                    </div>
                    <button class="refill-button" onclick="waterLevelManager.refillTank()">
                        💧 Sudah Mengisi Tandon
                    </button>
                </div>
            `;
            
            // Insert after location card
            const locationCard = document.querySelector('.location-card');
            locationCard.parentNode.insertBefore(warningElement, locationCard.nextSibling);
        }
    }

    hideLowLevelWarning() {
        const warningElement = document.getElementById('low-level-warning');
        if (warningElement) {
            warningElement.remove();
        }
    }

    performIrrigation() {
        if (this.settings.currentLevel >= this.settings.irrigationVolume) {
            this.settings.currentLevel -= this.settings.irrigationVolume;
            this.calculateEmptyTime();
            this.updateDisplay();
            this.updateStatus();
            this.saveSettings();
            
            // Log irrigation
            this.logIrrigation();
            
            // Show notification
            this.showNotification(`Penyiraman dilakukan: ${this.settings.irrigationVolume}L digunakan`, 'success');
        } else {
            this.showNotification('Air tidak cukup untuk penyiraman!', 'error');
        }
    }

    emptyTank() {
        this.settings.currentLevel = 0;
        this.calculateEmptyTime();
        this.updateDisplay();
        this.updateStatus();
        this.saveSettings();
        this.showNotification('Tandon dikosongkan', 'success');
    }

    refillTank() {
        this.settings.currentLevel = this.settings.tankCapacity;
        this.settings.lastRefill = new Date();
        this.calculateEmptyTime();
        this.updateDisplay();
        this.updateStatus();
        this.saveSettings();
        this.showNotification('Tandon berhasil diisi ulang!', 'success');
    }

    logIrrigation() {
        const logs = JSON.parse(localStorage.getItem('irrigationLogs') || '[]');
        logs.push({
            timestamp: new Date().toISOString(),
            volume: this.settings.irrigationVolume,
            remainingLevel: this.settings.currentLevel
        });
        
        // Keep only last 100 logs
        if (logs.length > 100) {
            logs.splice(0, logs.length - 100);
        }
        
        localStorage.setItem('irrigationLogs', JSON.stringify(logs));
    }

    scheduleIrrigations() {
        // Clear existing schedules
        if (this.scheduledIntervals) {
            this.scheduledIntervals.forEach(interval => clearInterval(interval));
        }
        this.scheduledIntervals = [];

        // Set up new schedules
        this.settings.schedules.forEach(schedule => {
            if (schedule.enabled) {
                this.scheduleIrrigation(schedule.time);
            }
        });
    }

    scheduleIrrigation(timeString) {
        const [hours, minutes] = timeString.split(':').map(Number);
        
        const scheduleCheck = setInterval(() => {
            const now = new Date();
            if (now.getHours() === hours && now.getMinutes() === minutes && now.getSeconds() === 0) {
                if (this.settings.autoIrrigation) {
                    this.performIrrigation();
                }
            }
        }, 1000);
        
        this.scheduledIntervals.push(scheduleCheck);
    }

    startCountdown() {
        // Update countdown every minute
        this.countdownInterval = setInterval(() => {
            this.updateCountdownDisplay();
        }, 60000);
    }

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.calculateEmptyTime();
        this.updateDisplay();
        this.updateStatus();
        this.saveSettings();
        this.scheduleIrrigations();
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

    getChartData(period) {
        const logs = JSON.parse(localStorage.getItem('irrigationLogs') || '[]');
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
        
        const filteredLogs = logs.filter(log => new Date(log.timestamp) >= startDate);
        
        // Generate chart data points
        const chartData = [];
        let currentLevel = this.settings.tankCapacity;
        
        // Add current level as starting point
        chartData.push({
            x: startDate,
            y: currentLevel
        });
        
        // Add irrigation events
        filteredLogs.forEach(log => {
            chartData.push({
                x: new Date(log.timestamp),
                y: log.remainingLevel
            });
        });
        
        // Add current level as end point
        chartData.push({
            x: now,
            y: this.settings.currentLevel
        });
        
        return chartData;
    }
}

// Initialize water level manager
let waterLevelManager;

document.addEventListener('DOMContentLoaded', function() {
    waterLevelManager = new WaterLevelManager();
});

// Export for global access
window.waterLevelManager = waterLevelManager;