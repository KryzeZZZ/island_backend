const axios = require('axios');

class MotiveService {
  constructor() {
    this.extractMotivesUrl = 'http://localhost:8000/extract_motives';  // 假设微服务运行在5000端口
  }

  async extractMotives(text) {
    try {
      const response = await axios.post(this.extractMotivesUrl, { text });
      return response.data;
    } catch (error) {
      console.error('Error extracting motives:', error);
      throw new Error('Failed to extract motives: ' + error.message);
    }
  }
}

module.exports = new MotiveService(); 