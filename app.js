document.addEventListener('DOMContentLoaded', function() {
    const elements = {
        price: document.getElementById('price'),
        marketCap: document.getElementById('market-cap'),
        volume: document.getElementById('volume'),
        fastestFee: document.getElementById('fastestFee'),
        halfHourFee: document.getElementById('halfHourFee'),
        oneHourFee: document.getElementById('oneHourFee'),
        currentBlockHeight: document.getElementById('currentBlockHeight'),
        priceChart: document.getElementById('priceChart')
    };
  
    let priceChart;
  
    async function fetchData(url) {
        const response = await fetch(url);
        return response.json();
    }
  
    async function fetchPriceAndMarketCap() {
        const data = await fetchData('https://api.coincap.io/v2/assets/bitcoin');
        const price = parseFloat(data.data.priceUsd).toFixed(2);
        const marketCap = parseFloat(data.data.marketCapUsd).toFixed(2);
  
        elements.price.innerHTML = `<strong>Price:</strong> $${Number(price).toLocaleString('en-US')}`;
        elements.marketCap.innerHTML = `<strong>Market Cap:</strong> <span style="color: #FFB86C;">$${Number(marketCap).toLocaleString('en-US')}</span>`;
    }
  
    async function fetchVolume() {
        const data = await fetchData('https://api.coingecko.com/api/v3/coins/bitcoin');
        const volume = parseFloat(data.market_data.total_volume.usd).toFixed(2);
  
        elements.volume.innerHTML = `<strong>24h Trading Volume:</strong> <span style="color: #FFB86C;">$${Number(volume).toLocaleString('en-US')}</span>`;
    }
  
    async function fetchBitcoinFeeRates() {
        try {
            const [feeData, btcPrice] = await Promise.all([
                fetchData("https://mempool.space/api/v1/fees/recommended"),
                fetchBitcoinPrice()
            ]);
  
            const satFeeToUsd = feeSat => (feeSat * 140 / 100000000) * btcPrice;
  
            const updateFeeElement = (element, fee, priority) => {
                element.innerHTML = `<strong>${priority} Priority:</strong><br/>
                    <span class="fee-rate-value" style="color: #ff5555;">${fee} sat/vB</span><br/>
                    <span style="color: #8BE9FD">$${satFeeToUsd(fee).toFixed(2)} USD</span>`;
                element.classList.add("flash");
                setTimeout(() => element.classList.remove("flash"), 1000);
            };
  
            updateFeeElement(elements.fastestFee, feeData.fastestFee, "High");
            updateFeeElement(elements.halfHourFee, feeData.halfHourFee, "Medium");
            updateFeeElement(elements.oneHourFee, feeData.hourFee, "Low");
        } catch (error) {
            console.error("Error fetching Bitcoin fee rates:", error);
        }
    }
  
    async function fetchBitcoinPrice() {
        const data = await fetchData('https://api.coincap.io/v2/assets/bitcoin');
        return parseFloat(data.data.priceUsd);
    }
  
    async function fetchBlockHeight() {
      try {
          const response = await fetch("https://mempool.space/api/blocks/tip/height");
          const blockHeight = await response.text();
          elements.currentBlockHeight.innerHTML = `<strong>Current Block Height:</strong> <span style="color: #FFB86C;">${blockHeight}</span>`;
      } catch (error) {
          console.error("Error fetching Bitcoin block height:", error);
      }
    }
  
    async function fetchPriceHistory() {
        const data = await fetchData('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=7');
        return data.prices;
    }
  
    function createChart(priceData) {
      if (priceChart) {
          priceChart.destroy();
      }
  
      priceChart = new Chart(elements.priceChart.getContext('2d'), {
          type: 'line',
          data: {
              labels: priceData.map(d => new Date(d[0]).toLocaleDateString()),
              datasets: [{
                  label: 'Bitcoin Price (USD)',
                  data: priceData.map(d => d[1]),
                  borderColor: '#ffb86c',
                  backgroundColor: 'rgba(255, 184, 108, 0.1)',
                  borderWidth: 2,
                  fill: true,
                  tension: 0.4,
                  pointRadius: 0,
                  pointHoverRadius: 6,
                  pointHoverBackgroundColor: '#8BE9FD',
                  pointHoverBorderColor: '#f8f8f2',
                  pointHoverBorderWidth: 2,
              }]
          },
          options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                  x: {
                      grid: { color: 'rgba(255, 255, 255, 0.1)' },
                      ticks: { color: '#f8f8f2' }
                  },
                  y: {
                      grid: { color: 'rgba(255, 255, 255, 0.1)', drawBorder: false },
                      ticks: {
                          color: '#f8f8f2',
                          callback: value => '$' + value.toLocaleString()
                      }
                  }
              },
              plugins: {
                  legend: { display: false },
                  tooltip: {
                      mode: 'index',
                      intersect: false,
                      backgroundColor: 'rgba(68, 71, 90, 0.8)',
                      titleColor: '#f8f8f2',
                      bodyColor: '#ffb86c',
                      borderColor: '#6272a4',
                      borderWidth: 1,
                      callbacks: {
                          label: context => {
                              let label = context.dataset.label || '';
                              if (label) label += ': ';
                              if (context.parsed.y !== null) {
                                  label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
                              }
                              return label;
                          }
                      }
                  }
              },
              interaction: {
                  mode: 'nearest',
                  axis: 'x',
                  intersect: false
              }
          }
      });
    }
  
    async function updateChart() {
        const priceData = await fetchPriceHistory();
        createChart(priceData);
    }
  
    const updateIntervals = [
        { fn: fetchPriceAndMarketCap, interval: 15000 },
        { fn: fetchVolume, interval: 180000 },
        { fn: fetchBitcoinFeeRates, interval: 10000 },
        { fn: updateChart, interval: 300000 }
    ];
  
    updateIntervals.forEach(({ fn, interval }) => {
        fn();
        setInterval(fn, interval);
    });
  
    fetchBlockHeight();
  });
  
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('Service Worker registered! Scope:', registration.scope))
            .catch(err => console.log('Service Worker registration failed:', err));
    });
  }