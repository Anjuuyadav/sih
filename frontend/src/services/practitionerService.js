import apiClient, { normalizeApiError } from './apiClient';

const request = async (method, url, data) => {
  try {
    const response = await apiClient[method](url, data);
    return response.data;
  } catch (error) {
    const normalized = new Error(normalizeApiError(error));
    normalized.status = error.response?.status;
    throw normalized;
  }
};

export const getSessionRequests = async () => (await request('get', '/practitioner/session-requests')).requests || [];
export const getSessionRequestDetails = async (therapyPlanId) => (await request('get', `/practitioner/session-requests/${therapyPlanId}`)).request;
export const acceptSessionRequest = (therapyPlanId) => request('post', `/practitioner/session-requests/${therapyPlanId}/accept`);
export const rejectSessionRequest = (therapyPlanId, rejectionReason) => request('post', `/practitioner/session-requests/${therapyPlanId}/reject`, { rejectionReason });