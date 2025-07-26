const axios = require('axios');
const VectorizeService = require('./vectorize.service');

class MovementService {
  constructor() {
    this.movementUrl = 'http://localhost:8000/movement';
  }

  async processMovement(userId, text) {
    try {
      const response = await axios.post(this.movementUrl, {
        user_id: userId,
        command: text
      });

      console.log('Movement Response:', JSON.stringify(response.data, null, 2));
      
      // 如果响应中没有向量，尝试使用描述向量化
      if (!response.data.vector) {
        console.log('No vector in response, attempting to vectorize description');
        const vector = await VectorizeService.vectorizeDescription(text);
        return vector;
      }
      
      return response.data.vector;
    } catch (error) {
      if (error.response) {
        console.error('Server Error Response:', error.response.data);
        throw new Error(`Movement service error: ${error.response.data.detail || error.response.data.message || error.message}`);
      } else if (error.request) {
        throw new Error('No response from movement service');
      } else {
        throw new Error(`Failed to process movement: ${error.message}`);
      }
    }
  }
}

module.exports = new MovementService(); 