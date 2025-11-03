import { useRoutes } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { DashboardPage } from '../pages/DashboardPage';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { SettingsPage } from '../pages/SettingsPage';
import { ChatPage } from '../pages/ChatPage';

const routes = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'chat/:serverId/:channelId', element: <ChatPage /> },
      { path: 'settings', element: <SettingsPage /> }
    ]
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> }
];

const AppRoutes = () => useRoutes(routes);

export default AppRoutes;
