import { motion } from 'motion/react';
import { Lock } from 'lucide-react';
import { Album } from '../types';

interface AlbumCardProps {
  album: Album;
  onClick: (album: Album) => void;
  isUnlocked: boolean;
}

export function AlbumCard({ album, onClick, isUnlocked }: AlbumCardProps) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.98 }}
      className="group relative rounded-2xl overflow-hidden cursor-pointer shadow-md hover:shadow-xl transition-all duration-300 bg-white aspect-[4/5]"
      onClick={() => onClick(album)}
    >
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-80" />
      
      {album.coverImage ? (
        <motion.img 
          src={album.coverImage} 
          alt={album.title}
          className={`w-full h-full object-cover transition-all duration-700 ${!isUnlocked ? 'blur-md scale-110 group-hover:blur-sm' : 'group-hover:scale-105'}`}
        />
      ) : (
        <div className={`w-full h-full bg-gray-200 transition-all duration-700 ${!isUnlocked ? 'blur-md scale-110 group-hover:blur-sm' : 'group-hover:scale-105'}`} />
      )}

      {!isUnlocked && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-white/90">
          <div className="bg-white/20 p-4 rounded-full backdrop-blur-md mb-4 shadow-lg border border-white/30">
            <Lock className="w-8 h-8" />
          </div>
          <span className="text-sm font-medium tracking-widest uppercase bg-black/40 px-3 py-1 rounded-full backdrop-blur-md">
            Locked
          </span>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-6 z-20 text-white">
        <div className="flex justify-between items-end">
          <div>
            <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-sm mb-2 inline-block ${
              album.category === 'Spicy' ? 'bg-orange-500/80 text-white' : 'bg-rose-600/80 text-white'
            }`}>
              {album.category}
            </span>
            <h3 className="text-2xl font-serif font-medium leading-tight">{album.title}</h3>
          </div>
          <div className="bg-white/20 backdrop-blur-md border border-white/40 px-3 py-1.5 rounded-lg text-lg font-bold">
            ${album.price}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
