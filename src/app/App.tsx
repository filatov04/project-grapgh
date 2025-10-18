import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "./providers";
import styles from "./App.module.css";

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Закрываем меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <nav className={styles.tabs}>
          <Link 
            to="/" 
            className={`${styles.tab} ${location.pathname === "/" ? styles.active : ""}`}
          >
            Граф
          </Link>
          <Link 
            to="/markup" 
            className={`${styles.tab} ${location.pathname === "/markup" ? styles.active : ""}`}
          >
            Разметка
          </Link>
        </nav>
        <div className={styles.userMenu} ref={menuRef}>
          <button 
            className={styles.login}
            onClick={() => setShowMenu(!showMenu)}
          >
            {user && `${user.firstName} ${user.lastName}`}
          </button>
          {showMenu && (
            <div className={styles.dropdown}>
              <div className={styles.userInfo}>
                <p className={styles.userName}>{user?.firstName} {user?.lastName}</p>
                <p className={styles.userEmail}>{user?.email}</p>
              </div>
              <button 
                className={styles.logoutBtn}
                onClick={handleLogout}
              >
                Выйти
              </button>
            </div>
          )}
        </div>
      </header>
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}

export default App;
