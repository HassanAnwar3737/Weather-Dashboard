import React from 'react';
import '../styles/HourlyForecast.css';

function HourlyForecast({ list }) {
  // Helper function to convert 24-hour format to 12-hour format
  const getTimeFormat = (timestamp) => {
    const date = new Date(timestamp * 1000);
    const hours = date.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours} ${ampm}`;
  };

  // Helper function to get weather icon
  const getWeatherIcon = (condition) => {
    const cond = condition.toLowerCase();
    if (cond.includes('clear') || cond.includes('sunny')) return '☀️';
    if (cond.includes('rain')) return '🌧️';
    if (cond.includes('cloud')) return '☁️';
    if (cond.includes('snow')) return '❄️';
    if (cond.includes('thunder')) return '⛈️';
    if (cond.includes('mist') || cond.includes('fog')) return '🌫️';
    return '🌤️';
  };

  return (
    <div className="hourly-forecast-container">
      <h3 className="hourly-forecast-title">⏰ Hourly Forecast</h3>
      <div className="hourly-forecast-grid">
        {list.slice(0, 5).map((item, index) => (
          <div key={index} className="hourly-card">
            <div className="hourly-time">
              {getTimeFormat(item.dt)}
            </div>
            <div className="hourly-icon">
              {getWeatherIcon(item.weather[0].main)}
            </div>
            <div className="hourly-temp">
              {Math.round(item.main.temp)}°C
            </div>
            <div className="hourly-condition">
              {item.weather[0].main}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default HourlyForecast;