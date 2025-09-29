const axios = require('axios');

class GoogleMapsService {
  
  // Calculate distance and duration using Google Maps Distance Matrix API
  static async calculateDistanceAndDuration(origins, destinations) {
    try {
      const response = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
        params: {
          origins: origins.join('|'),
          destinations: destinations.join('|'),
          key: process.env.GOOGLE_MAPS_API_KEY,
          units: 'metric'
        }
      });

      if (response.data.status !== 'OK') {
        throw new Error(`Google Maps API error: ${response.data.status}`);
      }

      const element = response.data.rows[0].elements[0];
      
      if (element.status !== 'OK') {
        throw new Error(`Route calculation failed: ${element.status}`);
      }

      return {
        distance: element.distance.value / 1000, // Convert to kilometers
        duration: element.duration.value / 60, // Convert to minutes
        distance_text: element.distance.text,
        duration_text: element.duration.text
      };
    } catch (error) {
      console.error('Google Maps API error:', error);
      throw new Error('Failed to calculate distance');
    }
  }

  // Get coordinates from address using Geocoding API
  static async getCoordinatesFromAddress(address) {
    try {
      const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: {
          address: address,
          key: process.env.GOOGLE_MAPS_API_KEY
        }
      });

      if (response.data.status !== 'OK') {
        throw new Error(`Geocoding API error: ${response.data.status}`);
      }

      const location = response.data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng,
        formatted_address: response.data.results[0].formatted_address
      };
    } catch (error) {
      console.error('Geocoding API error:', error);
      throw new Error('Failed to get coordinates');
    }
  }

  // Get address from coordinates using Reverse Geocoding API
  static async getAddressFromCoordinates(lat, lng) {
    try {
      const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: {
          latlng: `${lat},${lng}`,
          key: process.env.GOOGLE_MAPS_API_KEY
        }
      });

      if (response.data.status !== 'OK') {
        throw new Error(`Reverse geocoding API error: ${response.data.status}`);
      }

      return response.data.results[0].formatted_address;
    } catch (error) {
      console.error('Reverse geocoding API error:', error);
      throw new Error('Failed to get address');
    }
  }
}

module.exports = GoogleMapsService;