import axios from 'axios';

const baseURL = 'http://localhost:3000';

const customAxiosInstance = axios.create({
  baseURL,
});

export { customAxiosInstance as api };