import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LoginForm } from '../../features/auth';
import { authApi } from '../../shared/api';
import { userModel } from '../../entities/user';
import type { LoginRequest } from '../../shared/types/authTypes';
import styles from './LoginPage.module.css';

export const LoginPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (credentials: LoginRequest) => {
    setIsLoading(true);
    try {
      const response = await authApi.login(credentials);
      userModel.saveToken(response.data.token);
      userModel.saveUser(response.data.user);
      navigate('/');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <LoginForm onSubmit={handleLogin} isLoading={isLoading} />
        <div className={styles.footer}>
          <p className={styles.footerText}>
            Нет аккаунта?{' '}
            <Link to="/register" className={styles.link}>
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

