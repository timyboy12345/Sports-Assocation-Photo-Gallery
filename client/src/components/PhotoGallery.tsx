import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { getUploadsUrl } from '../api';
import { ArrowLeft, Image as ImageIcon, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface Photo {
  id: number;
  filename: string;
}

interface AlbumData {
  album: { id: number; name: string };
  photos: Photo[];
}

const PhotoGallery = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<AlbumData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    api.get(`/albums/${id}`)
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch album photos', err);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (data?.album.name) {
      document.title = `${data.album.name} / Fotoalbum`;
    }
  }, [data]);

  const nextPhoto = useCallback(() => {
    if (data && selectedIndex !== null) {
      setSelectedIndex((selectedIndex + 1) % data.photos.length);
    }
  }, [data, selectedIndex]);

  const prevPhoto = useCallback(() => {
    if (data && selectedIndex !== null) {
      setSelectedIndex((selectedIndex - 1 + data.photos.length) % data.photos.length);
    }
  }, [data, selectedIndex]);

  const closeSlideshow = useCallback(() => {
    setSelectedIndex(null);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedIndex === null) return;
      if (e.key === 'ArrowRight') nextPhoto();
      if (e.key === 'ArrowLeft') prevPhoto();
      if (e.key === 'Escape') closeSlideshow();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, nextPhoto, prevPhoto, closeSlideshow]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!data) return <div className="text-center py-10">Album not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <Link
          to="/"
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-red-900 transition-colors w-fit"
        >
          <ArrowLeft size={16} />
          Terug naar alle albums
        </Link>
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{data.album.name}</h1>
            <p className="text-gray-500 mt-1 flex items-center gap-2">
              <ImageIcon size={16} />
              {data.photos.length} {data.photos.length === 1 ? 'Foto' : 'Foto\'s'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-0.5">
        {data.photos.map((photo, index) => (
          <div
            key={photo.id}
            onClick={() => setSelectedIndex(index)}
            className="aspect-square overflow-hidden bg-gray-100 group relative shadow-sm transition-all duration-300 cursor-pointer"
          >
            <img
              src={getUploadsUrl(photo.filename, 'webp')}
              alt="Event"
              className="w-full h-full object-cover transform transition-transform duration-500"
              loading="lazy"
            />

            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
          </div>
        ))}
      </div>

      {data.photos.length === 0 && (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
          <ImageIcon className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-500 text-lg">Dit album heeft nog geen foto's.</p>
        </div>
      )}

      {/* Slideshow Modal */}
      {selectedIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 transition-opacity duration-300">
          <button
            onClick={closeSlideshow}
            className="absolute cursor-pointer top-6 right-6 p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all z-50"
          >
            <X size={24} />
          </button>

          <button
            onClick={prevPhoto}
            className="absolute cursor-pointer left-6 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all z-50"
          >
            <ChevronLeft size={32} />
          </button>

          <div className="relative w-full h-full flex items-center justify-center p-4 md:p-12">
            <img
              src={getUploadsUrl(data.photos[selectedIndex].filename, 'original')}
              alt="Full size"
              className="max-w-full max-h-full object-contain shadow-2xl animate-in zoom-in-95 duration-200"
            />
          </div>
          <button
            onClick={nextPhoto}
            className="absolute cursor-pointer right-6 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all z-50"
          >
            <ChevronRight size={32} />
          </button>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/40 backdrop-blur-md rounded-full text-white/80 text-sm font-medium">
            {selectedIndex + 1} / {data.photos.length}
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoGallery;
