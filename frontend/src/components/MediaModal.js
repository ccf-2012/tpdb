
import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, InputGroup, FormControl } from 'react-bootstrap';
import axios from 'axios';

function MediaModal({ media, onSave, onClose }) {
  const [formData, setFormData] = useState({});
  const [mode, setMode] = useState('tmdb'); // 'tmdb' or 'manual'

  useEffect(() => {
    if (media) {
      setFormData(media);
      // Determine mode based on existing media data
      if (media.tmdb_id) {
        setMode('tmdb');
      } else {
        setMode('manual');
      }
    } else {
      // Default state for a new media item
      setFormData({
        torname_regex: '',
        tmdb_id: '',
        tmdb_title: '',
        tmdb_cat: '',
        tmdb_poster: '',
        tmdb_year: '',
        tmdb_genres: '',
        tmdb_preview: '',
        custom_title: '',
        custom_path: ''
      });
      setMode('tmdb'); // Default to TMDb mode for new items
    }
  }, [media]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onSave(formData, mode);
  };

  const handleFetchTMDbDetails = () => {
    if (!formData.tmdb_id || !formData.tmdb_cat) {
      alert('Please enter TMDb ID and Category (movie/tv) to fetch details.');
      return;
    }
    axios.get(`/api/tmdb/details?tmdb_id=${formData.tmdb_id}&tmdb_cat=${formData.tmdb_cat}`)
      .then(response => {
        const data = response.data;
        setFormData(prev => ({
          ...prev,
          tmdb_title: data.title || data.name,
          tmdb_poster: data.poster_path,
          tmdb_year: (data.release_date || data.first_air_date)?.substring(0, 4),
          tmdb_genres: data.genres?.map(g => g.name).join(', '),
          tmdb_preview: data.overview
        }));
      })
      .catch(error => {
        console.error('Error fetching TMDb details:', error);
        alert('Failed to fetch TMDb details. Please check the ID and category.');
      });
  };

  return (
    <Modal show onHide={onClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{media ? 'Edit Media' : 'Add New Media'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Entry Mode</Form.Label>
            <div>
              <Form.Check
                inline
                type="radio"
                label="TMDb Match"
                name="mode"
                id="mode-tmdb"
                value="tmdb"
                checked={mode === 'tmdb'}
                onChange={() => setMode('tmdb')}
              />
              <Form.Check
                inline
                type="radio"
                label="Manual Entry"
                name="mode"
                id="mode-manual"
                value="manual"
                checked={mode === 'manual'}
                onChange={() => setMode('manual')}
              />
            </div>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Torrent Name Regex</Form.Label>
            <Form.Control type="text" name="torname_regex" value={formData.torname_regex || ''} onChange={handleChange} />
          </Form.Group>

          {mode === 'tmdb' && (
            <>
              <Form.Group className="mb-3">
                <Form.Label>TMDb ID</Form.Label>
                <Form.Control type="number" name="tmdb_id" value={formData.tmdb_id || ''} onChange={handleChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Category</Form.Label>
                <Form.Select name="tmdb_cat" value={formData.tmdb_cat || ''} onChange={handleChange}>
                  <option value="">Select Category</option>
                  <option value="movie">Movie</option>
                  <option value="tv">TV</option>
                </Form.Select>
              </Form.Group>
              <Button variant="info" onClick={handleFetchTMDbDetails} className="mb-3">Fetch TMDb Details</Button>

              <Form.Group className="mb-3">
                <Form.Label>TMDb Title</Form.Label>
                <Form.Control type="text" name="tmdb_title" value={formData.tmdb_title || ''} readOnly />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>TMDb Poster URL</Form.Label>
                <Form.Control type="text" name="tmdb_poster" value={formData.tmdb_poster || ''} readOnly />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>TMDb Year</Form.Label>
                <Form.Control type="text" name="tmdb_year" value={formData.tmdb_year || ''} readOnly />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>TMDb Genres</Form.Label>
                <Form.Control type="text" name="tmdb_genres" value={formData.tmdb_genres || ''} readOnly />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>TMDb Preview</Form.Label>
                <Form.Control as="textarea" name="tmdb_preview" value={formData.tmdb_preview || ''} readOnly rows={3} />
              </Form.Group>
            </>
          )}

          {mode === 'manual' && (
            <>
              <Form.Group className="mb-3">
                <Form.Label>Custom Title</Form.Label>
                <Form.Control type="text" name="custom_title" value={formData.custom_title || ''} onChange={handleChange} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Custom Path</Form.Label>
                <Form.Control type="text" name="custom_path" value={formData.custom_path || ''} onChange={handleChange} />
              </Form.Group>
            </>
          )}
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={handleSave}>Save Changes</Button>
      </Modal.Footer>
    </Modal>
  );
}

export default MediaModal;
