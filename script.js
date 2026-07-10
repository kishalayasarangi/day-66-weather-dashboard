// ⚠️ Replace with your OpenWeatherMap API key
const API_KEY = '37c8674ec2622080f1c2fe605e686d61';
const BASE = 'https://api.openweathermap.org/data/2.5';

let recentSearches = JSON.parse(localStorage.getItem('weather-recent') || '[]');

function getWeatherEmoji(code, icon) {
  const isNight = icon && icon.endsWith('n');
  if (code >= 200 && code < 300) return '⛈️';
  if (code >= 300 && code < 400) return '🌦️';
  if (code >= 500 && code < 600) {
    if (code === 500) return '🌧️';
    if (code >= 502) return '⛈️';
    return '🌧️';
  }
  if (code >= 600 && code < 700) return '❄️';
  if (code === 701 || code === 741) return '🌫️';
  if (code === 800) return isNight ? '🌙' : '☀️';
  if (code === 801) return isNight ? '🌙' : '🌤️';
  if (code === 802) return '⛅';
  if (code >= 803) return '☁️';
  return '🌡️';
}

function getWindDir(deg) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg / 45) % 8];
}

async function fetchWeather() {
  const city = document.getElementById('cityInput').value.trim();
  if (!city) { alert('Enter a city name!'); return; }
  await loadWeather(`q=${encodeURIComponent(city)}`);
}

async function getLocation() {
  if (!navigator.geolocation) { alert('Geolocation not supported!'); return; }
  navigator.geolocation.getCurrentPosition(
    pos => loadWeather(`lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`),
    () => alert('Location access denied!')
  );
}

async function loadWeather(query) {
  showError('');
  document.getElementById('weatherMain').classList.add('hidden');

  try {
    const [currentRes, forecastRes] = await Promise.all([
      fetch(`${BASE}/weather?${query}&appid=${API_KEY}&units=metric`),
      fetch(`${BASE}/forecast?${query}&appid=${API_KEY}&units=metric`)
    ]);

    if (!currentRes.ok) throw new Error('City not found!');

    const current = await currentRes.json();
    const forecast = await forecastRes.json();

    saveRecent(current.name);
    renderCurrent(current);
    renderDetails(current);
    renderHourly(forecast.list);
    renderDaily(forecast.list);

    document.getElementById('weatherMain').classList.remove('hidden');
  } catch(e) {
    showError(e.message || 'Failed to fetch weather data!');
  }
}

function renderCurrent(d) {
  const date = new Date();
  const dateStr = date.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  document.getElementById('cityName').textContent = d.name;
  document.getElementById('countryName').textContent = d.sys.country;
  document.getElementById('weatherDate').textContent = dateStr;
  document.getElementById('weatherEmoji').textContent =
    getWeatherEmoji(d.weather[0].id, d.weather[0].icon);
  document.getElementById('weatherDesc').textContent = d.weather[0].description;
  document.getElementById('tempMain').textContent = Math.round(d.main.temp) + '°C';
  document.getElementById('tempFeels').textContent =
    `Feels like ${Math.round(d.main.feels_like)}°C`;
  document.getElementById('tempRange').textContent =
    `H: ${Math.round(d.main.temp_max)}° · L: ${Math.round(d.main.temp_min)}°`;
}

function renderDetails(d) {
  const sunrise = new Date(d.sys.sunrise * 1000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const sunset = new Date(d.sys.sunset * 1000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const details = [
    { icon: '💧', val: d.main.humidity + '%', label: 'Humidity' },
    { icon: '💨', val: Math.round(d.wind.speed * 3.6) + ' km/h', label: 'Wind Speed' },
    { icon: '🧭', val: getWindDir(d.wind.deg), label: 'Wind Dir' },
    { icon: '🌡️', val: d.main.pressure + ' hPa', label: 'Pressure' },
    { icon: '👁️', val: (d.visibility / 1000).toFixed(1) + ' km', label: 'Visibility' },
    { icon: '☁️', val: d.clouds.all + '%', label: 'Cloud Cover' },
    { icon: '🌅', val: sunrise, label: 'Sunrise' },
    { icon: '🌇', val: sunset, label: 'Sunset' }
  ];

  document.getElementById('detailsGrid').innerHTML = details.map(d => `
    <div class="detail-card">
      <div class="detail-icon">${d.icon}</div>
      <div class="detail-val">${d.val}</div>
      <div class="detail-label">${d.label}</div>
    </div>`).join('');
}

function renderHourly(list) {
  const next24 = list.slice(0, 8);
  document.getElementById('hourlyList').innerHTML = next24.map(h => {
    const time = new Date(h.dt * 1000).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit'
    });
    const rain = h.pop ? Math.round(h.pop * 100) + '%' : '';
    return `
      <div class="hourly-item">
        <div class="hourly-time">${time}</div>
        <div class="hourly-icon">${getWeatherEmoji(h.weather[0].id, h.weather[0].icon)}</div>
        <div class="hourly-temp">${Math.round(h.main.temp)}°</div>
        ${rain ? `<div class="hourly-rain">💧 ${rain}</div>` : ''}
      </div>`;
  }).join('');
}

function renderDaily(list) {
  const days = {};
  list.forEach(item => {
    const day = new Date(item.dt * 1000).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    if (!days[day]) days[day] = { temps: [], items: [] };
    days[day].temps.push(item.main.temp);
    days[day].items.push(item);
  });

  const dailyArr = Object.entries(days).slice(0, 5);
  document.getElementById('dailyList').innerHTML = dailyArr.map(([day, data]) => {
    const max = Math.round(Math.max(...data.temps));
    const min = Math.round(Math.min(...data.temps));
    const mid = data.items[Math.floor(data.items.length / 2)];
    const rain = mid.pop ? Math.round(mid.pop * 100) + '%' : '';
    return `
      <div class="daily-item">
        <div class="daily-day">${day}</div>
        <div class="daily-icon">
          ${getWeatherEmoji(mid.weather[0].id, mid.weather[0].icon)}
        </div>
        <div class="daily-desc">${mid.weather[0].description}</div>
        ${rain ? `<div class="daily-rain">💧 ${rain}</div>` : '<div class="daily-rain"></div>'}
        <div class="daily-temps">
          ${max}° <span class="daily-low">/ ${min}°</span>
        </div>
      </div>`;
  }).join('');
}

function saveRecent(city) {
  recentSearches = [city, ...recentSearches.filter(c => c !== city)].slice(0, 5);
  localStorage.setItem('weather-recent', JSON.stringify(recentSearches));
  renderRecent();
}

function renderRecent() {
  const wrap = document.getElementById('recentSearches');
  if (recentSearches.length === 0) { wrap.innerHTML = ''; return; }
  wrap.innerHTML = recentSearches.map(c => `
    <div class="recent-pill" onclick="quickSearch('${c}')">${c}</div>`).join('');
}

function quickSearch(city) {
  document.getElementById('cityInput').value = city;
  fetchWeather();
}

function showError(msg) {
  const card = document.getElementById('errorCard');
  if (!msg) { card.classList.add('hidden'); return; }
  card.textContent = '❌ ' + msg;
  card.classList.remove('hidden');
}

window.onload = () => {
  renderRecent();
  if (recentSearches.length > 0) {
    document.getElementById('cityInput').value = recentSearches[0];
    fetchWeather();
  }
};