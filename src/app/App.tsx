import { Outlet, Link, useLocation } from "react-router-dom";
import styles from "./App.module.css";

function App() {
  const location = useLocation();
  
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
        <button className={styles.login}>
          Регистрация / Логин
        </button>
      </header>
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}

export default App;
