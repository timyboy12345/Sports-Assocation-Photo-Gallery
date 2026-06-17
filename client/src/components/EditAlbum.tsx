import {useState, useEffect} from 'react';
import {useParams, Link} from 'react-router-dom';
import api, {getUploadsUrl} from '../api';
import {ArrowLeft, Trash2, Save, Calendar as CalendarIcon, Loader2, Image as ImageIcon} from 'lucide-react';

interface Photo {
    id: number;
    filename: string;
}

interface AlbumData {
    album: { id: number; name: string; date: string };
    photos: Photo[];
}

const EditAlbum = () => {
    const {id} = useParams<{ id: string }>();
    const [data, setData] = useState<AlbumData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [albumDate, setAlbumDate] = useState('');
    const [albumName, setAlbumName] = useState('');

    useEffect(() => {
        fetchAlbum();
    }, [id]);

    const fetchAlbum = async () => {
        try {
            const res = await api.get(`/albums/${id}`);
            setData(res.data);
            setAlbumDate(new Date(res.data.album.date).toISOString().split('T')[0]);
            setAlbumName(res.data.album.name);
        } catch (err) {
            console.error('Failed to fetch album', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.patch(`/albums/${id}`, {
                name: albumName,
                date: albumDate
            }, {withCredentials: true});
            alert('Album updated successfully!');
        } catch (err) {
            alert('Failed to update album.');
        } finally {
            setSaving(false);
        }
    };

    const handleDeletePhoto = async (photoId: number) => {
        if (!window.confirm('Are you sure you want to delete this photo?')) return;
        try {
            await api.delete(`/photos/${photoId}`, {withCredentials: true});
            setData(prev => prev ? {
                ...prev,
                photos: prev.photos.filter(p => p.id !== photoId)
            } : null);
        } catch (err) {
            alert('Failed to delete photo.');
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="animate-spin text-red-900" size={32}/>
        </div>
    );

    if (!data) return <div className="text-center py-10">Album not found.</div>;

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4">
                <Link
                    to="/admin"
                    className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-red-900 transition-colors w-fit"
                >
                    <ArrowLeft size={16}/>
                    Back to Admin
                </Link>
                <h1 className="text-3xl font-bold text-gray-900">Edit Album: {data.album.name}</h1>
            </div>

            <section className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
                <form onSubmit={handleSave} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Album Name</label>
                            <input
                                type="text"
                                value={albumName}
                                onChange={(e) => setAlbumName(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-900 focus:border-transparent transition-all"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Event Date</label>
                            <div className="relative">
                                <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                                              size={18}/>
                                <input
                                    type="date"
                                    value={albumDate}
                                    onChange={(e) => setAlbumDate(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-900 focus:border-transparent transition-all"
                                    required
                                />
                            </div>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 cursor-pointer text-white font-semibold py-3 px-8 rounded-xl transition-colors disabled:bg-red-300"
                    >
                        {saving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>}
                        Aanpassingen opslaan
                    </button>
                </form>
            </section>

            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <ImageIcon size={24} className="text-red-900"/>
                        Manage Photos ({data.photos.length})
                    </h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {data.photos.map(photo => (
                        <div key={photo.id}
                             className="group relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                            <img
                                src={getUploadsUrl(photo.filename)}
                                alt="Album photo"
                                className="w-full h-full object-cover"
                            />
                            <div
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button
                                    onClick={() => handleDeletePhoto(photo.id)}
                                    className="p-3 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow-lg"
                                    title="Delete Photo"
                                >
                                    <Trash2 size={20}/>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {data.photos.length === 0 && (
                    <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                        <p className="text-gray-500">Dit album heeft nog geen foto's.</p>
                    </div>
                )}
            </section>
        </div>
    );
};

export default EditAlbum;
