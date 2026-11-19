import {createRoot} from 'react-dom/client';
import App from './App';
import {boot} from './store';
import './style.css';
boot();
createRoot(document.getElementById('root')!).render(<App/>);
