
import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Table, InputGroup, FormControl } from 'react-bootstrap';
import axios from 'axios';

function MediaModal({ media, onSave, onClose }) {
  const [formData, setFormData] = useState({});
  const [newTorrentName, setNewTorrentName] = useState('');

  useEffect(() => {
    if (media) {
      setFormData(media);
    } else {
      // Default state for a new media item
      setFormData({
        torname_regex: '',
        tmdb_id: '',
        tmdb_title: '',
        tmdb_cat: '',
        tmdb_poster: '',
        torrents: []
      });
    }
  }, [media]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  const handleAddTorrent = () => {
    if (!newTorrentName.trim()) return;
    const newTorrent = { name: newTorrentName };

    // If the media is already saved, create torrent directly in DB
    if (formData.id) {
      axios.post(`/api/torrents/?media_id=${formData.id}`, newTorrent)
        .then(response => {
          setFormData(prev => ({
            ...prev,
            torrents: [...prev.torrents, response.data]
          }));
          setNewTorrentName('');
        })
        .catch(err => console.error("Failed to add torrent", err));
    } else {
      // If media is new, just add to local state
      setFormData(prev => ({
        ...prev,
        torrents: [...prev.torrents, { name: newTorrentName, id: `temp-${Date.now()}` }]
      }));
      setNewTorrentName('');
    }
  };

  const handleDeleteTorrent = (torrentId) => {
    // If the media is saved, delete from DB
    if (formData.id && !String(torrentId).startsWith('temp-')) {
      axios.delete(`/api/torrents/${torrentId}`)
        .then(() => {
          setFormData(prev => ({
            ...prev,
            torrents: prev.torrents.filter(t => t.id !== torrentId)
          }));
        })
        .catch(err => console.error("Failed to delete torrent", err));
    } else {
       // If media is new or torrent is temporary, just remove from local state
       setFormData(prev => ({
        ...prev,
        torrents: prev.torrents.filter(t => t.id !== torrentId)
      }));
    }
  };

  return (
    <Modal show onHide={onClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{media ? 'Edit Media' : 'Add New Media'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>TMDb Title</Form.Label>
            <Form.Control type="text" name="tmdb_title" value={formData.tmdb_title || ''} onChange={handleChange} />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>TMDb ID</Form.Label>
            <Form.Control type="number" name="tmdb_id" value={formData.tmdb_id || ''} onChange={handleChange} />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Category</Form.Label>
            <Form.Control type="text" name="tmdb_cat" value={formData.tmdb_cat || ''} onChange={handleChange} />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Torrent Name Regex</Form.Label>
            <Form.Control type="text" name="torname_regex" value={formData.torname_regex || ''} onChange={handleChange} />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Poster URL</Form.Label>
            <Form.Control type="text" name="tmdb_poster" value={formData.tmdb_poster || ''} onChange={handleChange} />
          </Form.Group>
        </Form>

        <hr />

        <h5>Associated Torrents</h5>
        <Table striped bordered size="sm">
          <tbody>
            {formData.torrents && formData.torrents.map(t => (
              <tr key={t.id}>
                <td>{t.name}</td>
                <td className="text-end">
                  <Button variant="danger" size="sm" onClick={() => handleDeleteTorrent(t.id)}>Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        <InputGroup className="mb-3">
          <FormControl
            placeholder="New torrent name"
            value={newTorrentName}
            onChange={(e) => setNewTorrentName(e.target.value)}
          />
          <Button variant="outline-secondary" onClick={handleAddTorrent}>Add Torrent</Button>
        </InputGroup>

      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={handleSave}>Save Changes</Button>
      </Modal.Footer>
    </Modal>
  );
}

export default MediaModal;
