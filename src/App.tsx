import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Toaster } from 'react-hot-toast';
import { Header } from './components/Header';
import { AlbumCard } from './components/AlbumCard';
import { CodeModal } from './components/CodeModal';
import { AlbumView } from './components/AlbumView';
import { Lightbox } from './components/Lightbox';
import { Admin } from './Admin';
import { Album, Photo, Settings } from './types';

function Gallery() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [settings, setSettings] = useState<Settings>({ donationEmail: '' });
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [unlockedAlbums, setUnlockedAlbums] = useState<Set<string>>(new Set());
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [viewingAlbum, setViewingAlbum] = useState<Album | null>(null);
  const [viewingPhoto, setViewingPhoto] = useState<Photo | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  useEffect(() => {
    fetch('/api/data')
      .then(async res => {
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Received non-JSON response from server. The server might be restarting or there is a routing error.");
        }
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Network response was not ok');
        }
        return res.json();
      })
      .then(data => {
        setAlbums(data.albums || []);
        setSettings(data.settings || { donationEmail: '' });
        setCategories(data.categories || ['Spicy', 'Spicy Unlimited']);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch data:", err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleAlbumClick = (album: Album) => {
    if (unlockedAlbums.has(album.id)) {
      setViewingAlbum(album);
    } else {
      setSelectedAlbum(album);
      setIsCodeModalOpen(true);
    }
  };

  const handleUnlock = (albumId: string) => {
    setUnlockedAlbums(prev => new Set(prev).add(albumId));
    if (selectedAlbum && selectedAlbum.id === albumId) {
      setViewingAlbum(selectedAlbum);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-rose-500">Loading...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#faf8f7] p-8 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-red-100 max-w-md w-full">
          <h2 className="text-xl font-bold text-red-600 mb-2">Database Connection Error</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          <div className="bg-red-50 text-red-800 text-sm p-4 rounded-lg text-left">
            <p className="font-semibold mb-1">How to fix:</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Open the AI Studio <strong>Settings</strong> panel</li>
              <li>Add a new Secret named <code className="bg-white px-1 rounded">MONGO_URI</code></li>
              <li>Set its value to your MongoDB connection string</li>
              <li>Restart the dev server</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  const filteredCategories = activeCategory === 'All' ? categories : [activeCategory];

  return (
    <div className="min-h-screen bg-[#faf8f7] text-gray-900 font-sans overflow-x-hidden">
      <Header donationEmail={settings.donationEmail} />

      <main className="w-full">
        <AnimatePresence mode="wait">
          {!viewingAlbum ? (
            <motion.div
              key="gallery"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              className="max-w-7xl mx-auto px-4 md:px-8 py-12"
            >
              <div className="text-center mb-16 relative">
                <h2 className="text-4xl md:text-5xl font-serif text-rose-900 mb-4 tracking-tight">
                  Exclusive Collections
                </h2>
                <p className="text-gray-500 max-w-2xl mx-auto font-light text-lg">
                  Explore my private galleries. Select an album and enter your access code to view the full collection.
                </p>
                <div className="absolute right-0 top-0">
                  <Link to="/admin" className="text-xs text-gray-400 hover:text-gray-600"></Link>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-3 md:gap-4 mb-12">
                {['All', ...categories].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveCategory(tab)}
                    className={`px-5 md:px-8 py-2 md:py-2.5 rounded-full text-sm md:text-base font-medium transition-all ${
                      activeCategory === tab
                        ? 'bg-rose-600 text-white shadow-md'
                        : 'bg-white text-gray-600 hover:bg-rose-50 border border-gray-200'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {albums.length === 0 && (
                <div className="text-center py-20 text-gray-500">
                  <p className="text-xl font-light">No galleries available at the moment.</p>
                  <p className="text-sm mt-2">Please check back later.</p>
                </div>
              )}

              {filteredCategories.map(cat => {
                const catAlbums = albums.filter(a => a.category === cat);
                if (catAlbums.length === 0) return null;
                return (
                  <div key={cat} className="mb-16">
                    <h3 className="text-2xl md:text-3xl font-serif text-rose-800 mb-6 border-b border-rose-200 pb-3">{cat} Category</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                      {catAlbums.map((album, index) => (
                        <motion.div
                          key={album.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <AlbumCard 
                            album={album} 
                            onClick={handleAlbumClick}
                            isUnlocked={unlockedAlbums.has(album.id)}
                          />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div key="album-view" className="w-full">
              <AlbumView 
                album={viewingAlbum} 
                onBack={() => setViewingAlbum(null)}
                onPhotoClick={setViewingPhoto}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <CodeModal
        album={selectedAlbum}
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        onUnlock={handleUnlock}
      />

      <Lightbox 
        photo={viewingPhoto}
        onClose={() => setViewingPhoto(null)}
      />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Gallery />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  );
}
