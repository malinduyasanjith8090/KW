import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Plus, Trash2, Edit2, Upload, Lock, Settings as SettingsIcon, Image as ImageIcon, Edit3, Loader2 } from 'lucide-react';
import { Album, Photo, Settings } from './types';
import toast from 'react-hot-toast';

export function Admin() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  
  const [albums, setAlbums] = useState<Album[]>([]);
  const [settings, setSettings] = useState<Settings>({ donationEmail: '' });
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Editing state
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/data');
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Received non-JSON response from server. The server might be restarting or there is a routing error.");
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Network response was not ok');
      }
      const data = await res.json();
      setAlbums(data.albums || []);
      setSettings(data.settings || { donationEmail: '' });
      setCategories(data.categories || []);
    } catch (err: any) {
      console.error("Failed to fetch data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin') {
      setIsLoggedIn(true);
    } else {
      alert('Incorrect password. Default is "admin".');
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings, categories })
      });
      toast.success('Settings updated successfully!');
    } catch (err) {
      toast.error('Failed to update settings');
    }
  };

  const handleAddCategory = () => {
    const name = prompt('New category name:');
    if (name && !categories.includes(name)) {
      setCategories([...categories, name]);
    }
  };

  const handleEditCategory = (oldName: string) => {
    const newName = prompt('Enter new category name:', oldName);
    if (newName && newName !== oldName && !categories.includes(newName)) {
      const newCategories = categories.map(c => c === oldName ? newName : c);
      setCategories(newCategories);
    }
  };

  const handleRemoveCategory = (cat: string) => {
    if (confirm(`Are you sure you want to remove "${cat}"?`)) {
      setCategories(categories.filter(c => c !== cat));
    }
  };

  const handleAddAlbum = async () => {
    try {
      const res = await fetch('/api/albums', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      const newAlbum = await res.json();
      setAlbums([...albums, newAlbum]);
      setEditingAlbum(newAlbum);
      toast.success('Album created successfully!');
    } catch (err) {
      toast.error('Failed to create album');
    }
  };

  const handleUpdateAlbum = async (id: string, updates: Partial<Album>) => {
    try {
      const res = await fetch(`/api/albums/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const updated = await res.json();
      setAlbums(albums.map(a => a.id === id ? updated : a));
      if (editingAlbum?.id === id) setEditingAlbum(updated);
      toast.success('Album updated successfully!');
    } catch (err) {
      toast.error('Failed to update album');
    }
  };

  const handleDeleteAlbum = async (id: string) => {
    if (confirm('Are you sure you want to delete this album?')) {
      try {
        await fetch(`/api/albums/${id}`, { method: 'DELETE' });
        setAlbums(albums.filter(a => a.id !== id));
        if (editingAlbum?.id === id) setEditingAlbum(null);
        toast.success('Album deleted successfully!');
      } catch (err) {
        toast.error('Failed to delete album');
      }
    }
  };

  const handleUploadCover = async (id: string, file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      await handleUpdateAlbum(id, { coverImage: data.url });
    } catch (err) {
      toast.error('Failed to upload cover');
    } finally {
      setUploading(false);
    }
  };

  const handleAddMedia = async (albumId: string, files: FileList) => {
    setUploading(true);
    let updatedAlbum = editingAlbum;
    
    let successCount = 0;
    try {
      // Upload sequentially to avoid race conditions and network flooding
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`/api/albums/${albumId}/photos`, { method: 'POST', body: formData });
        const newPhoto = await res.json();
        
        // Update local state incrementally
        if (updatedAlbum) {
          updatedAlbum = { ...updatedAlbum, photos: [...updatedAlbum.photos, newPhoto] };
          setEditingAlbum(updatedAlbum);
        }
        successCount++;
      }
      toast.success(`Successfully uploaded ${successCount} media files!`);
    } catch (err) {
      toast.error('Failed to upload some media');
    }
    
    // Refresh global albums list
    if (updatedAlbum) {
      setAlbums(albums.map(a => a.id === albumId ? updatedAlbum! : a));
    }
    setUploading(false);
  };

  const handleDeletePhoto = async (albumId: string, photoId: string) => {
    try {
      await fetch(`/api/albums/${albumId}/photos/${photoId}`, { method: 'DELETE' });
      const updatedAlbum = { ...editingAlbum!, photos: editingAlbum!.photos.filter(p => p.id !== photoId) };
      setAlbums(albums.map(a => a.id === albumId ? updatedAlbum : a));
      setEditingAlbum(updatedAlbum);
      toast.success('Media deleted successfully!');
    } catch (err) {
      toast.error('Failed to delete media');
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-lg max-w-sm w-full">
          <div className="text-center mb-6">
            <SettingsIcon className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900">Admin Login</h1>
            <p className="text-gray-500 text-sm mt-2">Enter the admin password to manage galleries.</p>
          </div>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full p-3 border rounded-xl mb-4 bg-gray-50 focus:bg-white outline-none focus:border-rose-400"
            autoFocus
          />
          <button type="submit" className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg">
            Login
          </button>
          <div className="mt-4 text-center">
            <Link to="/" className="text-sm text-gray-500 hover:text-gray-900 underline">Back to Gallery</Link>
          </div>
        </form>
      </div>
    );
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-rose-500"><Loader2 className="w-8 h-8 animate-spin" /></div>;

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
          <Link to="/" className="inline-block mt-6 text-rose-600 font-medium hover:underline">Back to Gallery</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8 bg-white p-4 rounded-xl shadow-sm">
          <div className="flex items-center gap-4">
            <Link to="/" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <SettingsIcon className="w-6 h-6 text-rose-500" />
              Admin Dashboard
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Settings & Album List */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold mb-4">Global Settings</h2>
              <form onSubmit={handleUpdateSettings} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Donation Email</label>
                  <input
                    type="email"
                    value={settings.donationEmail}
                    onChange={(e) => setSettings({ ...settings, donationEmail: e.target.value })}
                    className="w-full p-2 border rounded-lg bg-gray-50 outline-none focus:border-rose-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Categories</label>
                  <div className="flex flex-col gap-2 mb-3">
                    {categories.map(cat => (
                      <div key={cat} className="bg-gray-50 border text-gray-800 text-sm px-3 py-2 rounded-lg flex items-center justify-between">
                        <span>{cat}</span>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => handleEditCategory(cat)} className="text-gray-400 hover:text-blue-500">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => handleRemoveCategory(cat)} className="text-gray-400 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={handleAddCategory} className="text-sm text-rose-600 font-medium flex items-center gap-1 hover:text-rose-700">
                    <Plus className="w-4 h-4" /> Add Category
                  </button>
                </div>
                <button type="submit" className="w-full bg-gray-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
                  Save Global Settings
                </button>
              </form>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Albums</h2>
                <button onClick={handleAddAlbum} className="bg-rose-50 text-rose-600 p-2 rounded-lg hover:bg-rose-100 transition-colors" title="Create New Album">
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {albums.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    No albums created yet.
                  </div>
                ) : (
                  albums.map(album => (
                    <div
                      key={album.id}
                      onClick={() => setEditingAlbum(album)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-3 ${
                        editingAlbum?.id === album.id ? 'border-rose-500 bg-rose-50' : 'border-gray-200 hover:border-rose-300'
                      }`}
                    >
                      <div className="w-12 h-12 bg-gray-200 rounded-md overflow-hidden shrink-0">
                        {album.coverImage ? (
                          <img src={album.coverImage} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-full h-full p-3 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <h4 className="font-semibold text-gray-900 truncate">{album.title}</h4>
                        <p className="text-xs text-gray-500">{album.category} • ${album.price}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Edit Album */}
          <div className="lg:col-span-2">
            {editingAlbum ? (
              <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-6 pb-6 border-b">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Edit2 className="w-6 h-6 text-rose-500" />
                    Edit Album
                  </h2>
                  <button 
                    onClick={() => handleDeleteAlbum(editingAlbum.id)}
                    className="text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> Delete Album
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                      <input
                        type="text"
                        value={editingAlbum.title}
                        onChange={(e) => handleUpdateAlbum(editingAlbum.id, { title: e.target.value })}
                        className="w-full p-2.5 border rounded-lg bg-gray-50 outline-none focus:border-rose-400 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <select
                        value={editingAlbum.category}
                        onChange={(e) => handleUpdateAlbum(editingAlbum.id, { category: e.target.value })}
                        className="w-full p-2.5 border rounded-lg bg-gray-50 outline-none focus:border-rose-400 transition-colors"
                      >
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
                        <input
                          type="number"
                          value={editingAlbum.price}
                          onChange={(e) => handleUpdateAlbum(editingAlbum.id, { price: Number(e.target.value) })}
                          className="w-full p-2.5 border rounded-lg bg-gray-50 outline-none focus:border-rose-400 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Access Code
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={editingAlbum.code}
                            onChange={(e) => handleUpdateAlbum(editingAlbum.id, { code: e.target.value })}
                            className="w-full p-2.5 border rounded-lg bg-gray-50 outline-none focus:border-rose-400 font-mono transition-colors"
                          />
                          <button 
                            onClick={() => handleUpdateAlbum(editingAlbum.id, { code: Math.random().toString(36).substring(2, 8).toUpperCase() })}
                            className="bg-gray-100 hover:bg-gray-200 px-3 rounded-lg text-sm font-medium transition-colors"
                            title="Generate Random Code"
                          >
                            Gen
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cover Image</label>
                    <div className="relative group w-full aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center">
                      {editingAlbum.coverImage ? (
                        <img src={editingAlbum.coverImage} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-12 h-12 text-gray-400 mb-2" />
                      )}
                      
                      {uploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                          <Loader2 className="w-8 h-8 text-white animate-spin" />
                        </div>
                      )}
                      
                      <div className={`absolute inset-0 bg-black/50 flex flex-col items-center justify-center transition-opacity ${editingAlbum.coverImage ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
                        <label className="cursor-pointer bg-white text-gray-900 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-gray-100 transition-colors">
                          <Upload className="w-4 h-4" /> Upload Cover
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleUploadCover(editingAlbum.id, e.target.files[0])} disabled={uploading} />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4 border-b pb-4">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      Media Content ({editingAlbum.photos?.length || 0})
                      {uploading && <Loader2 className="w-4 h-4 text-rose-500 animate-spin" />}
                    </h3>
                    <label className={`cursor-pointer bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-rose-700'}`}>
                      <Plus className="w-4 h-4" /> Add Media (Images/Videos)
                      <input 
                        type="file" 
                        multiple 
                        className="hidden" 
                        accept="image/*,video/*" 
                        disabled={uploading}
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            handleAddMedia(editingAlbum.id, e.target.files);
                          }
                        }} 
                      />
                    </label>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    <AnimatePresence>
                      {(editingAlbum.photos || []).map(photo => (
                        <motion.div
                          key={photo.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100 shadow-sm border border-gray-200"
                        >
                          {photo.type === 'video' ? (
                            <video src={photo.url} className="w-full h-full object-cover" />
                          ) : (
                            <img src={photo.url} className="w-full h-full object-cover" />
                          )}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button 
                              onClick={() => handleDeletePhoto(editingAlbum.id, photo.id)}
                              className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                              title="Delete media"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                          {photo.type === 'video' && (
                            <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded font-bold tracking-wider">
                              VIDEO
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                  {(!editingAlbum.photos || editingAlbum.photos.length === 0) && (
                    <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      No media uploaded yet.<br/>Upload images or videos to this album.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-gray-400 h-[600px]">
                <ImageIcon className="w-16 h-16 mb-4 text-gray-200" />
                <p className="text-lg">Select an album from the left sidebar to edit</p>
                <button 
                  onClick={handleAddAlbum}
                  className="mt-6 bg-rose-50 text-rose-600 px-6 py-2 rounded-full font-medium hover:bg-rose-100 transition-colors"
                >
                  Or Create New Album
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
