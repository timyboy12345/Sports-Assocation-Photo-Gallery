import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AlbumList from './components/AlbumList';
import PhotoGallery from './components/PhotoGallery';
import AdminDashboard from './components/AdminDashboard';
import EditAlbum from './components/EditAlbum';
import Sidebar from './components/Sidebar';
import './index.css';

function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-white">
        <Sidebar />
        <main className="flex-1 ml-64 p-8">
          <div className="max-w-6xl mx-auto">
            <Routes>
              <Route path="/" element={<AlbumList />} />
              <Route path="/album/:id" element={<PhotoGallery />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/edit/:id" element={<EditAlbum />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
