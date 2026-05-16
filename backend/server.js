const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
};

app.use(cors(corsOptions));
app.use(express.json());

// MongoDB Connection
const mongoURI = process.env.MONGODB_URI;
mongoose.connect(mongoURI)
  .then(() => console.log('✅ MongoDB Connected!'))
  .catch(err => console.log('❌ MongoDB Error:', err));

// =====================
// SCHEMAS
// =====================

const weatherSearchSchema = new mongoose.Schema({
  userId: String,
  city: String,
  temperature: Number,
  condition: String,
  humidity: Number,
  windSpeed: Number,
  feelsLike: Number,
  timestamp: { type: Date, default: Date.now },
});

const WeatherSearch = mongoose.model('WeatherSearch', weatherSearchSchema);

const favoriteSchema = new mongoose.Schema({
  userId: String,
  city: String,
  addedAt: { type: Date, default: Date.now },
});

const Favorite = mongoose.model('Favorite', favoriteSchema);

// =====================
// API KEY
// =====================

const API_KEY = process.env.OPENWEATHER_API_KEY;

// =====================
// API ENDPOINTS
// =====================

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend is running!' });
});

// Get Weather by City
app.get('/api/weather', async (req, res) => {
  try {
    const city = req.query.city;
    const userId = req.query.userId || 'anonymous';

    if (!city) {
      return res.status(400).json({ error: 'City name required' });
    }

    console.log(`🔍 Fetching weather for: ${city}`);

    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`
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

    // Save to MongoDB (Max 10 records per user)
    const searchCount = await WeatherSearch.countDocuments({ userId });
    if (searchCount >= 10) {
      const oldest = await WeatherSearch.findOne({ userId }).sort({ timestamp: 1 });
      if (oldest) await WeatherSearch.deleteOne({ _id: oldest._id });
    }

    const search = new WeatherSearch({
      userId,
      city: weatherData.city,
      temperature: weatherData.temperature,
      condition: weatherData.condition,
      humidity: weatherData.humidity,
      windSpeed: weatherData.windSpeed,
      feelsLike: weatherData.feelsLike,
    });

    await search.save();
    res.json(weatherData);
  } catch (err) {
    console.error('❌ Error:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      error: err.response?.data?.message || 'City not found or API error'
    });
  }
});

// Get Weather by Coordinates
app.get('/api/weather/coords', async (req, res) => {
  try {
    const { lat, lon, userId = 'anonymous' } = req.query;

    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
    );

    const forecastResponse = await axios.get(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
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

    // Save to MongoDB
    const searchCount = await WeatherSearch.countDocuments({ userId });
    if (searchCount >= 10) {
      const oldest = await WeatherSearch.findOne({ userId }).sort({ timestamp: 1 });
      if (oldest) await WeatherSearch.deleteOne({ _id: oldest._id });
    }

    await new WeatherSearch({
      userId,
      city: weatherData.city,
      temperature: weatherData.temperature,
      condition: weatherData.condition,
      humidity: weatherData.humidity,
      windSpeed: weatherData.windSpeed,
      feelsLike: weatherData.feelsLike,
    }).save();

    res.json({ weather: weatherData, forecast: forecastResponse.data.list });
  } catch (err) {
    console.error('❌ Error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Could not fetch weather by location' });
  }
});

// Get Full Forecast by City
app.get('/api/forecast/full', async (req, res) => {
  try {
    const { city } = req.query;
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric`
    );
    res.json(response.data.list);
  } catch (err) {
    console.error('❌ Error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Error fetching forecast' });
  }
});

// Get History
app.get('/api/history', async (req, res) => {
  try {
    const userId = req.query.userId || 'anonymous';
    const history = await WeatherSearch.find({ userId })
      .sort({ timestamp: -1 })
      .limit(10);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching history' });
  }
});

// Add to Favorites
app.post('/api/favorites', async (req, res) => {
  try {
    const { userId, city } = req.body;
    const exists = await Favorite.findOne({ userId, city });
    if (exists) return res.status(400).json({ error: 'Already in favorites' });
    const favorite = new Favorite({ userId, city });
    await favorite.save();
    res.json(favorite);
  } catch (err) {
    res.status(500).json({ error: 'Error adding to favorites' });
  }
});

// Get Favorites
app.get('/api/favorites', async (req, res) => {
  try {
    const userId = req.query.userId || 'anonymous';
    const favorites = await Favorite.find({ userId });
    res.json(favorites);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching favorites' });
  }
});

// Remove from Favorites
app.delete('/api/favorites/:id', async (req, res) => {
  try {
    await Favorite.deleteOne({ _id: req.params.id });
    res.json({ message: 'Removed from favorites' });
  } catch (err) {
    res.status(500).json({ error: 'Error removing favorite' });
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ MongoDB URI loaded: ${mongoURI ? 'Yes' : 'No'}`);
  console.log(`✅ API Key loaded: ${API_KEY ? 'Yes' : 'No'}`);
});