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
  
  // Tanggal
  function updateDateAndTime() {
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  
    const now = new Date();
    const dayName = days[now.getDay()];
    const day = now.getDate();
    const monthName = months[now.getMonth()];
    const year = now.getFullYear();
  
    const formattedDate = `${dayName}, ${day} ${monthName} ${year}`;
  
    document.getElementById('hari').textContent = formattedDate;
  }
  
  // Memanggil fungsi saat halaman dimuat
  window.onload = updateDateAndTime;

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
        { id: 'chart1', fieldNumber: 1, color: '#FF6384', averageContainer: 'average1' },
        { id: 'chart2', fieldNumber: 2, color: '#36A2EB', averageContainer: 'average2' },
    ];

    fields.forEach(field => {
        if (period === 'monthly') {
            getMonthlyAverages(field.fieldNumber, function(data) {
                const ctx = document.getElementById(field.id).getContext('2d');
                if (charts[field.id]) {
                    charts[field.id].destroy(); // Hancurkan grafik lama jika ada
                }
                charts[field.id] = createChart(ctx, data, field.color, labels[period].unit, labels[period].format);
                updateAverage(field.averageContainer, data);
            });
        } else {
            getData(field.fieldNumber, period, resultsCount[period], function(data) {
                const ctx = document.getElementById(field.id).getContext('2d');
                if (charts[field.id]) {
                    charts[field.id].destroy(); // Hancurkan grafik lama jika ada
                }
                if (data === null) {
                    // Jika tidak ada data, tampilkan pesan sistem mati
                    document.getElementById(field.id).parentElement.querySelector('.chart-message').textContent = 'Sistem Mati: Tidak ada data untuk hari ini';
                } else {
                    // Tampilkan grafik jika ada data
                    charts[field.id] = createChart(ctx, data, field.color, labels[period].unit, labels[period].format);
                    updateAverage(field.averageContainer, data);
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


function calculateAverage(data) {
    const sum = data.reduce((acc, point) => acc + point.y, 0);
    return (sum / data.length).toFixed(2);
}

function createChart(ctx, data, borderColor, unit, format) {
    return new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                data: data,
                borderColor: borderColor,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderWidth: 1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false // Hide dataset label
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: unit, // 'hour' for daily charts
                        tooltipFormat: format,
                        displayFormats: {
                            hour: 'HH:mm', // Display hours and minutes
                            day: 'MMM dd', // Display day format
                            month: 'MMM yyyy' // Display month format
                        }
                    },
                    title: {
                        display: true,
                        text: 'Time'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'ppm'
                    }
                }
            }
        }
    });
}

function updateAverage(containerId, data) {
    const average = calculateAverage(data);
    const container = document.getElementById(containerId);
    const valueElement = document.createElement('span');
    valueElement.className = 'average-value';
    valueElement.textContent = `${average} ppm`;
    container.innerHTML = ''; // Clear previous content
    container.appendChild(valueElement);

    if (average > 300 && average <= 500) {
        container.className = 'average-container average-dark';
    } else if (average > 200 && average <= 300) {
        container.className = 'average-container average-purple';
    } else if (average > 150 && average <= 200) {
        container.className = 'average-container average-red';
    } else if (average > 100 && average <= 150) {
        container.className = 'average-container average-orange';
    } else if (average > 50 && average <= 100) {
        container.className = 'average-container average-yellow';
    } else if (average >0 && average <= 100){
        container.className = 'average-container average-green';
    }
}

