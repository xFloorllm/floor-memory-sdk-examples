import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { validateConfig } from './config/appConfig.js';

// Validate configuration on startup
const configErrors = validateConfig();
if (configErrors.length > 0) {
  console.error('❌ Configuration Error:');
  configErrors.forEach(error => console.error(`   - ${error}`));
  console.error('\n📝 Please configure your credentials in src/config/appConfig.js');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
);
