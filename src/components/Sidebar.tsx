import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Search, Database, List, User, LogOut, Info, LogIn } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../store';
import RinseLogo from '../assets/RinseLogo';

const navItems = [
  { to: '/', icon: Search, label: 'Search' },
  { to: '/items', icon: Database, label: 'Items' },
  { to: '/lists', icon: List, label: 'Lists' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export function Sidebar() {
  const navigate = useNavigate();
  const { isAuthenticated, clearAuth } = useAuth();

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <motion.aside
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="fixed top-0 left-0 z-50 w-20 h-screen border-r bg-dark-800 border-dark-500 scan-effect"
    >
      <div className="flex flex-col items-center py-8 h-full">
        {/* Logo */}
        <div className="mb-12">
          <RinseLogo />
        </div>

        {/* Navigation */}
        {isAuthenticated ? (
          <nav className="flex flex-col flex-1 gap-6">
            {navItems.map((item, index) => (
              <motion.div
                key={item.to}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `group relative flex items-center justify-center w-12 h-12 transition-all duration-300 ${
                      isActive
                        ? 'text-terminal-green'
                        : 'text-gray-500 hover:text-terminal-green'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute inset-0 border-2 border-terminal-green terminal-box-glow"
                          transition={{
                            type: 'spring',
                            stiffness: 500,
                            damping: 30,
                          }}
                        />
                      )}
                      <item.icon
                        className={`w-5 h-5 relative z-10 transition-transform duration-200 ${
                          isActive ? 'scale-110' : 'group-hover:scale-110'
                        }`}
                      />

                      {/* Tooltip */}
                      <div
                        className="absolute left-full px-3 py-1 ml-4 font-mono text-sm whitespace-nowrap border opacity-0 transition-opacity duration-200 pointer-events-none bg-dark-700 border-terminal-green text-terminal-green group-hover:opacity-100"
                      >
                        {item.label}
                        <div className="absolute left-0 top-1/2 w-1 h-1 rotate-45 -translate-x-1 -translate-y-1/2 bg-terminal-green" />
                      </div>
                    </>
                  )}
                </NavLink>
              </motion.div>
            ))}
          </nav>
        ) : (
          <div className="flex flex-1" />
        )}

        {/* About Button */}
        <div className="mt-auto mb-4">
          <Link
            to="/about"
            className="flex relative justify-center items-center w-12 h-12 text-gray-500 transition-all duration-300 group hover:text-blue-600"
          >
            <Info className="relative z-10 w-5 h-5 transition-transform duration-200 group-hover:scale-110" />

            {/* Tooltip */}
            <div
              className="absolute left-full px-3 py-1 ml-4 font-mono text-sm text-blue-600 whitespace-nowrap border border-blue-600 opacity-0 transition-opacity duration-200 pointer-events-none bg-dark-700 group-hover:opacity-100"
            >
              Logout
              <div className="absolute left-0 top-1/2 w-1 h-1 bg-blue-600 rotate-45 -translate-x-1 -translate-y-1/2" />
            </div>
          </Link>
        </div>
        
        {/* Login/Logout Button */}
        {isAuthenticated ? (
          <div className="mt-auto mb-4">
            <button
              onClick={handleLogout}
              className="flex relative justify-center items-center w-12 h-12 text-gray-500 transition-all duration-300 group hover:text-red-500"
            >
              <LogOut className="relative z-10 w-5 h-5 transition-transform duration-200 group-hover:scale-110" />

              {/* Tooltip */}
              <div
                className="absolute left-full px-3 py-1 ml-4 font-mono text-sm text-red-500 whitespace-nowrap border border-red-500 opacity-0 transition-opacity duration-200 pointer-events-none bg-dark-700 group-hover:opacity-100"
              >
                Logout
                <div className="absolute left-0 top-1/2 w-1 h-1 bg-red-500 rotate-45 -translate-x-1 -translate-y-1/2" />
              </div>
            </button>
          </div>
        ) : (
          <div className="mt-auto mb-4">
            <Link
              to="/login"
              className="flex relative justify-center items-center w-12 h-12 text-gray-500 transition-all duration-300 group hover:text-terminal-green"
            >
              <LogIn className="relative z-10 w-5 h-5 transition-transform duration-200 group-hover:scale-110" />

              {/* Tooltip */}
              <div
                className="absolute left-full px-3 py-1 ml-4 font-mono text-sm whitespace-nowrap border opacity-0 transition-opacity duration-200 pointer-events-none text-terminal-green border-terminal-green bg-dark-700 group-hover:opacity-100"
              >
                Login
                <div className="absolute left-0 top-1/2 w-1 h-1 rotate-45 -translate-x-1 -translate-y-1/2 bg-terminal-green" />
              </div>
            </Link>
          </div>
        )}
      </div>

      {/* Scanline effect */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="w-full h-full grid-pattern" />
      </div>
    </motion.aside>
  );
}
