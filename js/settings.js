// Settings Management
let currentSettings = {
    waterLevel: {
        min: 10,
        max: 80,
        alert: 15
    },
    soilMoisture: {
        min: 40,
        max: 80,
        optimal: 65
    },
    irrigation: {
        duration: 15,
        interval: 30
    },
    alerts: {
        enabled: true,
        autoIrrigation: true
    }
};

// Load settings from localStorage
function loadSettings() {
    const savedSettings = localStorage.getItem('irrigationSettings');
    if (savedSettings) {
        currentSettings = { ...currentSettings, ...JSON.parse(savedSettings) };
    }
    updateSettingsUI();
}

// Save settings to localStorage
function saveSettingsToStorage() {
    localStorage.setItem('irrigationSettings', JSON.stringify(currentSettings));
}

// Update UI with current settings
function updateSettingsUI() {
    // Water Level settings
    document.getElementById('waterLevelMin').value = currentSettings.waterLevel.min;
    document.getElementById('waterLevelMax').value = currentSettings.waterLevel.max;
    document.getElementById('waterLevelAlert').value = currentSettings.waterLevel.alert;
    
    // Soil Moisture settings
    document.getElementById('soilMoistureMin').value = currentSettings.soilMoisture.min;
    document.getElementById('soilMoistureMax').value = currentSettings.soilMoisture.max;
    document.getElementById('soilMoistureOptimal').value = currentSettings.soilMoisture.optimal;
    
    // Irrigation settings
    document.getElementById('irrigationDuration').value = currentSettings.irrigation.duration;
    document.getElementById('irrigationInterval').value = currentSettings.irrigation.interval;
    
    // Alert settings
    document.getElementById('enableAlerts').checked = currentSettings.alerts.enabled;
    document.getElementById('enableAutoIrrigation').checked = currentSettings.alerts.autoIrrigation;
    
    // Update control panel display
    updateControlPanelDisplay();
}

// Update control panel with current settings
function updateControlPanelDisplay() {
    const waterThreshold = document.querySelector('.control-item:nth-child(1) .control-value');
    const soilTarget = document.querySelector('.control-item:nth-child(2) .control-value');
    const duration = document.querySelector('.control-item:nth-child(3) .control-value');
    
    if (waterThreshold) {
        waterThreshold.textContent = `${currentSettings.waterLevel.alert} cm`;
    }
    if (soilTarget) {
        soilTarget.textContent = `${currentSettings.soilMoisture.min}-${currentSettings.soilMoisture.max}%`;
    }
    if (duration) {
        duration.textContent = `${currentSettings.irrigation.duration} min`;
    }
}

// Open settings modal
function openSettings() {
    const modal = document.getElementById('settingsModal');
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // Load current settings into form
    updateSettingsUI();
}

// Close settings modal
function closeSettings() {
    const modal = document.getElementById('settingsModal');
    modal.classList.remove('show');
    document.body.style.overflow = 'auto';
}

// Save settings
function saveSettings() {
    // Validate inputs
    const waterMin = parseInt(document.getElementById('waterLevelMin').value);
    const waterMax = parseInt(document.getElementById('waterLevelMax').value);
    const waterAlert = parseInt(document.getElementById('waterLevelAlert').value);
    
    const soilMin = parseInt(document.getElementById('soilMoistureMin').value);
    const soilMax = parseInt(document.getElementById('soilMoistureMax').value);
    const soilOptimal = parseInt(document.getElementById('soilMoistureOptimal').value);
    
    const duration = parseInt(document.getElementById('irrigationDuration').value);
    const interval = parseInt(document.getElementById('irrigationInterval').value);
    
    // Validation
    if (waterMin >= waterMax) {
        showNotification('Water level minimum must be less than maximum', 'error');
        return;
    }
    
    if (waterAlert < waterMin || waterAlert > waterMax) {
        showNotification('Water level alert must be between minimum and maximum', 'error');
        return;
    }
    
    if (soilMin >= soilMax) {
        showNotification('Soil moisture minimum must be less than maximum', 'error');
        return;
    }
    
    if (soilOptimal < soilMin || soilOptimal > soilMax) {
        showNotification('Optimal soil moisture must be between minimum and maximum', 'error');
        return;
    }
    
    // Update settings
    currentSettings = {
        waterLevel: {
            min: waterMin,
            max: waterMax,
            alert: waterAlert
        },
        soilMoisture: {
            min: soilMin,
            max: soilMax,
            optimal: soilOptimal
        },
        irrigation: {
            duration: duration,
            interval: interval
        },
        alerts: {
            enabled: document.getElementById('enableAlerts').checked,
            autoIrrigation: document.getElementById('enableAutoIrrigation').checked
        }
    };
    
    // Save to localStorage
    saveSettingsToStorage();
    
    // Update UI
    updateControlPanelDisplay();
    
    // Show success message
    showNotification('Settings saved successfully!', 'success');
    
    // Close modal
    closeSettings();
}

// Reset settings to default
function resetSettings() {
    if (confirm('Are you sure you want to reset all settings to default values?')) {
        currentSettings = {
            waterLevel: {
                min: 10,
                max: 80,
                alert: 15
            },
            soilMoisture: {
                min: 40,
                max: 80,
                optimal: 65
            },
            irrigation: {
                duration: 15,
                interval: 30
            },
            alerts: {
                enabled: true,
                autoIrrigation: true
            }
        };
        
        updateSettingsUI();
        showNotification('Settings reset to default values', 'success');
    }
}

// Show notification
function showNotification(message, type) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Style the notification
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 10px;
        color: white;
        font-weight: 600;
        z-index: 1001;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        ${type === 'success' ? 'background: linear-gradient(135deg, #10b981, #059669);' : 'background: linear-gradient(135deg, #ef4444, #dc2626);'}
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        max-width: 300px;
        font-size: 14px;
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Get current settings (for use by other modules)
function getCurrentSettings() {
    return currentSettings;
}

// Check if irrigation should be triggered based on current settings
function shouldTriggerIrrigation(waterLevel, soilMoisture) {
    if (!currentSettings.alerts.autoIrrigation) {
        return false;
    }
    
    // Check if water level is sufficient
    if (waterLevel < currentSettings.waterLevel.alert) {
        return false;
    }
    
    // Check if soil moisture is below minimum
    return soilMoisture < currentSettings.soilMoisture.min;
}

// Check if irrigation should stop based on current settings
function shouldStopIrrigation(soilMoisture) {
    return soilMoisture >= currentSettings.soilMoisture.max;
}

// Initialize settings on page load
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    
    // Close modal when clicking outside
    document.getElementById('settingsModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeSettings();
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && document.getElementById('settingsModal').classList.contains('show')) {
            closeSettings();
        }
    });
});

// Export functions for use by other modules
window.irrigationSettings = {
    getCurrentSettings,
    shouldTriggerIrrigation,
    shouldStopIrrigation,
    openSettings,
    closeSettings,
    saveSettings,
    resetSettings
};