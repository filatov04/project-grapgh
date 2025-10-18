import axios from 'axios';

// Используем переменную окружения или значение по умолчанию
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:80/api/v1';

const customAxiosInstance = axios.create({
  baseURL,
});

// Добавляем interceptor для автоматической отправки токена
customAxiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
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
  async (error) => {
    const originalRequest = error.config;

    // Если получили 401 и это не повторный запрос
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Пытаемся обновить токен
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${baseURL}/auth/refresh`, {
            refresh_token: refreshToken
          });

          const { access_token, refresh_token: newRefreshToken } = response.data;
          
          // Сохраняем новые токены
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', newRefreshToken);

          // Обновляем заголовок оригинального запроса
          originalRequest.headers.Authorization = `Bearer ${access_token}`;

          // Повторяем оригинальный запрос
          return customAxiosInstance(originalRequest);
        }
      } catch (refreshError) {
        // Если не удалось обновить токен - очищаем данные и перенаправляем
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_data');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export { customAxiosInstance as api };