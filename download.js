function fetchDataForReport(columnNames, callback) {
    const apiKey = 'XP0SNX40V07E6PNK';
    const channelId = '2983766';
    const url = `https://api.thingspeak.com/channels/${channelId}/feeds.json?api_key=${apiKey}&results=720`; // Mengambil data untuk laporan
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            const csvData = [];
            // Gunakan nama kolom kustom jika disediakan
            const headers = columnNames.length > 0 ? columnNames : ['Timestamp', 'Field1', 'Field2'];
            csvData.push(headers.join(',')); // Header CSV
            
            data.feeds.forEach(feed => {
                csvData.push([
                    feed.created_at,
                    feed.field1 || '',
                    feed.field2 || '',
                ].join(','));
            });
            callback(csvData.join('\n'));
        });
  }
  

function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) { // feature detection
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  }
}

// Nama kolom kustom yang ditentukan dalam kode
const customColumnNames = [
    'Timestamp',
    'Water Level',
    'Soil Humidity',
];

document.getElementById('download-report').addEventListener('click', function() {
    fetchDataForReport(customColumnNames, function(csvContent) {
        downloadCSV(csvContent, 'Air Quality Monitoring Kujang.csv');
    });
});
