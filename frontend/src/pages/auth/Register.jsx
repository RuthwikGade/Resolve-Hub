import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import Button from '../../components/ui/Button';

export default function Register() {
  const { register } = useAuth();
  const { addToast } = useNotifications();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email format';
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 6) errs.password = 'Password must be at least 6 characters';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await register({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      addToast('Account created successfully!', 'success');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.message || 'Registration failed.';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="auth-bg" />
      <div className="auth-container">
        <div className="auth-card">
          {/* Logo */}
          <div className="auth-logo">
            <div className="auth-logo-icon">R</div>
            <span className="auth-logo-text">ResolveHub</span>
          </div>

          <h2 className="auth-heading">Create Account</h2>
          <p className="auth-subheading">Join your community and start resolving issues</p>

          <form id="register-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="register-name" className="form-label">Full Name</label>
              <input
                id="register-name"
                name="name"
                type="text"
                className="form-input"
                placeholder="John Doe"
                value={form.name}
                onChange={handleChange}
              />
              {errors.name && <div className="form-error">{errors.name}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="register-email" className="form-label">Email</label>
              <input
                id="register-email"
                name="email"
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
              />
              {errors.email && <div className="form-error">{errors.email}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="register-phone" className="form-label">Phone (optional)</label>
              <input
                id="register-phone"
                name="phone"
                type="tel"
                className="form-input"
                placeholder="+1 234 567 8900"
                value={form.phone}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="register-password" className="form-label">Password</label>
              <input
                id="register-password"
                name="password"
                type="password"
                className="form-input"
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={handleChange}
              />
              {errors.password && <div className="form-error">{errors.password}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="register-confirm" className="form-label">Confirm Password</label>
              <input
                id="register-confirm"
                name="confirmPassword"
                type="password"
                className="form-input"
                placeholder="Repeat password"
                value={form.confirmPassword}
                onChange={handleChange}
              />
              {errors.confirmPassword && <div className="form-error">{errors.confirmPassword}</div>}
            </div>

            <Button
              id="register-submit"
              type="submit"
              loading={loading}
              size="lg"
              style={{ width: '100%', marginTop: 'var(--space-2)' }}
            >
              Create Account
            </Button>
          </form>

          <div className="auth-footer">
            Already have an account?{' '}
            <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </>
  );
}
