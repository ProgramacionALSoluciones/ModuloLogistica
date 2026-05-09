import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.svg';

const MainLayout = () => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/', roles: ['ADMIN', 'CLIENTE_DIRECTO', 'CLIENTE_FINAL'] },
    { name: 'Entregas', href: '/entregas', roles: ['ADMIN'] },
    { name: 'Transporte', href: '/transporte', roles: ['ADMIN', 'CLIENTE_DIRECTO'] },
    { name: 'Liberaciones', href: '/liberaciones', roles: ['ADMIN', 'CLIENTE_DIRECTO', 'CLIENTE_FINAL'] },
    { name: 'Mi Historial', href: '/perfil', roles: ['ADMIN', 'CLIENTE_DIRECTO', 'CLIENTE_FINAL'] },
    { name: 'Recepción', href: '/recepcion', roles: ['ADMIN'] },
    { name: 'Facturación', href: '/facturacion', roles: ['ADMIN'] },
    { name: 'Gestión', href: '/gestion', roles: ['ADMIN'] },
  ];

  // Filter navigation by role
  const filteredNav = navigation.filter(item => user && item.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-brand-navy border-b border-black shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <img src={logo} alt="Logo" className="h-8 w-8 mr-2" />
                <span className="text-white font-bold text-xl tracking-wider">AL Soluciones</span>
              </div>
              <div className="hidden sm:-my-px sm:ml-6 sm:flex sm:space-x-8">
                {filteredNav.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`${isActive
                        ? 'border-primary-500 text-white'
                        : 'border-transparent text-gray-300 hover:text-white hover:border-primary-500'
                        } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200`}
                    >
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* User Info & Logout */}
            <div className="flex items-center space-x-4">
              {user && (
                <div className="text-sm text-gray-300 text-right hidden sm:block">
                  <p className="font-semibold text-white">{user.entityName}</p>
                  <p className="text-xs text-primary-400 font-bold">{user.role}</p>
                </div>
              )}
              <button
                onClick={logout}
                className="inline-flex items-center px-4 py-2 border border-transparent text-xs font-bold rounded text-black bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[500px]">
          <Outlet />
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 py-4 text-center text-sm text-gray-500">
        &copy; {new Date().getFullYear()} AL Soluciones. Todos los derechos reservados.
      </footer>
    </div>
  );
};

export default MainLayout;
