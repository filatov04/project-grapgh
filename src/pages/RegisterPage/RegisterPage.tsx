import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { RegisterForm } from '../../features/auth';
import { authApi } from '../../shared/api';
import { userModel } from '../../entities/user';
import type { RegisterRequest } from '../../shared/types/authTypes';
import styles from './RegisterPage.module.css';

export const RegisterPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (data: RegisterRequest) => {
    setIsLoading(true);
    try {
      const response = await authApi.register(data);
      userModel.saveToken(response.data.token);
      userModel.saveUser(response.data.user);
      navigate('/');
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <RegisterForm onSubmit={handleRegister} isLoading={isLoading} />
        <div className={styles.footer}>
          <p className={styles.footerText}>
            Уже есть аккаунт?{' '}
            <Link to="/login" className={styles.link}>
              Войти
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

