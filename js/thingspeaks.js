// Daily
function setActive(button) {
    // Remove 'active' class from all buttons
    var buttons = document.querySelectorAll('.toggle-button');
    buttons.forEach(function(btn) {
        btn.classList.remove('active');
    });
  
    // Add 'active' class to the clicked button
    button.classList.add('active');
}

// Tanggal dan Waktu
function updateDateAndTime() {
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

    const now = new Date();
    const dayName = days[now.getDay()];
    const day = now.getDate();
    const monthName = months[now.getMonth()];
    const year = now.getFullYear();
    
    // Format waktu
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');

    const formattedDate = `${dayName}, ${day} ${monthName} ${year}`;
    const formattedTime = `${hours}:${minutes}:${seconds}`;

    document.getElementById('hari').textContent = formattedDate;
    document.getElementById('jam').textContent = formattedTime;
}

// Update waktu setiap detik
setInterval(updateDateAndTime, 1000);

// Update status sistem
function updateSystemStatus() {
    const waterStatus = document.getElementById('water-status');
    const pumpStatus = document.getElementById('pump-status');
    const irrigationStatus = document.getElementById('irrigation-status');
    
    // Simulasi status (dalam implementasi nyata, ini akan mengambil data dari sensor)
    const isWaterAvailable = Math.random() > 0.1; // 90% kemungkinan air tersedia
    const isPumpActive = Math.random() > 0.3; // 70% kemungkinan pompa aktif
    const isIrrigationActive = Math.random() > 0.5; // 50% kemungkinan irigasi aktif
    
    waterStatus.className = isWaterAvailable ? 'status-indicator' : 'status-indicator offline';
    pumpStatus.className = isPumpActive ? 'status-indicator' : 'status-indicator offline';
    irrigationStatus.className = isIrrigationActive ? 'status-indicator' : 'status-indicator offline';
}

// Update info cepat
function updateQuickInfo() {
    const lastIrrigation = document.getElementById('last-irrigation');
    const nextSchedule = document.getElementById('next-schedule');
    const waterUsage = document.getElementById('water-usage');
    
    // Simulasi data (dalam implementasi nyata, ini akan mengambil data dari database)
    const now = new Date();
    const lastIrrigationTime = new Date(now.getTime() - (Math.random() * 4 * 60 * 60 * 1000)); // 0-4 jam yang lalu
    const nextScheduleTime = new Date(now.getTime() + (Math.random() * 8 * 60 * 60 * 1000)); // 0-8 jam ke depan
    const todayUsage = Math.floor(Math.random() * 500) + 100; // 100-600 liter
    
    lastIrrigation.textContent = lastIrrigationTime.toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'});
    nextSchedule.textContent = nextScheduleTime.toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'});
    waterUsage.textContent = `${todayUsage} L`;
}

// Memanggil fungsi saat halaman dimuat
window.onload = function() {
    updateDateAndTime();
    updateSystemStatus();
    updateQuickInfo();
    loadData('daily');
    
    // Update status setiap 30 detik
    setInterval(updateSystemStatus, 30000);
    setInterval(updateQuickInfo, 60000);
};

document.addEventListener('DOMContentLoaded', function() {
    // Load daily data by default on page load
    loadData('daily');
});

let charts = {}; // Menyimpan referensi grafik

// Fungsi untuk mendapatkan rata-rata bulanan
function getMonthlyAverages(fieldNumber, callback) {
    const apiKey = 'XP0SNX40V07E6PNK';
    const channelId = '2983766';
    const url = `https://api.thingspeak.com/channels/${channelId}/fields/${fieldNumber}.json?api_key=${apiKey}&results=720`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            const monthlyData = {};

            data.feeds.forEach(feed => {
                const date = new Date(feed.created_at);
                const monthYear = `${date.getMonth() + 1}-${date.getFullYear()}`;

                if (!monthlyData[monthYear]) {
                    monthlyData[monthYear] = [];
                }

                if (feed[`field${fieldNumber}`] !== null) {
                    monthlyData[monthYear].push(parseFloat(feed[`field${fieldNumber}`]));
                }
            });

            const averages = [];
            for (const monthYear in monthlyData) {
                const average = monthlyData[monthYear].reduce((acc, val) => acc + val, 0) / monthlyData[monthYear].length;
                const [month, year] = monthYear.split('-');
                averages.push({
                    x: new Date(year, month - 1),
                    y: parseFloat(average.toFixed(2))
                });
            }

            callback(averages);
        })
        .catch(error => console.error('Error fetching monthly data:', error));
}

