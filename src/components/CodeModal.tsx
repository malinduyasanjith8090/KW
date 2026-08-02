import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Unlock } from 'lucide-react';
import { Album } from '../types';

interface CodeModalProps {
  album: Album | null;
  isOpen: boolean;
  onClose: () => void;
  onUnlock: (albumId: string) => void;
}

export function CodeModal({ album, isOpen, onClose, onUnlock }: CodeModalProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (album && code.trim().toLowerCase() === album.code.toLowerCase()) {
      setError(false);
      onUnlock(album.id);
      setCode('');
      onClose();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  if (!album) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md overflow-hidden"
          >
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="text-center mb-8 mt-4">
              <div className="bg-rose-50 w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 border border-rose-100">
                <Unlock className="w-8 h-8 text-rose-500" />
              </div>
              <h2 className="text-2xl font-serif font-bold text-gray-900 mb-2">
                Unlock {album.title}
              </h2>
              <p className="text-gray-500 text-sm">
                Enter the secret code to access this {album.category.toLowerCase()} album.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter access code..."
                  className={`w-full px-6 py-4 rounded-xl text-center text-lg font-medium outline-none border-2 transition-colors bg-gray-50 ${
                    error 
                      ? 'border-red-400 focus:border-red-500 text-red-600 bg-red-50' 
                      : 'border-transparent focus:border-rose-400 focus:bg-white'
                  }`}
                  autoFocus
                />
                <AnimatePresence>
                  {error && (
                    <motion.p 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-red-500 text-sm text-center mt-2 font-medium"
                    >
                      Incorrect code, please try again.
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
              
              <button
                type="submit"
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-4 rounded-xl transition-colors shadow-lg shadow-rose-600/30 flex justify-center items-center gap-2 text-lg"
              >
                <Unlock className="w-5 h-5" />
                Unlock Gallery
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
