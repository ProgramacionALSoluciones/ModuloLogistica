import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  HomeIcon, 
  TruckIcon, 
  ArrowPathIcon, 
  ArrowsRightLeftIcon, 
  InboxArrowDownIcon, 
  ClipboardDocumentCheckIcon,
  DocumentChartBarIcon,
  UsersIcon,
  UserCircleIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowLeftOnRectangleIcon,
  SunIcon,
  MoonIcon
} from '@heroicons/react/24/outline';
import { useTheme } from '../context/ThemeContext';

const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();

  const navigation = [
    { 
      title: 'General',
      items: [
        { name: 'Dashboard', href: '/', icon: HomeIcon, roles: ['ADMIN', 'CLIENTE_DIRECTO', 'CLIENTE_FINAL'] },
      ]
    },
    { 
      title: 'Operaciones',
      items: [
        { name: 'Entregas', href: '/entregas', icon: ClipboardDocumentCheckIcon, roles: ['ADMIN'] },
        { name: 'Transporte', href: '/transporte', icon: TruckIcon, roles: ['ADMIN', 'CLIENTE_DIRECTO'] },
        { name: 'Devoluciones', href: '/devoluciones', icon: ArrowPathIcon, roles: ['ADMIN', 'CLIENTE_DIRECTO', 'CLIENTE_FINAL'] },
        { name: 'Transferencias', href: '/transferencias', icon: ArrowsRightLeftIcon, roles: ['ADMIN', 'CLIENTE_DIRECTO'] },
        { name: 'Recepción', href: '/recepcion', icon: InboxArrowDownIcon, roles: ['ADMIN'] },
      ]
    },
    { 
      title: 'Administración',
      items: [
        { name: 'Facturación', href: '/facturacion', icon: DocumentChartBarIcon, roles: ['ADMIN'] },
        { name: 'Gestión', href: '/gestion', icon: UsersIcon, roles: ['ADMIN'] },
      ]
    },
    { 
      title: 'Usuario',
      items: [
        { name: 'Mi Historial', href: '/perfil', icon: UserCircleIcon, roles: ['ADMIN', 'CLIENTE_DIRECTO', 'CLIENTE_FINAL'] },
      ]
    }
  ];

  const filterNav = (groups) => {
    return groups.map(group => ({
      ...group,
      items: group.items.filter(item => user && item.roles.includes(user.role))
    })).filter(group => group.items.length > 0);
  };

  const filteredGroups = filterNav(navigation);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-950 flex transition-colors duration-300">
      {/* Sidebar para Escritorio */}
      <aside className={`bg-slate-900 text-white transition-all duration-300 ease-in-out z-30 fixed h-full lg:static ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
            {isSidebarOpen && <span className="font-bold text-xl tracking-tight text-primary-400">AL Soluciones</span>}
            {!isSidebarOpen && <span className="font-bold text-xl text-primary-400">AL</span>}
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:block hidden text-slate-400 hover:text-white">
              <Bars3Icon className="h-6 w-6" />
            </button>
          </div>

          {/* Theme Toggle */}
          <div className="px-6 py-4 border-b border-slate-800">
            <button 
              onClick={toggleTheme}
              className="flex items-center justify-between w-full text-slate-400 hover:text-white transition-colors"
            >
              {isSidebarOpen && <span className="text-xs font-semibold uppercase tracking-wider">Tema</span>}
              {isDarkMode ? <SunIcon className="h-6 w-6 text-primary-400" /> : <MoonIcon className="h-6 w-6 text-slate-400" />}
            </button>
          </div>

          {/* Menú */}
          <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-8 scrollbar-hide">
            {filteredGroups.map((group, idx) => (
              <div key={idx} className="space-y-1">
                {isSidebarOpen && <h3 className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{group.title}</h3>}
                {group.items.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                        isActive 
                        ? 'bg-primary-500 text-slate-900 font-bold shadow-lg shadow-primary-500/20' 
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                      title={!isSidebarOpen ? item.name : ''}
                    >
                      <item.icon className={`h-6 w-6 flex-shrink-0 ${isActive ? 'text-slate-900' : 'group-hover:text-primary-400'}`} />
                      {isSidebarOpen && <span className="ml-3 text-sm truncate">{item.name}</span>}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* User & Logout Section */}
          <div className="p-4 border-t border-slate-800 bg-slate-900/50">
            {isSidebarOpen && (
              <div className="mb-4 px-2">
                <p className="text-sm font-bold truncate text-slate-200">{user?.entityName || user?.nombre}</p>
                <p className="text-[10px] uppercase font-bold text-primary-500 tracking-widest">{user?.role}</p>
              </div>
            )}
            <button 
              onClick={logout}
              className={`flex items-center w-full px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors ${!isSidebarOpen ? 'justify-center' : ''}`}
            >
              <ArrowLeftOnRectangleIcon className="h-6 w-6" />
              {isSidebarOpen && <span className="ml-3 text-sm font-medium">Cerrar Sesión</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Contenido Principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Móvil */}
        <header className="lg:hidden h-16 bg-slate-900 flex items-center justify-between px-6 shadow-md fixed w-full top-0 z-40">
           <span className="font-bold text-xl text-primary-400">AL Soluciones</span>
           <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-white">
             <Bars3Icon className="h-8 w-8" />
           </button>
        </header>

        <main className={`flex-1 p-4 lg:p-8 ${isSidebarOpen ? 'lg:ml-0' : ''} mt-16 lg:mt-0 overflow-y-auto`}>
          <div className="max-w-7xl mx-auto">
             <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200 dark:shadow-none border border-slate-200 dark:border-slate-800 p-6 lg:p-8 min-h-[calc(100vh-100px)] transition-colors duration-300">
                <Outlet />
             </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
