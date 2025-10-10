import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useForm } from '../hooks/useCustomHooks';
import '../styles/Login.css';

const Login = () => {
  const { signIn, loading: isLoading, error: authError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const validate = (values) => {
    const errors = {};
    if (!values.username?.trim()) errors.username = 'Username is required';
    if (!values.password) {
      errors.password = 'Password is required';
    } else if (values.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    return errors;
  };

  const {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit
  } = useForm(
    { username: '', password: '' },
    validate
  );

 const handleLogin = async (formValues) => {
  try {
    const user = await signIn(formValues.username, formValues.password);
    if (user.role !== 'ADMIN') {
      throw new Error('Only admin users can access this dashboard');
    }
    navigate('/dashboard'); // ✅ Ensure this matches your Route
  } catch (err) {
    console.error('Login failed:', err);
  }
};


  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  return (
    <div className="login-container">
      <div className="login-form-wrapper">
        <h1 className="login-title">Security Dashboard</h1>
        <p className="login-subtitle">Login to access the incident management system</p>
        
        {authError && (
          <div className="alert">
            {authError}
          </div>
        )}
        
        <form className="login-form" onSubmit={handleSubmit(handleLogin)}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              name="username"
              className={`form-control ${touched.username && errors.username ? 'is-invalid' : ''}`}
              placeholder="Enter your username"
              value={values.username}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isLoading}
              autoComplete="username"
            />
            {touched.username && errors.username && (
              <div className="invalid-feedback">{errors.username}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                className={`form-control ${touched.password && errors.password ? 'is-invalid' : ''}`}
                placeholder="Enter your password"
                value={values.password}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={togglePasswordVisibility}
                tabIndex="-1"
              >
                <i className="material-icons">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </i>
              </button>
            </div>
            {touched.password && errors.password && (
              <div className="invalid-feedback">{errors.password}</div>
            )}
          </div>

          <div className="form-group">
            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={isLoading || isSubmitting}
            >
              {isLoading ? (
                <>
                  <div className="spinner-border" role="status" />
                  <span>Signing in...</span>
                </>
              ) : 'Login'}
            </button>
          </div>

          <div className="login-footer">
            <a href="#" className="forgot-password-link">
              Forgot Password?
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
