import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

import { Provider } from 'react-redux';
import { persistor, store } from './app/store';
import { PersistGate } from 'redux-persist/integration/react';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
     <Provider store={store}>
    
      {/* Your router and other providers here */}
      <PersistGate loading={null} persistor={persistor}>
       <App />
      </PersistGate>
    
    </Provider>
   
  </React.StrictMode>
);