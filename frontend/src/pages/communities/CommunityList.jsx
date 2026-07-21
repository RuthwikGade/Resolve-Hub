import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Loader from '../../components/ui/Loader';
import Badge from '../../components/ui/Badge';
import { useNotifications } from '../../contexts/NotificationContext';
import { COMMUNITY_TYPES } from '../../utils/constants';

export default function CommunityList() {
  const navigate = useNavigate();
  const { addToast } = useNotifications();
  
  const [myCommunities, setMyCommunities] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [loadingMy, setLoadingMy] = useState(true);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [joiningId, setJoiningId] = useState(null);

  // Fetch joined communities
  useEffect(() => {
    async function fetchMyCommunities() {
      try {
        const res = await api.get('/communities/mine');
        setMyCommunities(res.data || []);
      } catch (err) {
        addToast(err.message || 'Failed to fetch communities', 'error');
      } finally {
        setLoadingMy(false);
      }
    }
    fetchMyCommunities();
  }, [addToast]);

  // Handle search
  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    setLoadingSearch(true);
    try {
      const typeQuery = selectedType ? `&type=${selectedType}` : '';
      const res = await api.get(`/communities/search?q=${searchQuery}${typeQuery}`);
      setSearchResults(res.data || []);
    } catch (err) {
      addToast(err.message || 'Search failed', 'error');
    } finally {
      setLoadingSearch(false);
    }
  };

  // Run search when type or search query is cleared
  useEffect(() => {
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType]);

  // Request to join a community
  const handleJoinRequest = async (communityId) => {
    setJoiningId(communityId);
    try {
      await api.post(`/members/join/${communityId}`, { message: 'I would like to join this community.' });
      addToast('Join request sent successfully!', 'success');
      // Refresh search results to show status
      handleSearch();
    } catch (err) {
      addToast(err.message || 'Failed to send join request', 'error');
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <div className="communities-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <p className="header-breadcrumb">ResolveHub / Communities</p>
          <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>Communities</h2>
        </div>
        <Button 
          id="btn-create-community" 
          onClick={() => navigate('/communities/create')}
          icon="➕"
        >
          Create Community
        </Button>
      </div>

      {/* User's Communities Section */}
      <section style={{ marginBottom: 'var(--space-8)' }}>
        <h3 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-4)', fontWeight: 600 }}>My Communities</h3>
        {loadingMy ? (
          <Loader variant="grid" count={3} />
        ) : myCommunities.length === 0 ? (
          <Card noHover className="text-center" style={{ padding: 'var(--space-8)' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
              You haven't joined any communities yet.
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
              Use the search section below to find and join your apartment, campus, or gated community!
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
            {myCommunities.map((c) => (
              <Card 
                key={c.id} 
                id={`community-card-${c.id}`}
                header={c.name}
                headerAction={<Badge variant="primary">{c.type}</Badge>}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/communities/${c.id}`)}
              >
                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', minHeight: '40px', marginBottom: 'var(--space-4)' }}>
                  {c.description || 'No description provided.'}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                  <span>Role: <strong>{c.role || 'Member'}</strong></span>
                  <span>Joined: {new Date(c.joined_at).toLocaleDateString()}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Discovery Section */}
      <section>
        <h3 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-4)', fontWeight: 600 }}>Explore Communities</h3>
        
        {/* Search Bar */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <input
              id="search-input"
              type="text"
              placeholder="Search by community name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
            />
          </div>
          <div style={{ width: '180px' }}>
            <select
              id="type-select"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="form-select"
            >
              <option value="">All Types</option>
              {COMMUNITY_TYPES.map(t => (
                <option key={t.value} value={t.label}>{t.label}</option>
              ))}
            </select>
          </div>
          <Button type="submit" variant="secondary" loading={loadingSearch} id="btn-search-communities">
            Search
          </Button>
        </form>

        {/* Results */}
        {loadingSearch ? (
          <Loader variant="grid" count={3} />
        ) : searchResults.length === 0 ? (
          <Card noHover className="text-center" style={{ padding: 'var(--space-6)' }}>
            <p style={{ color: 'var(--text-secondary)' }}>Search for communities to join.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
            {searchResults.map((c) => {
              // Check if already a member or pending request
              const isMember = myCommunities.some(my => my.id === c.id);
              
              return (
                <Card 
                  key={c.id} 
                  header={c.name}
                  headerAction={<Badge variant="info">{c.type}</Badge>}
                >
                  <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', minHeight: '40px', marginBottom: 'var(--space-4)' }}>
                    {c.description || 'No description provided.'}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-4)' }}>
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                      Created: {new Date(c.created_at).toLocaleDateString()}
                    </span>
                    {isMember ? (
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/communities/${c.id}`)}>
                        Go to Community
                      </Button>
                    ) : c.request_status === 'PENDING' ? (
                      <Badge variant="warning">Request Pending</Badge>
                    ) : c.request_status === 'REJECTED' ? (
                      <Badge variant="danger">Request Rejected</Badge>
                    ) : (
                      <Button 
                        id={`btn-join-${c.id}`}
                        variant="secondary" 
                        size="sm" 
                        loading={joiningId === c.id}
                        onClick={() => handleJoinRequest(c.id)}
                      >
                        Join
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
