import { useMemo } from 'react';
import MainLayout from './components/MainLayout';
import { AuthContext, useAuthController } from './hooks/useAuth';

export default function App() {
  const auth = useAuthController();
  const value = useMemo(() => auth, [auth]);
  return (
    <AuthContext.Provider value={value}>
      <MainLayout />
    </AuthContext.Provider>
  );
}
