import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import { signOut } from './lib/supabaseClient';
import './index.css';

function AppContent() {
  const { user, userRole, loading } = useAuth();

  // แสดง loading ตอน check session ครั้งแรก
  if (loading) {
    return (
      <div className="app-container">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          fontSize: '1.2rem',
          color: '#666'
        }}>
          Loading...
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await signOut();
    // AuthContext จะ update state อัตโนมัติผ่าน onAuthStateChange
  };

  // สร้าง user object ที่ DashboardPage คาดหวัง
  const userForDashboard = user ? {
    email: user.email,
    role: userRole || 'operator',
    name: user.user_metadata?.full_name || user.email.split('@')[0],
    id: user.id
  } : null;

  return (
    <div className="app-container">
      {!user ? (
        <LoginPage />
      ) : (
        <DashboardPage user={userForDashboard} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}