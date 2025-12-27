import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Target, Play, LogOut, Settings, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/authStore';

export const NavBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/leaderboards', label: 'Leaderboards' },
    { path: '/groups', label: 'Groups' },
    { path: '/seasons', label: 'Seasons' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/dashboard" className="flex items-center gap-2" data-testid="logo-link">
            <div className="w-10 h-10 rounded-full bg-[#CCF381] flex items-center justify-center">
              <Target className="w-6 h-6 text-black" />
            </div>
            <span className="font-unbounded font-bold text-xl text-white">Intertia</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`font-medium transition-colors ${
                  isActive(link.path)
                    ? 'text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
                data-testid={`nav-${link.label.toLowerCase()}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/run')}
              className="bg-[#CCF381] text-black hover:bg-[#B8E065] font-bold rounded-full px-6"
              data-testid="nav-start-run-btn"
            >
              <Play className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Start Run</span>
            </Button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-white"
              data-testid="mobile-menu-btn"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="hidden md:flex items-center gap-2" data-testid="user-menu-trigger">
                  <Avatar className="w-9 h-9 border-2 border-white/10">
                    <AvatarImage src={user?.picture} />
                    <AvatarFallback className="bg-zinc-800 text-white">
                      {user?.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-zinc-900 border-white/10">
                <div className="px-3 py-2">
                  <p className="text-sm font-medium text-white">{user?.name}</p>
                  <p className="text-xs text-zinc-500">{user?.email}</p>
                </div>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  onClick={() => navigate('/profile')}
                  className="text-zinc-300 focus:bg-white/10 focus:text-white cursor-pointer"
                  data-testid="menu-profile"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-400 focus:bg-red-500/10 focus:text-red-400 cursor-pointer"
                  data-testid="menu-logout"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/10">
            <div className="space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-2 rounded-lg transition-colors ${
                    isActive(link.path)
                      ? 'bg-white/10 text-white'
                      : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="px-4 pt-2 border-t border-white/10 mt-2">
                <div className="flex items-center gap-3 py-2">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={user?.picture} />
                    <AvatarFallback className="bg-zinc-800 text-white">
                      {user?.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-white">{user?.name}</p>
                    <p className="text-xs text-zinc-500">{user?.email}</p>
                  </div>
                </div>
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-2 text-zinc-400 hover:text-white"
                >
                  Profile
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="block w-full text-left px-4 py-2 text-red-400 hover:text-red-300"
                >
                  Log out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default NavBar;
