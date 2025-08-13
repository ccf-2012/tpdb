import React, { useState } from 'react';
import { Button, Collapse, Card, ListGroup, Badge } from 'react-bootstrap';

const MediaRow = ({ mediaGroup, onEdit, onDelete }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* The main, always-visible row for the media group */}
      <tr onClick={() => setOpen(!open)} aria-controls={`collapse-${mediaGroup.tmdb_id}`} aria-expanded={open} style={{ cursor: 'pointer' }}>
        <td>
          <strong>{mediaGroup.tmdb_title}</strong>
          <div className="text-muted small">{mediaGroup.tmdb_cat}</div>
        </td>
        <td className="d-none d-lg-table-cell">
          <Badge bg="info">{mediaGroup.originalItems.length}</Badge>
        </td>
        <td>
          <Badge bg="primary">{mediaGroup.torrents.length}</Badge>
        </td>
        <td className="text-center">
          <Button variant="link" size="sm">{open ? 'Collapse' : 'Expand'}</Button>
        </td>
      </tr>

      {/* The collapsible row with details for each original media item */}
      <tr>
        <td colSpan="4" style={{ padding: 0, border: 0 }}>
          <Collapse in={open}>
            <div id={`collapse-${mediaGroup.tmdb_id}`}>
              <Card className="m-2" bg="light">
                <Card.Header as="h5">Details for {mediaGroup.tmdb_title}</Card.Header>
                <ListGroup variant="flush">
                  {mediaGroup.originalItems.map(item => (
                    <ListGroup.Item key={item.id}>
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <strong>Rule:</strong> <code>{item.torname_regex}</code>
                          <ul className="mt-2 mb-0 text-muted" style={{ fontSize: '0.9em' }}>
                            {item.torrents.map(torrent => (
                              <li key={torrent.id}>{torrent.name}</li>
                            ))}
                            {item.torrents.length === 0 && <li>No torrents matched this rule.</li>}
                          </ul>
                        </div>
                        <div className="text-nowrap">
                          <Button variant="outline-warning" size="sm" onClick={() => onEdit(item)}>Edit</Button>{' '}
                          <Button variant="outline-danger" size="sm" onClick={() => onDelete(item.id)}>Delete</Button>
                        </div>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </Card>
            </div>
          </Collapse>
        </td>
      </tr>
    </>
  );
};

export default MediaRow;
