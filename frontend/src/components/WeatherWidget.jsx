import { useEffect, useState } from 'react';

const WMO = {
  0: { label: 'Clear', icon: '☀️' },
  1: { label: 'Mainly Clear', icon: '🌤️' },
  2: { label: 'Partly Cloudy', icon: '⛅' },
  3: { label: 'Overcast', icon: '☁️' },
  45: { label: 'Foggy', icon: '🌫️' },
  48: { label: 'Icy Fog', icon: '🌫️' },
  51: { label: 'Light Drizzle', icon: '🌦️' },
  53: { label: 'Drizzle', icon: '🌦️' },
  55: { label: 'Heavy Drizzle', icon: '🌧️' },
  61: { label: 'Light Rain', icon: '🌧️' },
  63: { label: 'Rain', icon: '🌧️' },
  65: { label: 'Heavy Rain', icon: '🌧️' },
  71: { label: 'Light Snow', icon: '🌨️' },
  73: { label: 'Snow', icon: '❄️' },
  75: { label: 'Heavy Snow', icon: '❄️' },
  80: { label: 'Rain Showers', icon: '🌦️' },
  95: { label: 'Thunderstorm', icon: '⛈️' },
};

const getWmo = code => WMO[code] || { label: 'Unknown', icon: '🌡️' };

export default function WeatherWidget() {
  const [weather, setWeather] = useState(null);
  const [city, setCity]       = useState('');
  const [error, setError]     = useState(false);

  useEffect(() => {
    // Get user location then fetch weather
    navigator.geolocation?.getCurrentPosition(
      async ({ coords }) => {
        const { latitude: lat, longitude: lon } = coords;
        try {
          // Reverse geocode city name
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
          );
          const geo = await geoRes.json();
          setCity(geo.address?.city || geo.address?.town || geo.address?.state || 'Your Location');

          // Fetch weather
          const wRes = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
            `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weathercode` +
            `&daily=temperature_2m_max,temperature_2m_min,weathercode` +
            `&timezone=auto&forecast_days=4`
          );
          const w = await wRes.json();
          setWeather(w);
        } catch { setError(true); }
      },
      () => {
        // Fallback: Delhi
        setCity('New Delhi');
        fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=28.6&longitude=77.2` +
          `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weathercode` +
          `&daily=temperature_2m_max,temperature_2m_min,weathercode` +
          `&timezone=auto&forecast_days=4`
        ).then(r => r.json()).then(setWeather).catch(() => setError(true));
      }
    );
  }, []);

  if (error) return null;

  const cur = weather?.current;
  const daily = weather?.daily;
  const wmo = cur ? getWmo(cur.weathercode) : null;

  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  return (
    <div className="feed-right-card weather-widget">
      <div className="feed-right-title">🌍 Live Weather</div>

      {!weather ? (
        <div className="widget-loading">Fetching weather…</div>
      ) : (
        <>
          {/* Current */}
          <div className="weather-current">
            <div className="weather-icon-big">{wmo.icon}</div>
            <div className="weather-main">
              <div className="weather-temp">{Math.round(cur.temperature_2m)}°C</div>
              <div className="weather-desc">{wmo.label}</div>
              <div className="weather-city">📍 {city}</div>
            </div>
          </div>

          <div className="weather-meta-row">
            <span>💧 {cur.relative_humidity_2m}%</span>
            <span>💨 {Math.round(cur.wind_speed_10m)} km/h</span>
          </div>

          {/* 4-day forecast */}
          {daily && (
            <div className="weather-forecast">
              {daily.time.slice(1, 5).map((date, i) => {
                const d = new Date(date);
                const w = getWmo(daily.weathercode[i + 1]);
                return (
                  <div key={date} className="weather-day">
                    <div className="weather-day-name">{days[d.getDay()]}</div>
                    <div className="weather-day-icon">{w.icon}</div>
                    <div className="weather-day-temps">
                      <span className="wmax">{Math.round(daily.temperature_2m_max[i + 1])}°</span>
                      <span className="wmin">{Math.round(daily.temperature_2m_min[i + 1])}°</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
