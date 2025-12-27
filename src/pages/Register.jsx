import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Target, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    const result = await register(name, email, password);
    setIsLoading(false);

    if (result.success) {
      toast.success('Welcome to Intertia!');
      navigate('/dashboard');
    } else {
      toast.error(result.error || 'Registration failed');
    }
  };

  const handleGoogleSignup = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-[#09090B] flex">
      {/* Left Side - Image */}
      <div className="hidden lg:block lg:flex-1 relative">
        <img
          src="https://images.unsplash.com/photo-1758506971661-33fe941ca1e2?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200"
          alt="Runner"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-[#09090B] via-transparent to-transparent" />
        <div className="absolute bottom-12 left-12 right-12">
          <div className="glass rounded-2xl p-6">
            <h3 className="font-unbounded text-2xl font-bold text-white mb-2">Join the Territory Race</h3>
            <p className="text-zinc-400">10,000+ runners already claiming their domains. Your turn.</p>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Link to="/" className="flex items-center gap-2 mb-12" data-testid="logo-link">
            <div className="w-10 h-10 rounded-full bg-[#CCF381] flex items-center justify-center">
              <Target className="w-6 h-6 text-black" />
            </div>
            <span className="font-unbounded font-bold text-xl text-white">Intertia</span>
          </Link>

          <h1 className="font-unbounded text-3xl font-bold text-white mb-2">Create account</h1>
          <p className="text-zinc-400 mb-8">Start your territory conquest today</p>

          {/* Google Signup */}
          <Button
            onClick={handleGoogleSignup}
            variant="outline"
            className="w-full mb-6 h-12 border-white/20 bg-transparent text-white hover:bg-white/10 font-medium rounded-xl"
            data-testid="google-signup-btn"
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign up with Google
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#09090B] text-zinc-500">or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="name" className="text-zinc-300 mb-2 block">Name</Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="pl-12 h-12 bg-zinc-900/80 border-white/10 focus:border-[#CCF381] focus:ring-1 focus:ring-[#CCF381] rounded-xl text-white placeholder:text-zinc-600"
                  data-testid="name-input"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email" className="text-zinc-300 mb-2 block">Email</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-12 h-12 bg-zinc-900/80 border-white/10 focus:border-[#CCF381] focus:ring-1 focus:ring-[#CCF381] rounded-xl text-white placeholder:text-zinc-600"
                  data-testid="email-input"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="text-zinc-300 mb-2 block">Password</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="pl-12 pr-12 h-12 bg-zinc-900/80 border-white/10 focus:border-[#CCF381] focus:ring-1 focus:ring-[#CCF381] rounded-xl text-white placeholder:text-zinc-600"
                  data-testid="password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-[#CCF381] text-black hover:bg-[#B8E065] font-bold rounded-xl transition-all duration-300 hover:shadow-[0_0_20px_rgba(204,243,129,0.4)]"
              data-testid="register-submit-btn"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-zinc-500">
            Already have an account?{' '}
            <Link to="/login" className="text-[#CCF381] hover:underline" data-testid="login-link">
              Log in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
