import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../context/SessionStore';
import SessionCard from '../components/SessionCard';
import NewSessionModal from '../components/NewSessionModal';
import styles from './HomeScreen.module.css';

export default function HomeScreen() {
  const { sessions } = useSessionStore();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <span className={styles.wordmark}>regression-reader</span>
        <button className={styles.newButton} onClick={() => setShowModal(true)}>
          New Session
        </button>
      </header>

      <main className={styles.list}>
        {sessions.length === 0 ? (
          <p className={styles.empty}>
            No sessions yet — create one to get started.
          </p>
        ) : (
          sessions.map(session => (
            <SessionCard
              key={session.id}
              session={session}
              onOpen={() => navigate(`/session/${session.id}`)}
            />
          ))
        )}
      </main>

      {showModal && <NewSessionModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
