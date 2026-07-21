import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div 
      className="not-found-page" 
      style={{
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '80vh',
        padding: 'var(--space-6)'
      }}
    >
      <Card noHover className="text-center" style={{ maxWidth: '480px', padding: 'var(--space-10)' }}>
        <h1 
          style={{ 
            fontSize: '6rem', 
            fontWeight: 900, 
            background: 'var(--gradient-primary)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent',
            lineHeight: 1,
            marginBottom: 'var(--space-4)'
          }}
        >
          404
        </h1>
        <h3 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--space-3)' }}>
          Page Not Found
        </h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)', fontSize: 'var(--font-size-sm)' }}>
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>
        <Button id="btn-404-home" onClick={() => navigate('/dashboard')} style={{ margin: '0 auto' }}>
          Back to Dashboard
        </Button>
      </Card>
    </div>
  );
}
