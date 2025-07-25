const axios = require('axios');

class SceneGeneratorService {
  constructor() {
    this.generateUrl = 'http://localhost:8000/generate/inner_scene';
  }

  async generateScene(entryTerm, externalObjects = []) {
    try {
      const response = await axios.post(this.generateUrl, {
        entry_term: entryTerm,
        external_objects: externalObjects
      });

      console.log('Scene Generation Response:', JSON.stringify(response.data, null, 2));
      return response.data.scene;
    } catch (error) {
      if (error.response) {
        console.error('Server Error Response:', error.response.data);
        throw new Error(`Scene generation error: ${error.response.data.detail || error.response.data.message || error.message}`);
      } else if (error.request) {
        throw new Error('No response from scene generation service');
      } else {
        throw new Error(`Failed to generate scene: ${error.message}`);
      }
    }
  }
}

module.exports = new SceneGeneratorService(); 