const axios = require('axios');

class VectorizeService {
  constructor() {
    this.vectorizeUrl = 'http://localhost:8000';
  }

  async vectorizeDescription(description) {
    try {
      const response = await axios.post(`${this.vectorizeUrl}/vectorize/descriptions`, {
        descriptions: [description]
      });

      console.log('Vectorization Response:', JSON.stringify(response.data, null, 2));

      if (!Array.isArray(response.data) || response.data.length === 0) {
        throw new Error('Invalid response from vectorization service');
      }

      const result = response.data[0];
      if (!result.vector) {
        throw new Error('No vector returned for description');
      }

      return result.vector;
    } catch (error) {
      if (error.response) {
        console.error('Server Error Response:', error.response.data);
        throw new Error(`Vectorization service error: ${error.response.data.detail || error.response.data.message || error.message}`);
      } else if (error.request) {
        console.error('No Response Error:', error.request);
        throw new Error('No response from vectorization service');
      } else {
        console.error('Request Error:', error);
        throw new Error(`Failed to vectorize description: ${error.message}`);
      }
    }
  }

  async vectorizeRelation(subject, predicate, object) {
    try {
      const response = await axios.post(`${this.vectorizeUrl}/vectorize/relations`, {
        relations: [{
          subject,
          predicate,
          object
        }]
      });

      console.log('Relation Vectorization Response:', JSON.stringify(response.data, null, 2));

      if (!Array.isArray(response.data) || response.data.length === 0) {
        throw new Error('Invalid response from vectorization service');
      }

      const result = response.data[0];
      if (!result.vector) {
        throw new Error('No vector returned for relation');
      }

      return result.vector;
    } catch (error) {
      if (error.response) {
        throw new Error(`Vectorization service error: ${error.response.data.detail || error.response.data.message || error.message}`);
      } else if (error.request) {
        throw new Error('No response from vectorization service');
      } else {
        throw new Error(`Failed to vectorize relation: ${error.message}`);
      }
    }
  }

  async batchVectorizeDescriptions(descriptions) {
    try {
      const response = await axios.post(`${this.vectorizeUrl}/vectorize/descriptions`, {
        descriptions
      });

      console.log('Batch Descriptions Response:', JSON.stringify(response.data, null, 2));

      if (!Array.isArray(response.data)) {
        throw new Error('Invalid response from vectorization service');
      }

      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`Vectorization service error: ${error.response.data.detail || error.response.data.message || error.message}`);
      } else if (error.request) {
        throw new Error('No response from vectorization service');
      } else {
        throw new Error(`Failed to batch vectorize descriptions: ${error.message}`);
      }
    }
  }

  async batchVectorizeRelations(relations) {
    try {
      const response = await axios.post(`${this.vectorizeUrl}/vectorize/relations`, {
        relations
      });

      console.log('Batch Relations Response:', JSON.stringify(response.data, null, 2));

      if (!Array.isArray(response.data)) {
        throw new Error('Invalid response from vectorization service');
      }

      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`Vectorization service error: ${error.response.data.detail || error.response.data.message || error.message}`);
      } else if (error.request) {
        throw new Error('No response from vectorization service');
      } else {
        throw new Error(`Failed to batch vectorize relations: ${error.message}`);
      }
    }
  }
}

module.exports = new VectorizeService(); 