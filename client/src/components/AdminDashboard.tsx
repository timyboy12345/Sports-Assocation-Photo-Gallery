import { useState, useEffect } from 'react';
import api from '../api';
import { LogIn, LogOut, Plus, Upload, FolderPlus, User as UserIcon, Loader2, Edit } from 'lucide-react';
import { Link } from 'react-router-dom';

interface User {
  id?: number;
  email?: string;
  name?: string;
  last_login?: string;
}

const AdminDashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [albumName, setAlbumName] = useState('');
  const [albums, setAlbums] = useState<{ id: number; name: string; date: string }[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<string>('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchAlbums();
    fetchUsers();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlbums = async () => {
    try {
      const res = await api.get('/albums');
      setAlbums(res.data);
      if (res.data.length > 0 && !selectedAlbum) setSelectedAlbum(res.data[0].id.toString());
    } catch (err) {
      console.error('Failed to fetch albums', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const handleLogin = () => {
    const API_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
    window.location.href = `${API_URL}/api/auth/login`;
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout', {});
      window.location.reload();
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/albums', { name: albumName });
      setAlbumName('');
      fetchAlbums();
      alert('Album created successfully!');
    } catch (err) {
      alert('Failed to create album. Please ensure you are logged in.');
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files || !selectedAlbum) return;

    setUploading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('photos', files[i]);
    }

    try {
      await api.post(`/albums/${selectedAlbum}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Photos uploaded successfully!');
      setFiles(null);
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err) {
      alert('Upload failed. Please ensure you are logged in.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-red-600" size={32} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-10">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-red-50 text-red-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <UserIcon size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin</h1>
          <p className="text-gray-500 mb-8">Log in om afbeeldingen te uploaden, albums aan te maken en meer.</p>
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors cursor-pointer"
          >
            <LogIn size={20} />
            Login via Microsoft
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-200">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 text-red-900 rounded-full flex items-center justify-center font-bold text-xl">
            {(user.name || user.email || 'A')[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Welkom, {user.name || user.email || 'Admin'}!</h1>
            <p className="text-sm text-gray-500">All In Fotobibliotheek</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 cursor-pointer text-gray-500 hover:text-red-900 font-medium transition-colors"
        >
          <LogOut size={20} />
          Uitloggen
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Create Album Section */}
        <section className="bg-white p-8 rounded-2xl border border-gray-200 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 text-red-900 rounded-lg">
              <FolderPlus size={24} />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Nieuw Album Aanmaken</h2>
          </div>
          <form onSubmit={handleCreateAlbum} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Album Name</label>
              <input
                type="text"
                placeholder="e.g. Summer Vacation 2026"
                value={albumName}
                onChange={(e) => setAlbumName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-900 focus:border-transparent transition-all"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 cursor-pointer bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              <Plus size={20} />
              Album aanmaken
            </button>
          </form>
        </section>

        {/* Upload Photos Section */}
        <section className="bg-white p-8 rounded-2xl border border-gray-200 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
              <Upload size={24} />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Upload Photos</h2>
          </div>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Select Album</label>
              <select
                value={selectedAlbum}
                onChange={(e) => setSelectedAlbum(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-900 focus:border-transparent transition-all appearance-none bg-white"
              >
                {albums.length === 0 && <option disabled>No albums available</option>}
                {albums.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Select Photos</label>
              <input
                type="file"
                multiple
                onChange={(e) => setFiles(e.target.files)}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-900 hover:file:bg-red-100 cursor-pointer"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
              disabled={uploading || albums.length === 0}
            >
              {uploading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={20} />
                  Upload Photos
                </>
              )}
            </button>
          </form>
        </section>
      </div>

      {/* Manage Albums Section */}
      <section className="bg-white p-8 rounded-2xl border border-gray-200 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-50 text-red-900 rounded-lg">
            <Edit size={24} />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Beheer Albums</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {albums.map(a => (
            <Link to={`/admin/edit/${a.id}`} key={a.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:text-red-900 transition-colors group">
              <div className="truncate pr-4">
                <p className="font-semibold truncate">{a.name}</p>
                <p className="text-xs opacity-50">{new Date(a.date).toLocaleDateString()}</p>
              </div>
            </Link>
          ))}
          {albums.length === 0 && (
            <p className="col-span-full text-center py-6 text-gray-400 italic">No albums created yet.</p>
          )}
        </div>
      </section>

      {/* User Management Section */}
      <section className="bg-white p-8 rounded-2xl border border-gray-200 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-50 text-red-900 rounded-lg">
            <UserIcon size={24} />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Beheer Gebruikers</h2>
        </div>
        <div className="overflow-x-auto -mx-8 p-8">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="pb-4 font-semibold text-gray-600">User</th>
                <th className="pb-4 font-semibold text-gray-600">Email</th>
                <th className="pb-4 font-semibold text-gray-600 text-right">Last Login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center font-medium text-xs">
                        {(u.name || u.email || 'U')[0].toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900">{u.name}</span>
                    </div>
                  </td>
                  <td className="py-4 text-gray-500">{u.email}</td>
                  <td className="py-4 text-right text-gray-500 text-sm">
                    {u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-10 text-center text-gray-400">
                    No users found in the system.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
