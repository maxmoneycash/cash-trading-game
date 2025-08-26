/**
 * API Service - Proof of Concept
 * Handles communication with the backend database
 */

const API_BASE_URL = 'http://localhost:3001';

export interface ApiResponse<T = any> {
  data: T;
  error?: string;
}

class ApiService {
  /**
   * Make a GET request
   */
  async get<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }
      
      return { data };
    } catch (error: any) {
      console.error('API GET error:', error);
      return { data: null as any, error: error.message };
    }
  }

  /**
   * Make a POST request
   */
  async post<T = any>(endpoint: string, payload?: any): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: payload ? JSON.stringify(payload) : undefined,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }
      
      return { data };
    } catch (error: any) {
      console.error('API POST error:', error);
      return { data: null as any, error: error.message };
    }
  }

  /**
   * Test endpoints for POC
   */
  async getUsers() {
    return this.get('/api/test/users');
  }

  async getRounds() {
    return this.get('/api/test/rounds');
  }

  async createTestRound() {
    return this.post('/api/test/round');
  }

  /**
   * Health check
   */
  async healthCheck() {
    return this.get('/health');
  }
}

export const api = new ApiService();