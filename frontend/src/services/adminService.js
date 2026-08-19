import apiClient, { normalizeApiError } from './apiClient';

const request = async (method, url, data) => {
  try { const response = await apiClient[method](url, data); return response.data; }
  catch (error) { throw new Error(normalizeApiError(error)); }
};
export const getPractitioners = async () => (await request('get', '/admin/practitioners')).practitioners || [];
export const getPractitionerById = async (id) => (await request('get', `/admin/practitioners/${id}`)).practitioner;
export const savePractitioner = async (id, data) => request(id ? 'put' : 'post', id ? `/admin/practitioners/${id}` : '/admin/practitioners', data);
export const deactivatePractitioner = (id) => request('delete', `/admin/practitioners/${id}`);
export const getTherapies = async () => (await request('get', '/admin/therapies')).therapies || [];
export const saveTherapy = async (id, data) => request(id ? 'put' : 'post', id ? `/admin/therapies/${id}` : '/admin/therapies', data);
export const deactivateTherapy = (id) => request('delete', `/admin/therapies/${id}`);
export const getPrecautions = async (id) => (await request('get', `/admin/therapies/${id}/precautions`)).precautions || [];
export const savePrecaution = async (therapyId, data) => request('post', `/admin/therapies/${therapyId}/precautions`, data);
export const updatePrecaution = async (id, data) => request('put', `/admin/therapy-precautions/${id}`, data);
export const deletePrecaution = (id) => request('delete', `/admin/therapy-precautions/${id}`);
