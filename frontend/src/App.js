import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Button, Table, Container, Row, Col, InputGroup, FormControl, Alert } from 'react-bootstrap';
import MediaRow from './components/MediaRow';
import MediaModal from './components/MediaModal';

// Helper function to group media items by tmdb_id
const groupMediaByTmdbId = (mediaList) => {
  if (!mediaList) return [];
  const grouped = mediaList.reduce((acc, media) => {
    const key = media.tmdb_id;
    if (!acc[key]) {
      acc[key] = {
        ...media, // Use the first media item as the base
        // Store original items to manage them individually
        originalItems: [media],
        // Combine torrents from all items with the same tmdb_id
        torrents: [...media.torrents],
      };
    } else {
      acc[key].originalItems.push(media);
      acc[key].torrents.push(...media.torrents);
    }
    return acc;
  }, {});
  return Object.values(grouped);
};


function App() {
  const [mediaList, setMediaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);

  // Derived state using useMemo to group media whenever mediaList changes
  const groupedMedia = useMemo(() => groupMediaByTmdbId(mediaList), [mediaList]);

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
    // When editing, we pass the specific, original media item, not the group
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
    if (window.confirm('Are you sure you want to delete this media item?')) {
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
        <Table responsive="sm">
          <thead className="thead-dark">
            <tr>
              <th>Title / Category</th>
              <th className="d-none d-lg-table-cell">Matched Rules</th>
              <th>Total Torrents</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {groupedMedia.length > 0 ? groupedMedia.map(mediaGroup => (
              <MediaRow 
                key={mediaGroup.tmdb_id} 
                mediaGroup={mediaGroup} 
                onEdit={handleOpenModal} // Pass the handler
                onDelete={handleDeleteMedia} // Pass the handler
              />
            )) : (
              <tr>
                <td colSpan="4" className="text-center">No media found.</td>
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