function loadData(period) {
    const resultsCount = {
        daily: 24,
        weekly: 168,
        monthly: 720
    };

    const labels = {
        daily: { unit: 'hour', format: 'HH:mm' },
        weekly: { unit: 'day', format: 'MMM dd' },
        monthly: { unit: 'month', format: 'MMM yyyy' }
    };

    const fields = [
        { id: 'chart1', fieldNumber: 1, color: '#32CD32', averageContainer: 'average1', title: 'Water Level' },
        { id: 'chart2', fieldNumber: 2, color: '#228B22', averageContainer: 'average2', title: 'Soil Humidity' },
    ];

    fields.forEach(field => {
        if (period === 'monthly') {
            getMonthlyAverages(field.fieldNumber, function(data) {
                const ctx = document.getElementById(field.id).getContext('2d');
                if (charts[field.id]) {
                    charts[field.id].destroy(); // Hancurkan grafik lama jika ada
                }
                charts[field.id] = createChart(ctx, data, field.color, labels[period].unit, labels[period].format, field.title);
                updateAverage(field.averageContainer, data, field.title);
            });
        } else {
            getData(field.fieldNumber, period, resultsCount[period], function(data) {
                const ctx = document.getElementById(field.id).getContext('2d');
                if (charts[field.id]) {
                    charts[field.id].destroy(); // Hancurkan grafik lama jika ada
                }
                if (data === null) {
                    // Jika tidak ada data, tampilkan pesan sistem mati
                    document.getElementById(field.id).parentElement.querySelector('.chart-message').textContent = 'Sistem Offline: Tidak ada data untuk periode ini';
                } else {
                    // Tampilkan grafik jika ada data
                    charts[field.id] = createChart(ctx, data, field.color, labels[period].unit, labels[period].format, field.title);
                    updateAverage(field.averageContainer, data, field.title);
                    document.getElementById(field.id).parentElement.querySelector('.chart-message').textContent = ''; // Hapus pesan jika ada data
                }
            });
        }
    });
}

function getData(fieldNumber, period, resultsCount, callback) {
    const apiKey = 'XP0SNX40V07E6PNK';
    const channelId = '2983766';
    const url = `https://api.thingspeak.com/channels/${channelId}/fields/${fieldNumber}.json?api_key=${apiKey}&results=${resultsCount}`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            const values = [];
            const dailyData = {};

            // Mengumpulkan data per hari
            data.feeds.forEach(feed => {
                if (feed[`field${fieldNumber}`] !== null) {
                    const date = new Date(feed.created_at);
                    const day = date.toISOString().split('T')[0]; // Format YYYY-MM-DD
                    const time = date.toISOString().split('T')[1]; // Format HH:MM:SS
                    const value = parseFloat(feed[`field${fieldNumber}`]);

                    if (!dailyData[day]) {
                        dailyData[day] = [];
                    }
                    dailyData[day].push({ time, value });
                }
            });

            if (period === 'weekly') {
                // Menghitung rata-rata harian untuk weekly
                Object.keys(dailyData).forEach(day => {
                    const sum = dailyData[day].reduce((acc, item) => acc + item.value, 0);
                    const avg = sum / dailyData[day].length;
                    values.push({
                        x: new Date(day),
                        y: avg
                    });
                });
            } else if (period === 'monthly') {
                // Mengelompokkan per minggu untuk monthly
                const weeklyData = {};
                Object.keys(dailyData).forEach(day => {
                    const date = new Date(day);
                    const weekYear = `${date.getFullYear()}-W${getWeekNumber(date)}`; // Identifikasi minggu dalam tahun

                    if (!weeklyData[weekYear]) {
                        weeklyData[weekYear] = [];
                    }
                    weeklyData[weekYear].push(...dailyData[day].map(item => item.value));
                });

                Object.keys(weeklyData).forEach(weekYear => {
                    const sum = weeklyData[weekYear].reduce((acc, v) => acc + v, 0);
                    const avg = sum / weeklyData[weekYear].length;
                    values.push({
                        x: new Date(weekYearToDate(weekYear)), // Konversi ke tanggal pertama dalam minggu tersebut
                        y: avg
                    });
                });
            } else {
                // Jika period adalah daily, ambil data hari ini dengan waktu
                const today = new Date().toISOString().split('T')[0];
                if (dailyData[today]) {
                    values.push(...dailyData[today].map(item => ({
                        x: new Date(`${today}T${item.time}`), // Gabungkan tanggal dan waktu
                        y: item.value
                    })));
                }
            }

            if (values.length === 0 && period === 'daily') {
                callback(null); // Tidak ada data untuk hari ini
            } else {
                callback(values);
            }
        })
        .catch(error => console.error('Error fetching data:', error));
}

