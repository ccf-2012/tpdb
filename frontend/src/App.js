import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Button, Container, Row, Col, InputGroup, FormControl, Alert, Pagination } from 'react-bootstrap';
import { useTable, useExpanded } from 'react-table';
import MediaModal from './components/MediaModal';
import { useMediaQuery } from 'react-responsive';

const GROUPS_PER_PAGE = 10;

// Helper function to group media items by tmdb_id
const groupMediaByTmdbId = (mediaList) => {
  if (!mediaList) return [];
  const grouped = mediaList.reduce((acc, media) => {
    const key = media.tmdb_id;
    if (!acc[key]) {
      acc[key] = {
        ...media,
        originalItems: [media],
        torrents: [...media.torrents],
        torname_regex_list: [media.torname_regex],
      };
    } else {
      acc[key].originalItems.push(media);
      acc[key].torrents.push(...media.torrents);
      if (!acc[key].torname_regex_list.includes(media.torname_regex)) {
        acc[key].torname_regex_list.push(media.torname_regex);
      }
    }
    return acc;
  }, {});
  return Object.values(grouped);
};

function Table({ columns, data, onEdit, onDelete }) {
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    visibleColumns,
  } = useTable(
    {
      columns,
      data,
    },
    useExpanded
  );

  return (
    <div className="table-responsive">
      <table {...getTableProps()} className="table table-sm table-hover">
        <thead className="thead-dark">
          {headerGroups.map(headerGroup => (
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map(column => (
                <th {...column.getHeaderProps()}>{column.render('Header')}</th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          {rows.map(row => {
            prepareRow(row);
            return (
              <React.Fragment key={row.getRowProps().key}>
                <tr {...row.getRowProps()}>
                  {row.cells.map(cell => (
                    <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
                  ))}
                </tr>
                {row.isExpanded ? (
                  <tr>
                    <td colSpan={visibleColumns.length}>
                      {/* Render expanded content here */}
                      <div className="p-2 bg-light">
                        <h5>Torrents for {row.original.tmdb_title}</h5>
                        <ul>
                          {row.original.torrents.map(t => <li key={t.id}>{t.name}</li>)}
                        </ul>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

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

  const isMobile = useMediaQuery({ query: '(max-width: 768px)' });

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

  useEffect(() => {
    fetchMedia(currentPage);
  }, [currentPage]);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      if (currentPage !== 1) setCurrentPage(1);
      else fetchMedia(1);
      return;
    }
    setLoading(true);
    setError(null);
    axios.get(`/api/search?torname=${encodeURIComponent(searchQuery)}`)
      .then(response => {
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

  const handleSaveMedia = (mediaData, mode) => {
    let request;
    if (mediaData.id) { // Editing existing media
      request = axios.put(`/api/media/${mediaData.id}`, mediaData);
    } else { // Creating new media
      if (mode === 'tmdb') {
        request = axios.post('/api/media/', mediaData);
      } else { // manual mode
        request = axios.post('/api/media/', mediaData);
      }
    }

    request
      .then(() => {
        handleCloseModal();
        fetchMedia(currentPage);
      })
      .catch(err => {
        setError(`Failed to save media: ${err.response?.data?.detail || err.message}`);
      });
  };

  const handleDeleteMedia = (mediaId) => {
    if (window.confirm('Are you sure you want to delete this media item?')) {
      axios.delete(`/api/media/${mediaId}`)
        .then(() => fetchMedia(currentPage))
        .catch(err => {
          setError(`Failed to delete media: ${err.response?.data?.detail || err.message}`);
        });
    }
  };

  const columns = useMemo(
    () => {
      const baseColumns = [
        {
          Header: 'Title / Category',
          accessor: 'tmdb_title',
          Cell: ({ row }) => (
            <div>
              <strong>{row.original.tmdb_title}</strong>
              <div className="text-muted small">{row.original.tmdb_cat}</div>
            </div>
          ),
        },
      ];

      if (!isMobile) {
        baseColumns.push(
          {
            Header: 'Matched Rules',
            accessor: 'torname_regex_list',
            Cell: ({ value }) => (
              <ul className="list-unstyled mb-0">
                {value.map((regex, index) => (
                  <li key={index}><code>{regex}</code></li>
                ))}
              </ul>
            ),
          },
          {
            Header: 'Total Torrents',
            accessor: 'torrents',
            Cell: ({ value }) => value.length,
          }
        );
      }

      baseColumns.push(
        {
          Header: 'Actions',
          id: 'actions',
          Cell: ({ row }) => (
            <div className="text-center">
              <Button variant="outline-warning" size="sm" onClick={() => handleOpenModal(row.original.originalItems[0])}>Edit</Button>{' '}
              <Button variant="outline-danger" size="sm" onClick={() => handleDeleteMedia(row.original.originalItems[0].id)}>Delete</Button>
            </div>
          ),
        },
        {
          // Make an expander cell
          Header: () => null, // No header
          id: 'expander', // It needs an ID
          Cell: ({ row }) => (
            // Use Cell to render an expander for each row.
            // We can use the getToggleRowExpandedProps method here to get the expander props
            <span {...row.getToggleRowExpandedProps()}>
              {row.isExpanded ? '👇' : '👉'}
            </span>
          ),
        }
      );

      return baseColumns;
    },
    [isMobile]
  );

  return (
    <Container fluid className="mt-4" style={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
      <h1 className="mb-4">TMDb Media Manager</h1>
      {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
      <Row className="mb-3">
        <Col md={8} xs={12}>
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
        <Col md={4} xs={12} className="text-end mt-2 mt-md-0">
          <Button variant="success" onClick={() => handleOpenModal()}>+ Add New Media</Button>
        </Col>
      </Row>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <Table columns={columns} data={groupedMedia} onEdit={handleOpenModal} onDelete={handleDeleteMedia} />
          {totalPages > 1 && (
            <Row className="justify-content-center">
              <Col xs="auto">
                <Pagination size={isMobile ? 'sm' : undefined}>
                  <Pagination.First onClick={() => handlePageChange(1)} disabled={currentPage === 1} />
                  <Pagination.Prev onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} />
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