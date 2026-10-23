import { useAuth } from './auth.jsx';
import LoginPage from './pages/LoginPage.jsx';
import TasksPage from './pages/TasksPage.jsx';

export default function App() {
  const { user } = useAuth();
  return user ? <TasksPage /> : <LoginPage />;
}
