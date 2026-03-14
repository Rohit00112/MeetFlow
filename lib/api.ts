/**
 * API utility functions for making requests to the backend
 */

// Base URL for API requests
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
console.log('Using API URL:', API_URL);

// Types
type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface RequestOptions {
  method?: RequestMethod;
  headers?: Record<string, string>;
  body?: unknown;
  token?: string;
}

/**
 * Make an API request
 */
export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    method = 'GET',
    headers = {},
    body,
    token,
  } = options;

  // Build request headers
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // Add authorization header if token is provided
  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  // Build request options
  const requestOptions: RequestInit = {
    method,
    headers: requestHeaders,
  };

  // Add body for non-GET requests
  if (method !== 'GET' && body) {
    requestOptions.body = JSON.stringify(body);
  }

  // Log the request for debugging
  console.log(`API Request: ${method} ${API_URL}${endpoint}`);
  if (method !== 'GET' && body) {
    console.log('Request body:', JSON.stringify(body));
  }

  // Make the request
  const response = await fetch(`${API_URL}${endpoint}`, requestOptions);
  console.log(`API Response status: ${response.status} ${response.statusText}`);

  // Parse the response
  let data: unknown;
  try {
    // Check if the response is JSON
    const contentType = response.headers.get('content-type');
    console.log('Response content-type:', contentType);

    if (contentType && contentType.includes('application/json')) {
      const responseText = await response.text();
      console.log('Response text:', responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''));

      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Error parsing JSON:', parseError);
        throw new Error('Failed to parse JSON response. Please try again later.');
      }
    } else {
      // If not JSON, get the text and create an error object
      const text = await response.text();
      console.error('Received non-JSON response:', text.substring(0, 200) + (text.length > 200 ? '...' : ''));
      data = { error: 'Received non-JSON response from server' };
    }
  } catch (error) {
    console.error('Error parsing response:', error);
    throw new Error('Failed to parse server response. Please try again later.');
  }

  // Handle error responses
  if (!response.ok) {
    const responseError =
      typeof data === 'object' &&
      data !== null &&
      'error' in data &&
      typeof data.error === 'string'
        ? data.error
        : undefined;

    // Create a more descriptive error message based on status code
    let errorMessage = responseError || 'Something went wrong';

    if (response.status === 401) {
      errorMessage = responseError || 'Authentication failed. Please check your credentials.';
    } else if (response.status === 403) {
      errorMessage = responseError || 'You do not have permission to access this resource.';
    } else if (response.status === 404) {
      errorMessage = responseError || 'The requested resource was not found.';
    } else if (response.status === 500) {
      errorMessage = responseError || 'A server error occurred. Please try again later.';
    }

    throw new Error(errorMessage);
  }

  return data as T;
}

import { getToken, clearAuthData } from './tokenManager';

/**
 * Get the authentication token from tokenManager
 */
export function getAuthToken(): string | null {
  return getToken();
}

/**
 * Make an authenticated API request
 */
export async function authenticatedRequest<T = unknown>(
  endpoint: string,
  options: Omit<RequestOptions, 'token'> = {}
): Promise<T> {
  console.log(`Making authenticated request to ${endpoint}`);
  const token = getAuthToken();

  if (!token) {
    console.error('No authentication token found');
    throw new Error('No authentication token found');
  }

  try {
    console.log(`Using token for request to ${endpoint}`);
    const response = await apiRequest<T>(endpoint, {
      ...options,
      token,
    });
    console.log(`Authenticated request to ${endpoint} successful`);
    return response;
  } catch (error) {
    // Handle token expiration
    if (error instanceof Error &&
        (error.message.includes('Authentication failed') ||
         error.message.includes('invalid token') ||
         error.message.includes('jwt expired') ||
         error.message.includes('unauthorized') ||
         error.message.includes('authentication') ||
         error.message.includes('Unauthorized') ||
         error.message.includes('Authentication'))) {
      // Clear the invalid token using tokenManager
      console.warn('Token validation failed, clearing auth state:', error.message);
      clearAuthData();

      // Don't redirect automatically - let the ProtectedLayout handle it
      // This prevents redirect loops and allows for better error handling
    }

    console.error(`Authenticated request to ${endpoint} failed:`, error);
    throw error;
  }
}
