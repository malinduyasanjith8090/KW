import { motion } from 'motion/react';
import { ArrowLeft, PlayCircle } from 'lucide-react';
import { Album, Photo } from '../types';

interface AlbumViewProps {
  album: Album;
  onBack: () => void;
  onPhotoClick: (photo: Photo) => void;
}

export function AlbumView({ album, onBack, onPhotoClick }: AlbumViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8"
    >
      <div className="flex items-center gap-4 mb-10">
        <button 
          onClick={onBack}
          className="bg-white text-gray-700 hover:text-rose-600 hover:bg-rose-50 p-3 rounded-full shadow-sm transition-all border border-gray-100"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-gray-900 leading-tight">
            {album.title}
          </h2>
          <div className="flex items-center gap-3 mt-2">
            <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-sm ${
              album.category === 'Spicy' ? 'bg-orange-100 text-orange-600' : 'bg-rose-100 text-rose-600'
            }`}>
              {album.category}
            </span>
            <span className="text-gray-500 font-medium">{album.photos?.length || 0} Media</span>
          </div>
        </div>
      </div>

      <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
        {(album.photos || []).map((photo, index) => (
          <motion.div
            key={photo.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="break-inside-avoid cursor-pointer group relative rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow"
            onClick={() => onPhotoClick(photo)}
          >
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors z-10" />
            {photo.type === 'video' ? (
              <>
                <video 
                  src={photo.url || undefined} 
                  className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
                  muted
                  loop
                  onMouseEnter={(e) => e.currentTarget.play()}
                  onMouseLeave={(e) => e.currentTarget.pause()}
                />
                <div className="absolute inset-0 z-20 flex items-center justify-center">
                  <PlayCircle className="w-12 h-12 text-white/70 group-hover:text-white transition-colors" />
                </div>
              </>
            ) : (
              <img 
                src={photo.url || undefined} 
                alt={`${album.title} ${index + 1}`} 
                className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
