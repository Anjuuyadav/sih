import apiClient from './apiClient';

export const submitFeedback = async (text) => {
  const response = await apiClient.post('/feedback', {
    text,
  });

  return response.data;
};