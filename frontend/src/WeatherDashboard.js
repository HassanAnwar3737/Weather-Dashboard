import React, { useState, useEffect } from 'react';
import axios from 'axios';
import HourlyForecast from './components/HourlyForecast';
import './WeatherDashboard.css';

function WeatherDashboard() {
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [userId, setUserId] = useState(null);
  const [activeTab, setActiveTab] = useState('search');

  const API_URL = 'http://localhost:5000';
  const OPENWEATHER_API_KEY = '54082987e583e4f7a94c6509c5549d03';

  // Initialize userId from localStorage
  useEffect(() => {
    let storedUserId = localStorage.getItem('userId');
    if (!storedUserId) {
      storedUserId = 'user-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('userId', storedUserId);
      console.log('📍 Created new userId:', storedUserId);
    } else {
      console.log('📍 Using existing userId:', storedUserId);
    }
    setUserId(storedUserId);
  }, []);

  // Fetch History
  const fetchHistory = async (id) => {
    try {
      const response = await axios.get(`${API_URL}/api/history`, {
        params: { userId: id },
      });
      setHistory(response.data);
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  // Fetch Favorites
  const fetchFavorites = async (id) => {
    try {
      console.log('🔄 Fetching favorites for userId:', id);
      const response = await axios.get(`${API_URL}/api/favorites`, {
        params: { userId: id },
      });
      console.log('✅ Got favorites:', response.data);
      setFavorites(response.data);
    } catch (err) {
      console.error('Error fetching favorites:', err);
    }
  };

  // Load favorites & history when userId is set
  useEffect(() => {
    if (userId) {
      console.log('📍 UserId ready, loading data...');
      fetchFavorites(userId);
      fetchHistory(userId);
    }
  }, [userId]);

  // Fetch Full Hourly Data
  const fetchFullForecast = async (cityName) => {
    try {
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/forecast?q=${cityName}&appid=${OPENWEATHER_API_KEY}&units=metric`
      );
      return response.data.list; // Return full hourly list
    } catch (err) {
      console.error('Error fetching full forecast:', err);
      return [];
    }
  };

  // Fetch Weather
  const fetchWeather = async (cityName) => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_URL}/api/weather`, {
        params: { city: cityName, userId },
      });
      setWeather(response.data);
      
      // Get full hourly forecast
      const hourlyData = await fetchFullForecast(cityName);
      setForecast(hourlyData); // Store full list for hourly component
      
      fetchHistory(userId);
    } catch (err) {
      setError('❌ City not found. Please try again.');
      setWeather(null);
      setForecast([]);
    }
    setLoading(false);
  };

  // Fetch Weather by Coordinates (for My Location)
  const fetchWeatherByCoords = async (lat, lon) => {
    setLocationLoading(true);
    setError('');
    try {
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`
      );

      const weatherData = {
        city: response.data.name,
        country: response.data.sys.country,
        temperature: Math.round(response.data.main.temp),
        condition: response.data.weather[0].main,
        description: response.data.weather[0].description,
        humidity: response.data.main.humidity,
        windSpeed: Math.round(response.data.wind.speed * 3.6),
        feelsLike: Math.round(response.data.main.feels_like),
      };

      console.log(`✅ Got weather for ${weatherData.city}`);
      setWeather(weatherData);
      
      // Fetch forecast for this location
      const forecastResponse = await axios.get(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`
      );

      setForecast(forecastResponse.data.list);
      fetchHistory(userId);
    } catch (err) {
      setError('❌ Could not fetch weather for your location.');
      console.error('Error:', err);
    }
    setLocationLoading(false);
  };

  // Get My Location
  const handleMyLocation = () => {
    if (!navigator.geolocation) {
      setError('❌ Geolocation not supported by your browser.');
      return;
    }

    setLocationLoading(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        console.log(`📍 Got location: ${latitude}, ${longitude}`);
        fetchWeatherByCoords(latitude, longitude);
      },
      (error) => {
        setLocationLoading(false);
        if (error.code === error.PERMISSION_DENIED) {
          setError('❌ Permission denied. Please enable location access.');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setError('❌ Location information is unavailable.');
        } else if (error.code === error.TIMEOUT) {
          setError('❌ Location request timed out.');
        } else {
          setError('❌ Error getting your location.');
        }
        console.error('Geolocation error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Fetch Forecast
  const fetchForecast = async (cityName) => {
    try {
      const response = await axios.get(`${API_URL}/api/forecast`, {
        params: { city: cityName },
      });
      setForecast(response.data.forecast);
    } catch (err) {
      console.error('Error fetching forecast:', err);
      setForecast([]);
    }
  };

  // Handle Search
  const handleSearch = () => {
    if (city.trim()) {
      fetchWeather(city);
      setCity('');
    }
  };

  // Add to Favorites
  const addToFavorites = async () => {
    if (!weather) return;
    try {
      await axios.post(`${API_URL}/api/favorites`, {
        userId,
        city: weather.city,
      });
      fetchFavorites(userId);
      alert('✅ Added to favorites!');
    } catch (err) {
      alert('⚠️ Already in favorites!');
    }
  };

  // Remove from Favorites
  const removeFromFavorites = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/favorites/${id}`);
      fetchFavorites(userId);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  // Get day name
  const getDayName = (dayOffset) => {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  // Get Background Class
  const getBackgroundClass = () => {
    if (!weather) return 'bg-initial';
    const condition = weather.condition.toLowerCase();
    if (condition.includes('sunny') || condition.includes('clear')) return 'bg-sunny';
    if (condition.includes('rain')) return 'bg-rainy';
    if (condition.includes('cloud')) return 'bg-cloudy';
    if (condition.includes('snow')) return 'bg-snowy';
    if (condition.includes('thunder')) return 'bg-storm';
    return 'bg-default';
  };

  // Get weather icon
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

  // Wait for userId to be loaded
  if (!userId) {
    return <div className="dashboard bg-initial"><div className="overlay"></div></div>;
  }

  return (
    <div className={`dashboard ${getBackgroundClass()}`}>
      <div className="animated-background">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      <div className="overlay"></div>

      <div className="container">
        {/* Initial Welcome Screen */}
        {!weather && (
          <div className="welcome-section">
            <div className="welcome-content">
              <div className="title-icon">🌍</div>
              <h1 className="welcome-title">Weather Dashboard</h1>
              <p className="welcome-subtitle">
                Discover real-time weather information from around the world
              </p>
            </div>
          </div>
        )}

        {/* Search Box */}
        <div className="search-container">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search for a city..."
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="search-input"
            />
            <button onClick={handleSearch} disabled={loading} className="search-btn">
              {loading ? '⏳' : '🔍'}
            </button>
          </div>

          {/* My Location Button */}
          <button 
            onClick={handleMyLocation} 
            disabled={locationLoading}
            className="location-btn"
          >
            {locationLoading ? '⏳ Getting location...' : '📍 My Location'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        {/* Weather Card */}
        {weather && (
          <>
            <div className="weather-card">
              <div className="weather-header">
                <div className="city-info">
                  <h2>{weather.city}, {weather.country}</h2>
                  <p className="date-time">
                    Today ({getDayName(0)})
                  </p>
                </div>
                <button className="favorite-btn" onClick={addToFavorites}>
                  ❤️
                </button>
              </div>

              <div className="weather-main">
                <div className="temperature-section">
                  <div className={`weather-icon ${weather.condition.toLowerCase().includes('clear') ? 'icon-clear' : weather.condition.toLowerCase().includes('sunny') ? 'icon-sunny' : ''}`}>
                    {getWeatherIcon(weather.condition)}
                  </div>
                  <div className="temperature-info">
                    <div className="temperature">{weather.temperature}°</div>
                    <div className="condition">{weather.condition}</div>
                    <div className="description">{weather.description}</div>
                  </div>
                </div>

                <div className="feels-like-box">
                  <span className="label">Feels like</span>
                  <span className="value">{weather.feelsLike}°C</span>
                </div>
              </div>

              <div className="details">
                <div className="detail-item">
                  <div className="detail-icon">💧</div>
                  <div className="detail-content">
                    <span className="detail-label">Humidity</span>
                    <span className="detail-value">{weather.humidity}%</span>
                  </div>
                </div>
                <div className="detail-item">
                  <div className="detail-icon">💨</div>
                  <div className="detail-content">
                    <span className="detail-label">Wind Speed</span>
                    <span className="detail-value">{weather.windSpeed} km/h</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Hourly Forecast */}
            {forecast.length > 0 && (
              <HourlyForecast list={forecast} />
            )}

            {/* 5-Day Forecast */}
            {forecast.length > 0 && (
              <div className="forecast-section">
                <h3 className="forecast-title">📅 5-Day Forecast</h3>
                <div className="forecast-grid">
                  {forecast
                    .filter((item, index) => index % 8 === 0)
                    .slice(0, 4)
                    .map((day, index) => (
                      <div key={index} className="forecast-card">
                        <div className="forecast-day">{getDayName(index + 1)}</div>
                        <div className="forecast-icon">{getWeatherIcon(day.weather[0].main)}</div>
                        <div className="forecast-temp">{Math.round(day.main.temp)}°C</div>
                        <div className="forecast-condition">{day.weather[0].main}</div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Tabs - NOW ALWAYS VISIBLE */}
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            🔍 Search
          </button>
          <button
            className={`tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('history');
              fetchHistory(userId);
            }}
          >
            📜 History ({history.length}/10)
          </button>
          <button
            className={`tab ${activeTab === 'favorites' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('favorites');
              fetchFavorites(userId);
            }}
          >
            ❤️ Favorites ({favorites.length})
          </button>
        </div>

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="tab-content">
            <h3>📜 Search History</h3>
            {history.length === 0 ? (
              <p className="empty-message">No search history yet</p>
            ) : (
              <div className="list">
                {history.map((item, index) => (
                  <div key={index} className="list-item">
                    <div className="list-content">
                      <strong>{item.city}</strong>
                      <p>{item.temperature}°C • {item.condition}</p>
                      <small>{new Date(item.timestamp).toLocaleString()}</small>
                    </div>
                    <button
                      onClick={() => fetchWeather(item.city)}
                      className="btn-small"
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Favorites Tab */}
        {activeTab === 'favorites' && (
          <div className="tab-content">
            <h3>❤️ Favorite Cities</h3>
            {favorites.length === 0 ? (
              <p className="empty-message">No favorites yet</p>
            ) : (
              <div className="list">
                {favorites.map((fav) => (
                  <div key={fav._id} className="list-item">
                    <div className="list-content">
                      <strong>{fav.city}</strong>
                      <small>Added {new Date(fav.addedAt).toLocaleDateString()}</small>
                    </div>
                    <div className="button-group">
                      <button
                        onClick={() => fetchWeather(fav.city)}
                        className="btn-small btn-view"
                      >
                        View
                      </button>
                      <button
                        onClick={() => removeFromFavorites(fav._id)}
                        className="btn-small btn-delete"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default WeatherDashboard;