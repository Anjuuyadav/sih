import axios from 'axios';

const apiClient = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
});

apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');

    if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

export const normalizeApiError = (error, fallbackMessage = 'Something went wrong') => {
    const responseData = error?.response?.data;
    const validationErrors = responseData?.errors;

    if (Array.isArray(validationErrors) && validationErrors.length > 0) {
        return validationErrors
            .map((item) => item?.msg || item?.message || 'Validation error')
            .filter(Boolean)
            .join('. ');
    }

    return responseData?.message || responseData?.error || error?.message || fallbackMessage;
};

export const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export default apiClient;