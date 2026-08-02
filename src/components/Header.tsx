import { motion } from 'motion/react';
import { Heart } from 'lucide-react';

interface HeaderProps {
  donationEmail?: string;
}

export function Header({ donationEmail = "yasanjithmalindu@gmail.com" }: HeaderProps) {
  return (
    <header className="w-full py-6 px-4 md:px-8 bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-rose-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col items-center md:items-start"
      >
        <h1 className="text-3xl md:text-4xl font-serif text-rose-900 tracking-wide">
          Kawshi Sasandi
        </h1>
        <p className="text-sm text-rose-500 font-light tracking-widest uppercase mt-1">
          Exclusive Gallery
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center"
      >
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-2 rounded-full flex items-center gap-2 shadow-sm">
          <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
          <span className="text-sm font-medium">Donate to me with PayPal:</span>
          <a 
            href={`mailto:${donationEmail}`} 
            className="text-sm font-bold hover:text-rose-600 transition-colors underline decoration-rose-300 underline-offset-2"
          >
            {donationEmail}
          </a>
        </div>
      </motion.div>
    </header>
  );
}
