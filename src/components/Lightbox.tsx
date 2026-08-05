import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { Photo } from '../types';

interface LightboxProps {
  photo: Photo | null;
  onClose: () => void;
}

export function Lightbox({ photo, onClose }: LightboxProps) {
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'PrintScreen') {
        navigator.clipboard.writeText('');
        setIsHidden(true);
        setTimeout(() => setIsHidden(false), 2000);
      }
      if (e.metaKey && e.shiftKey) {
        setIsHidden(true);
        setTimeout(() => setIsHidden(false), 2000);
      }
    };

    const handleBlur = () => setIsHidden(true);
    const handleFocus = () => setIsHidden(false);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [onClose]);

  return (
    <AnimatePresence>
      {photo && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-12"
          onContextMenu={(e) => e.preventDefault()}
        >
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/95 backdrop-blur-xl"
            onClick={onClose}
          />
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 z-[70] text-white/50 hover:text-white bg-black/50 hover:bg-black/80 rounded-full p-3 transition-colors border border-white/10"
          >
            <X className="w-8 h-8" />
          </button>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={`relative z-[60] max-w-full max-h-full flex items-center justify-center transition-opacity duration-200 ${isHidden ? 'opacity-0' : 'opacity-100'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {photo.type === 'video' ? (
              <video 
                src={photo.url || undefined} 
                controls
                autoPlay
                controlsList="nodownload"
                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl pointer-events-none"
              />
            ) : (
              <img 
                src={photo.url || undefined} 
                alt="Full screen" 
                draggable={false}
                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl pointer-events-none select-none"
                style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
              />
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
