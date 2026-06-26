import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomeScreen from './screens/HomeScreen';
import ReaderView from './screens/ReaderView';
import styles from './App.module.css';

function UnsupportedBrowser() {
  return (
    <div className={styles.unsupported}>
      <div className={styles.unsupportedCard}>
        <h1>Unsupported Browser</h1>
        <p>
          regression-reader requires the File System Access API, which is only
          available in <strong>Chrome</strong> or <strong>Edge</strong>.
        </p>
        <p>Please open this app in one of those browsers to continue.</p>
      </div>
    </div>
  );
}

export default function App() {
  if (!('showOpenFilePicker' in window)) {
    return <UnsupportedBrowser />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/session/:id" element={<ReaderView />} />
      </Routes>
    </BrowserRouter>
  );
}
