import apiClient, { normalizeApiError } from './apiClient';

const request = async (method, url, data) => {
  try {
    const response = await apiClient[method](url, data);
    return response.data;
  } catch (error) {
    const normalized = new Error(normalizeApiError(error));
    normalized.status = error.response?.status;
    normalized.response = error.response;
    throw normalized;
  }
};

export const getPatientTherapies = async () => (await request('get', '/patient/therapies')).data || [];

export const searchAvailability = async (preferences) => request('post', '/availability/search', preferences);

export const createBooking = async (booking) => request('post', '/bookings', booking);

export const getAppointments = async () => (await request('get', '/patient/appointments')).data || [];

export const getNotifications = async () => (await request('get', '/notifications')).notifications || [];