import apiClient, { normalizeApiError } from './apiClient';

const DOCTOR_BASE = '/admin/Practitioner';

export const getDoctors = async () => {
  try {
    const response = await apiClient.get(DOCTOR_BASE);
    return response.data.doctors || [];
  } catch (error) {
    throw new Error(normalizeApiError(error, 'Failed to fetch doctors'));
  }
};

export const getDoctorById = async (doctorId) => {
  try {
    const response = await apiClient.get(`${DOCTOR_BASE}/${doctorId}`);
    return response.data.doctor;
  } catch (error) {
    throw new Error(normalizeApiError(error, 'Failed to fetch doctor'));
  }
};

export const createDoctor = async (doctorData) => {
  try {
    const response = await apiClient.post(DOCTOR_BASE, doctorData);
    return response.data;
  } catch (error) {
    throw new Error(normalizeApiError(error, 'Failed to create doctor'));
  }
};

export const updateDoctor = async (doctorId, doctorData) => {
  try {
    const response = await apiClient.put(`${DOCTOR_BASE}/${doctorId}`, doctorData);
    return response.data;
  } catch (error) {
    throw new Error(normalizeApiError(error, 'Failed to update doctor'));
  }
};

export const deleteDoctor = async (doctorId) => {
  try {
    const response = await apiClient.delete(`${DOCTOR_BASE}/${doctorId}`);
    return response.data;
  } catch (error) {
    throw new Error(normalizeApiError(error, 'Failed to delete doctor'));
  }
};