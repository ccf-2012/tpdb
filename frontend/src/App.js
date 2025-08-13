import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Button, Table, Container, Row, Col, InputGroup, FormControl, Alert, Pagination } from 'react-bootstrap';
import MediaRow from './components/MediaRow';
import MediaModal from './components/MediaModal';

const GROUPS_PER_PAGE = 10;

// Helper function to group media items by tmdb_id
const groupMediaByTmdbId = (mediaList) => {
  if (!mediaList) return [];
  const grouped = mediaList.reduce((acc, media) => {
    const key = media.tmdb_id;
    if (!acc[key]) {
      acc[key] = {
        ...media, // Use the first media item as the base
        originalItems: [media],
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

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalGroups, setTotalGroups] = useState(0);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);

  const groupedMedia = useMemo(() => groupMediaByTmdbId(mediaList), [mediaList]);
  const totalPages = Math.ceil(totalGroups / GROUPS_PER_PAGE);

  const fetchMedia = (page) => {
    setLoading(true);
    const skip = (page - 1) * GROUPS_PER_PAGE;
    axios.get(`/api/media/?skip=${skip}&limit=${GROUPS_PER_PAGE}`)
      .then(response => {
        setMediaList(response.data.items);
        setTotalGroups(response.data.total);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching media:', error);
        setError('Failed to fetch media data. Is the backend running?');
        setLoading(false);
      });
  };

  // Fetch media when currentPage changes
  useEffect(() => {
    fetchMedia(currentPage);
  }, [currentPage]);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      // When clearing search, go back to the first page
      if (currentPage !== 1) setCurrentPage(1);
      else fetchMedia(1);
      return;
    }
    setLoading(true);
    setError(null);
    axios.get(`/api/search?torname=${encodeURIComponent(searchQuery)}`)
      .then(response => {
        // After a successful search, the item is added. Refresh the current page.
        fetchMedia(currentPage);
      })
      .catch(err => {
        setError(`Search failed: ${err.response?.data?.detail || err.message}`);
        setLoading(false);
      });
  };

  const handlePageChange = (pageNumber) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
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
      .then(() => {
        handleCloseModal();
        fetchMedia(currentPage); // Refresh current page after save
      })
      .catch(err => {
        setError(`Failed to save media: ${err.response?.data?.detail || err.message}`);
      });
  };

  const handleDeleteMedia = (mediaId) => {
    if (window.confirm('Are you sure you want to delete this media item?')) {
      axios.delete(`/api/media/${mediaId}`)
        .then(() => fetchMedia(currentPage)) // Refresh current page after delete
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
        <>
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
                  onEdit={handleOpenModal}
                  onDelete={handleDeleteMedia}
                />
              )) : (
                <tr>
                  <td colSpan="4" className="text-center">No media found.</td>
                </tr>
              )}
            </tbody>
          </Table>
          {totalPages > 1 && (
            <Row className="justify-content-center">
              <Col xs="auto">
                <Pagination>
                  <Pagination.First onClick={() => handlePageChange(1)} disabled={currentPage === 1} />
                  <Pagination.Prev onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} />
                  {[...Array(totalPages).keys()].map(number => (
                    <Pagination.Item key={number + 1} active={number + 1 === currentPage} onClick={() => handlePageChange(number + 1)}>
                      {number + 1}
                    </Pagination.Item>
                  ))}
                  <Pagination.Next onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} />
                  <Pagination.Last onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages} />
                </Pagination>
              </Col>
            </Row>
          )}
        </>
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
