import axios from 'axios';

const baseURL = 'http://localhost:3000';

const customAxiosInstance = axios.create({
  baseURL,
});

// Добавляем interceptor для автоматической отправки токена
customAxiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Добавляем interceptor для обработки ошибок авторизации
customAxiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Токен недействителен или истек - очищаем данные авторизации
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      // Перенаправляем на страницу входа
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export { customAxiosInstance as api };