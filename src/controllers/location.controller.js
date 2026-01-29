const axios = require('axios');

exports.getAddressFromCoordinates = async (req, res) => {
  try {
    const { latitude, longitude } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    // Using Nominatim (OpenStreetMap) for reverse geocoding - free and no API key required
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'FarmerCrate/1.0'
      }
    });

    if (response.data && response.data.display_name) {
      const address = response.data.address || {};
      res.json({
        success: true,
        address: response.data.display_name,
        details: {
          village: address.village || address.suburb || '',
          city: address.city || address.town || address.village || '',
          district: address.state_district || address.county || '',
          state: address.state || '',
          country: address.country || '',
          postcode: address.postcode || ''
        }
      });
    } else {
      res.status(404).json({ message: 'Address not found for the given coordinates' });
    }
  } catch (error) {
    console.error('Get address error:', error);
    res.status(500).json({ message: 'Failed to get address' });
  }
};
