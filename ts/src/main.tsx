import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { validateConfig } from './config/appConfig';

const configErrors = validateConfig();
if (configErrors.length > 0) {
  console.error('❌ Configuration Error:');
  configErrors.forEach((error) => console.error(`   - ${error}`));
  console.error('\n📝 Please configure your credentials in src/config/appConfig.ts or use the credentials form.');
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
