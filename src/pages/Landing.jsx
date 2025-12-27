import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Map, Trophy, Users, Zap, ArrowRight, Play, Target, Timer, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Landing() {
  const navigate = useNavigate();
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const features = [
    {
      icon: Map,
      title: 'Capture Territory',
      description: 'Run loops to claim real-world map areas. Close your path to convert territory into your domain.',
    },
    {
      icon: Trophy,
      title: 'Compete Globally',
      description: 'Climb leaderboards by area captured, distance run, and streaks. Seasonal tournaments with prizes.',
    },
    {
      icon: Users,
      title: 'Team Up',
      description: 'Create group runs with friends. Cooperate to capture massive territories together.',
    },
    {
      icon: Zap,
      title: 'Power-Ups & Badges',
      description: 'Earn badges, unlock achievements, and use power-ups to multiply your captures.',
    },
  ];

  const stats = [
    { value: '10K+', label: 'Active Runners' },
    { value: '50M+', label: 'Sq Meters Claimed' },
    { value: '100+', label: 'Countries' },
    { value: '1M+', label: 'Runs Completed' },
  ];

  return (
    <div className="min-h-screen bg-[#09090B] text-white overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2" data-testid="logo-link">
              <div className="w-10 h-10 rounded-full bg-[#CCF381] flex items-center justify-center">
                <Target className="w-6 h-6 text-black" />
              </div>
              <span className="font-unbounded font-bold text-xl tracking-tight">Intertia</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/login" data-testid="login-nav-btn">
                <Button variant="ghost" className="text-white hover:text-[#CCF381]">
                  Log In
                </Button>
              </Link>
              <Link to="/register" data-testid="signup-nav-btn">
                <Button className="bg-[#CCF381] text-black hover:bg-[#B8E065] font-semibold rounded-full px-6">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        {/* Background gradient */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#7000FF] rounded-full filter blur-[150px] opacity-20" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#CCF381] rounded-full filter blur-[150px] opacity-10" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="font-unbounded text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                Run.
                <span className="text-[#CCF381]"> Capture.</span>
                <br />
                Dominate.
              </h1>
              <p className="text-lg text-zinc-400 mb-8 max-w-lg">
                Turn your runs into territory conquests. Close loops on real maps to claim areas, compete with runners worldwide, and build your empire one step at a time.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={() => navigate('/register')}
                  className="bg-[#CCF381] text-black hover:bg-[#B8E065] font-bold text-lg rounded-full px-8 py-6 transition-all duration-300 hover:shadow-[0_0_30px_rgba(204,243,129,0.4)]"
                  data-testid="hero-cta-btn"
                >
                  Start Running Free
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsVideoPlaying(true)}
                  className="border-white/20 bg-transparent text-white hover:bg-white/10 font-semibold text-lg rounded-full px-8 py-6"
                  data-testid="watch-demo-btn"
                >
                  <Play className="mr-2 w-5 h-5" />
                  Watch Demo
                </Button>
              </div>
            </motion.div>

            {/* Hero Image/Map Preview */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1639060015191-9d83063eab2a?crop=entropy&cs=srgb&fm=jpg&q=85&w=800"
                  alt="Territory Map"
                  className="w-full aspect-[4/3] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-transparent to-transparent" />
                
                {/* Floating HUD Preview */}
                <div className="absolute bottom-4 left-4 right-4 glass rounded-full p-4 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-xs text-zinc-500">DISTANCE</p>
                      <p className="font-mono text-lg font-bold text-[#CCF381]">5.2 km</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-zinc-500">AREA</p>
                      <p className="font-mono text-lg font-bold text-[#7000FF]">1,240 m²</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-zinc-500">PACE</p>
                      <p className="font-mono text-lg font-bold">5:42</p>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-[#FF003C] flex items-center justify-center animate-pulse-glow">
                    <Target className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <p className="font-unbounded text-3xl sm:text-4xl font-bold text-[#CCF381]">{stat.value}</p>
                <p className="text-zinc-500 mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-unbounded text-3xl sm:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              Simple mechanics, endless competition. Run anywhere in the world and claim your territory.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="card-glass p-6 group hover:-translate-y-1 transition-transform duration-300"
                data-testid={`feature-card-${index}`}
              >
                <div className="w-12 h-12 rounded-xl bg-[#CCF381]/10 flex items-center justify-center mb-4 group-hover:bg-[#CCF381]/20 transition-colors duration-300">
                  <feature.icon className="w-6 h-6 text-[#CCF381]" />
                </div>
                <h3 className="font-unbounded font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Game Mechanics Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-zinc-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <h2 className="font-unbounded text-3xl sm:text-4xl font-bold mb-6">
                Paper.io Meets
                <span className="text-[#7000FF]"> Real Running</span>
              </h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#CCF381] flex items-center justify-center text-black font-bold">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Start Your Run</h3>
                    <p className="text-zinc-400">Hit start and begin running. Your GPS traces your path in real-time on the map.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#CCF381] flex items-center justify-center text-black font-bold">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Close Your Loop</h3>
                    <p className="text-zinc-400">Run back to your starting point or any point on your trail to close a loop.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#CCF381] flex items-center justify-center text-black font-bold">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Claim Territory</h3>
                    <p className="text-zinc-400">The enclosed area becomes yours! Compete with others for the same territory.</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="relative"
            >
              <img
                src="https://images.unsplash.com/photo-1758506971661-33fe941ca1e2?crop=entropy&cs=srgb&fm=jpg&q=85&w=600"
                alt="Runner in action"
                className="rounded-2xl shadow-2xl w-full"
              />
              {/* Floating stats */}
              <div className="absolute -bottom-6 -left-6 glass rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Timer className="w-8 h-8 text-[#CCF381]" />
                  <div>
                    <p className="text-xs text-zinc-500">This Month</p>
                    <p className="font-unbounded font-bold text-xl">42 Runs</p>
                  </div>
                </div>
              </div>
              <div className="absolute -top-6 -right-6 glass rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-8 h-8 text-[#7000FF]" />
                  <div>
                    <p className="text-xs text-zinc-500">Territory</p>
                    <p className="font-unbounded font-bold text-xl">12.4 km²</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="font-unbounded text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
              Ready to Claim Your
              <span className="text-[#CCF381]"> Territory?</span>
            </h2>
            <p className="text-zinc-400 text-lg mb-8 max-w-2xl mx-auto">
              Join thousands of runners worldwide. Start capturing territory today and climb the global leaderboards.
            </p>
            <Button
              onClick={() => navigate('/register')}
              className="bg-[#CCF381] text-black hover:bg-[#B8E065] font-bold text-lg rounded-full px-10 py-6 transition-all duration-300 hover:shadow-[0_0_30px_rgba(204,243,129,0.4)]"
              data-testid="footer-cta-btn"
            >
              Start Running Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#CCF381] flex items-center justify-center">
                <Target className="w-4 h-4 text-black" />
              </div>
              <span className="font-unbounded font-bold">Intertia</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-zinc-500">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Support</a>
            </div>
            <p className="text-sm text-zinc-600">© 2025 Intertia. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
