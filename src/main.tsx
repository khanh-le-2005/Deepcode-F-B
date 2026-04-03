import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import axios, { AxiosHeaders } from 'axios';
import App from './App.tsx';
import './index.css';

axios.defaults.baseURL = 'http://localhost:3000';

const bootToken = localStorage.getItem('qr_dine_token');
if (bootToken) {
  axios.defaults.headers.common.Authorization = `Bearer ${bootToken}`;
}

// Global Axios Interceptor to attach JWT token
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('qr_dine_token');
  if (token) {
    const headers = AxiosHeaders.from(config.headers ?? {});
    headers.set('Authorization', `Bearer ${token}`);
    config.headers = headers;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
