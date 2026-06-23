import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/parkez-theme.css'
import App from './App.jsx'
import { Provider } from 'react-redux'
import { Store } from "./utils/redux/store.js";
createRoot(document.getElementById('root')).render(
  <Provider store={Store}>
    <App />
  </Provider>
)
