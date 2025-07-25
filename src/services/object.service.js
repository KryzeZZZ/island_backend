const axios = require('axios');

class ObjectService {
  constructor() {
    this.scanUrl = 'http://localhost:8000/scan_objects';
  }

  async scanObjectsFromDescription(text) {
    try {
      const response = await axios.post(this.scanUrl, { text });

      console.log('Object Scanning Response:', JSON.stringify(response.data, null, 2));
      return response.data;  // 返回对象数组 [{ object, refinable, interactable, is_entry }]
    } catch (error) {
      if (error.response) {
        console.error('Server Error Response:', error.response.data);
        throw new Error(`Object scanning service error: ${error.response.data.detail || error.response.data.message || error.message}`);
      } else if (error.request) {
        throw new Error('No response from object scanning service');
      } else {
        throw new Error(`Failed to scan objects: ${error.message}`);
      }
    }
  }
}

module.exports = new ObjectService(); 