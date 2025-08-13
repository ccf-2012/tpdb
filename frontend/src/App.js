import React, { useState, useEffect } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Button, Table, Container, Row, Col, InputGroup, FormControl, Alert } from 'react-bootstrap';
import MediaModal from './components/MediaModal';

function App() {
  const [mediaList, setMediaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);

  const fetchMedia = () => {
    setLoading(true);
    axios.get('/api/media/')
      .then(response => {
        setMediaList(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching media:', error);
        setError('Failed to fetch media data. Is the backend running?');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      fetchMedia(); // Reset to full list if search is empty
      return;
    }
    setLoading(true);
    setError(null);
    axios.get(`/api/search?torname=${encodeURIComponent(searchQuery)}`)
      .then(response => {
        // Since search can find an item and add it, we should refresh the whole list
        fetchMedia(); 
      })
      .catch(err => {
        setError(`Search failed: ${err.response?.data?.detail || err.message}`);
      })
      .finally(() => setLoading(false));
  };

  const handleOpenModal = (media = null) => {
    setSelectedMedia(media);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedMedia(null);
  };

  const handleSaveMedia = (mediaData) => {
    const { id, ...dataToSave } = mediaData;
    const request = id 
      ? axios.put(`/api/media/${id}`, dataToSave)
      : axios.post('/api/media/', dataToSave);

    request
      .then(response => {
        // If a new media was created, we might need to handle its torrents separately
        const savedMedia = response.data;
        const newTorrents = mediaData.torrents.filter(t => String(t.id).startsWith('temp-'));
        if (newTorrents.length > 0) {
          const torrentPromises = newTorrents.map(t => 
            axios.post(`/api/torrents/?media_id=${savedMedia.id}`, { name: t.name })
          );
          return Promise.all(torrentPromises);
        }
      })
      .then(() => {
        handleCloseModal();
        fetchMedia(); // Refresh list after save
      })
      .catch(err => {
        setError(`Failed to save media: ${err.response?.data?.detail || err.message}`);
      });
  };

  const handleDeleteMedia = (mediaId) => {
    if (window.confirm('Are you sure you want to delete this media item and all its torrents?')) {
      axios.delete(`/api/media/${mediaId}`)
        .then(() => fetchMedia()) // Refresh list after delete
        .catch(err => {
          setError(`Failed to delete media: ${err.response?.data?.detail || err.message}`);
        });
    }
  };

  return (
    <Container fluid className="mt-4">
      <h1 className="mb-4">TMDb Media Manager</h1>

      {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}

      <Row className="mb-3">
        <Col md={8}>
          <InputGroup>
            <FormControl
              placeholder="Search by torrent name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleSearch()}
            />
            <Button variant="primary" onClick={handleSearch}>Search</Button>
          </InputGroup>
        </Col>
        <Col md={4} className="text-end">
          <Button variant="success" onClick={() => handleOpenModal()}>+ Add New Media</Button>
        </Col>
      </Row>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <Table striped bordered hover responsive>
          <thead className="thead-dark">
            <tr>
              <th>Title</th>
              <th>TMDb ID</th>
              <th>Category</th>
              <th>Regex</th>
              <th>Torrents</th>
              <th style={{ width: '150px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {mediaList.length > 0 ? mediaList.map(media => (
              <tr key={media.id}>
                <td>{media.tmdb_title}</td>
                <td>{media.tmdb_id}</td>
                <td>{media.tmdb_cat}</td>
                <td><code>{media.torname_regex}</code></td>
                <td>
                  <ul className="list-unstyled mb-0">
                    {media.torrents.map(torrent => (
                      <li key={torrent.id} title={torrent.name} className="text-truncate" style={{maxWidth: '250px'}}>{torrent.name}</li>
                    ))}
                  </ul>
                </td>
                <td>
                  <Button variant="warning" size="sm" onClick={() => handleOpenModal(media)}>Edit</Button>{' '}
                  <Button variant="danger" size="sm" onClick={() => handleDeleteMedia(media.id)}>Delete</Button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="6" className="text-center">No media found.</td>
              </tr>
            )}
          </tbody>
        </Table>
      )}

      {showModal && (
        <MediaModal 
          media={selectedMedia}
          onSave={handleSaveMedia}
          onClose={handleCloseModal}
        />
      )}

    </Container>
  );
}

export default App;