function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
}

function weekYearToDate(weekYear) {
    const [year, week] = weekYear.split('-W');
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = simple.getDay();
    const ISOweekStart = simple;
    if (dow <= 4)
        ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else
        ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    return ISOweekStart;
}

function calculateAverage(data) {
    const sum = data.reduce((acc, point) => acc + point.y, 0);
    return (sum / data.length).toFixed(2);
}

function createChart(ctx, data, borderColor, unit, format, title) {
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, borderColor + '40');
    gradient.addColorStop(1, borderColor + '10');

    return new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                data: data,
                borderColor: borderColor,
                backgroundColor: gradient,
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: borderColor,
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(46, 139, 87, 0.9)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: borderColor,
                    borderWidth: 1,
                    cornerRadius: 10,
                    displayColors: false,
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: unit,
                        tooltipFormat: format,
                        displayFormats: {
                            hour: 'HH:mm',
                            day: 'MMM dd',
                            month: 'MMM yyyy'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Waktu',
                        color: '#2E8B57',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    grid: {
                        color: 'rgba(46, 139, 87, 0.1)',
                    },
                    ticks: {
                        color: '#2E8B57',
                        font: {
                            size: 12
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: title === 'Water Level' ? 'Level (cm)' : 'Kelembaban (%)',
                        color: '#2E8B57',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    },
                    grid: {
                        color: 'rgba(46, 139, 87, 0.1)',
                    },
                    ticks: {
                        color: '#2E8B57',
                        font: {
                            size: 12
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index',
            },
        }
    });
}

function updateAverage(containerId, data, title) {
    const average = calculateAverage(data);
    const container = document.getElementById(containerId);
    const valueElement = document.createElement('span');
    valueElement.className = 'average-value';
    
    const unit = title === 'Water Level' ? 'cm' : '%';
    valueElement.textContent = `${average} ${unit}`;
    
    container.innerHTML = '<span class="average-label">Rerata: </span>';
    container.appendChild(valueElement);

    // Logika warna berdasarkan jenis parameter
    if (title === 'Water Level') {
        // Water Level: semakin tinggi semakin baik
        if (average >= 80) {
            container.className = 'average-container average-green';
        } else if (average >= 60) {
            container.className = 'average-container average-yellow';
        } else if (average >= 40) {
            container.className = 'average-container average-orange';
        } else if (average >= 20) {
            container.className = 'average-container average-red';
        } else {
            container.className = 'average-container average-dark';
        }
    } else {
        // Soil Humidity: 40-70% optimal
        if (average >= 40 && average <= 70) {
            container.className = 'average-container average-green';
        } else if ((average >= 30 && average < 40) || (average > 70 && average <= 80)) {
            container.className = 'average-container average-yellow';
        } else if ((average >= 20 && average < 30) || (average > 80 && average <= 90)) {
            container.className = 'average-container average-orange';
        } else if ((average >= 10 && average < 20) || (average > 90)) {
            container.className = 'average-container average-red';
        } else {
            container.className = 'average-container average-dark';
        }
    }
}