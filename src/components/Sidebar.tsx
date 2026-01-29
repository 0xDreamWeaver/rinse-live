import { NavLink, useNavigate } from 'react-router-dom';
import { Search, Database, List, User, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../store';

const navItems = [
  { to: '/', icon: Search, label: 'Search' },
  { to: '/items', icon: Database, label: 'Items' },
  { to: '/lists', icon: List, label: 'Lists' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export function Sidebar() {
  const navigate = useNavigate();
  const { clearAuth } = useAuth();

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <motion.aside
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="fixed left-0 top-0 h-screen w-20 bg-dark-800 border-r border-dark-500 scan-effect z-50"
    >
      <div className="flex flex-col items-center py-8 h-full">
        {/* Logo */}
        <div className="mb-12">
          <div className="w-12 h-12 border-2 border-terminal-green relative terminal-box-glow">
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-mono text-terminal-green font-bold text-xl terminal-glow">
                R
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col gap-6">
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
                      className="absolute left-full ml-4 px-3 py-1 bg-dark-700 border border-terminal-green
                                    text-terminal-green text-sm font-mono whitespace-nowrap opacity-0
                                    group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                    >
                      {item.label}
                      <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-1 h-1 bg-terminal-green rotate-45" />
                    </div>
                  </>
                )}
              </NavLink>
            </motion.div>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="mt-auto mb-4">
          <button
            onClick={handleLogout}
            className="group relative flex items-center justify-center w-12 h-12 text-gray-500 hover:text-red-500 transition-all duration-300"
          >
            <LogOut className="w-5 h-5 relative z-10 transition-transform duration-200 group-hover:scale-110" />

            {/* Tooltip */}
            <div
              className="absolute left-full ml-4 px-3 py-1 bg-dark-700 border border-red-500
                            text-red-500 text-sm font-mono whitespace-nowrap opacity-0
                            group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
            >
              Logout
              <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-1 h-1 bg-red-500 rotate-45" />
            </div>
          </button>
        </div>

        {/* Status Indicator */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-2 h-2 bg-terminal-green rounded-full animate-pulse" />
          <div className="text-[8px] font-mono text-terminal-green opacity-50">
            ONLINE
          </div>
        </div>
      </div>

      {/* Scanline effect */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div className="grid-pattern w-full h-full" />
      </div>
    </motion.aside>
  );
}
