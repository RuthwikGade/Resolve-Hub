import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="landing-page" style={{ 
      minHeight: '100vh', 
      background: 'var(--bg-primary)', 
      color: 'var(--text-primary)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Glows */}
      <div className="auth-bg" />

      {/* Navigation Header */}
      <header style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 'var(--space-6) var(--space-8)',
        maxWidth: '1200px',
        margin: '0 auto',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--gradient-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: 'var(--font-size-lg)',
            color: '#fff'
          }}>R</div>
          <span style={{
            fontSize: 'var(--font-size-xl)',
            fontWeight: 700,
            background: 'var(--gradient-primary)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>ResolveHub</span>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
          {isAuthenticated ? (
            <Link to="/dashboard">
              <Button size="md">Go to Dashboard</Button>
            </Link>
          ) : (
            <>
              <Link to="/login">
                <Button variant="secondary" size="md">Sign In</Button>
              </Link>
              <Link to="/register">
                <Button size="md">Get Started</Button>
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section style={{
        position: 'relative',
        zIndex: 10,
        maxWidth: '1000px',
        margin: '0 auto',
        padding: 'clamp(8rem, 20vh, 14rem) var(--space-6) var(--space-12) var(--space-6)',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: 'clamp(3rem, 7vw, 5rem)',
          fontWeight: 900,
          lineHeight: 1.1,
          letterSpacing: '-0.03em',
          marginBottom: 'var(--space-2)'
        }}>
          ResolveHub
        </h1>

        <h2 style={{
          fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)',
          fontWeight: 700,
          background: 'var(--gradient-primary)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: 'var(--space-6)'
        }}>
          A Community Problem Solver
        </h2>

        <p style={{
          fontSize: 'var(--font-size-md)',
          color: 'var(--text-secondary)',
          maxWidth: '600px',
          margin: '0 auto var(--space-8) auto',
          lineHeight: 1.6
        }}>
          ResolveHub is a centralized platform built to simplify community complaint reporting and maintenance coordination. It connects residents and staff to resolve neighborhood issues efficiently and transparently.
        </p>

        <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center' }}>
          {isAuthenticated ? (
            <Link to="/dashboard">
              <Button size="lg">Go to Dashboard ➜</Button>
            </Link>
          ) : (
            <>
              <Link to="/register">
                <Button size="lg">Get Started</Button>
              </Link>
              <Link to="/login">
                <Button variant="secondary" size="lg">Sign In</Button>
              </Link>
            </>
          )}
        </div>
      </section>



      {/* Footer */}
      <footer style={{
        position: 'relative',
        zIndex: 10,
        textAlign: 'center',
        padding: 'var(--space-8) var(--space-4)',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        color: 'var(--text-muted)',
        fontSize: 'var(--font-size-xs)'
      }}>
        <p>&copy; 2026 ResolveHub. All rights reserved.</p>
      </footer>
    </div>
  );
}
