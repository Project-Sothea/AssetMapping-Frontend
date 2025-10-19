import { apiClient } from './services/apiClient';

// Test the API connection
async function testConnection() {
  console.log('Testing backend API connection...');

  try {
    // Test health check
    const healthResponse = await apiClient.healthCheck();
    if (healthResponse.success) {
      console.log('✅ Health check passed:', healthResponse.data);
    } else {
      console.log('❌ Health check failed:', healthResponse.error);
    }

    // Test pin validation
    const testPin = {
      id: 'test-pin-1',
      lat: 11.5564,
      lng: 104.9282,
      type: 'hospital',
      name: 'Test Hospital',
      address: '123 Test St',
      cityVillage: 'Phnom Penh',
      description: 'Test pin for API validation',
      images: [],
      userId: 'test-user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const validationResponse = await apiClient.validatePin(testPin);
    if (validationResponse.success) {
      console.log('✅ Pin validation passed:', validationResponse.data);
    } else {
      console.log('❌ Pin validation failed:', validationResponse.error);
    }
  } catch (error) {
    console.error('❌ API test failed:', error);
  }
}

testConnection();
