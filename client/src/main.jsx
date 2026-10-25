import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { dark } from '@clerk/themes';
import App from './App';
import './index.css';

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const RootComponent = () => {
  if (clerkPubKey) {
    return (
      <ClerkProvider
        publishableKey={clerkPubKey}
        afterSignOutUrl="/"
        appearance={{
          baseTheme: dark,
          variables: {
            colorPrimary: '#6366f1',
            colorBackground: '#0b0f19',
            colorInputBackground: '#070a13',
            colorInputText: '#f8fafc',
            colorText: '#f8fafc',
            colorTextSecondary: '#94a3b8',
            colorNeutral: '#f8fafc',
            colorBorder: '#1e293b'
          }
        }}
      >
        <App />
      </ClerkProvider>
    );
  }
  return <App />;
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RootComponent />
  </React.StrictMode>
);
