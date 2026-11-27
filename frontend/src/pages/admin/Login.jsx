import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setUser } from '../../utils/redux/slices/user-slice';
import './Login.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'animate.css';
import apiInstance from '../../utils/apiInstance';
import '@fortawesome/fontawesome-free/css/all.min.css';

const LoadingOverlay = ({ loading }) => (
  loading ? (
    <div className="loader" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: '100' }}>
      <div className="spinner-border text-info" role="status" style={{ width: '50px', height: '50px' }}>
        <span className="visually-hidden">Loading...</span>
      </div>
    </div>
  ) : null
);

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const isSubAdmin = location.pathname.startsWith('/subadmin');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) navigate('/dashboard');
  }, [navigate]);

  const sessionexpired = localStorage.getItem('sessionexpired');
  const logoutmessage = localStorage.getItem('logoutmessage');
  const resetpass = localStorage.getItem('resetpass');
  const accountBlocked = localStorage.getItem('account_blocked');
  useEffect(() => {
    if (logoutmessage) {
      toast.success('Logout successfully');
      localStorage.removeItem('logoutmessage');
    } else if (resetpass) {
      toast.success('Password reset successful');
      localStorage.removeItem('resetpass');
    } else if (sessionexpired) {
      toast.error('Your session has expired. Please log in again to continue.');
      localStorage.removeItem('sessionexpired');
    } else if (accountBlocked) {
      toast.error('Your account has been blocked.Please contact to admin.');
      localStorage.removeItem('account_blocked');
    }
  }, [sessionexpired, logoutmessage, resetpass]);


  const validateEmail = (val) => {
    if (!val || val.trim().length === 0) {
      setEmailError('Please enter email or username');
    } else if (val.includes('@')) {
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      setEmailError(!regex.test(val) ? 'Invalid email format' : '');
    } else if (val.trim().length < 3) {
      setEmailError('Username must be at least 3 characters');
    } else {
      setEmailError('');
    }
  };

  const validatePassword = (password) => {
    setPasswordError(password.length < 5 || password.length > 12
      ? 'Password must be between 5 to 12 characters'
      : '');
  }

  const handleChangeEmail = (e) => {
    const value = e.target.value.trim();
    setEmail(value);
    validateEmail(value);
  };

  const handleChangePassword = (e) => {
    const value = e.target.value.trim();
    setPassword(value);
    validatePassword(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!emailError && !passwordError) {
      setLoading(true);
      try {
        const res = await apiInstance.post('/login', {
          email,
          password,
          portalType: isSubAdmin ? 'subadmin' : 'superadmin'
        });
        const { token, user } = res.data?.body || {};
        if (token) {
          localStorage.setItem('token', token);
          if (user) {
            localStorage.setItem('user', JSON.stringify(user));
            dispatch(setUser(user));
          }
          localStorage.setItem('loginmessage', 'true');

          // Determine landing page according to granted permissions
          const userPerms = Array.isArray(user?.permissions) ? user.permissions : [];
          const isSub = Boolean(user?.isSubAdmin);

          let targetPath = '/dashboard';
          if (isSub && !userPerms.includes('*') && !userPerms.includes('dashboard:view')) {
            if (userPerms.some(p => p.startsWith('users:'))) targetPath = '/usersList';
            else if (userPerms.some(p => p.startsWith('categories:'))) targetPath = '/categories';
            else if (userPerms.some(p => p.startsWith('bookings:'))) targetPath = '/bookings';
            else if (userPerms.some(p => p.startsWith('payments:'))) targetPath = '/payments';
            else if (userPerms.some(p => p.startsWith('withdrawals:'))) targetPath = '/withdrawals';
            else if (userPerms.some(p => p.startsWith('wallets:'))) targetPath = '/wallets';
            else if (userPerms.some(p => p.startsWith('posts:'))) targetPath = '/posts';
            else if (userPerms.some(p => p.startsWith('reports:'))) targetPath = '/reports';
            else if (userPerms.some(p => p.startsWith('notifications:'))) targetPath = '/notifications';
            else if (userPerms.some(p => p.startsWith('support:'))) targetPath = '/contactUs';
            else if (userPerms.some(p => p.startsWith('cms:'))) targetPath = '/cms/about-us';
          }

          navigate(targetPath);
        } else {
          toast.error(res.data?.message || "Login failed");
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'An error occurred while logging in. Please try again');
      } finally {
        setLoading(false);
      }
    } else {
      if (emailError) {
        toast.error(emailError);
      } else if (passwordError) {
        toast.error(passwordError)
      }
    };
  }

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar
        closeOnClick
        draggable
        pauseOnHover
      />
      <div className="parkez-auth-page bg-gray-200">
        <main className="main-content mt-0">
          <div
            className="page-header align-items-start min-vh-100"
            style={{
              backgroundImage: "url('/loginBackground.jpg')",
              position: 'relative'
            }}
          >
            {/* Distinct theme mask based on portal */}
            <span
              className="mask opacity-8"
              style={{
                background: isSubAdmin
                  ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.94) 0%, rgba(30, 27, 75, 0.95) 50%, rgba(15, 23, 42, 0.98) 100%)'
                  : 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(45, 10, 20, 0.96) 50%, rgba(15, 23, 42, 0.98) 100%)'
              }}
            ></span>

            <div className="container my-auto" style={{ zIndex: 10 }}>
              <div className="row">
                <div className="col-lg-4 col-md-8 col-12 mx-auto parkez-auth-card">
                  <div
                    className="card z-index-0 fadeIn3 fadeInBottom"
                    style={{
                      borderRadius: '20px',
                      overflow: 'hidden',
                      boxShadow: isSubAdmin
                        ? '0 25px 50px -12px rgba(99, 102, 241, 0.35)'
                        : '0 25px 50px -12px rgba(249, 25, 66, 0.35)',
                      border: isSubAdmin
                        ? '1px solid rgba(99, 102, 241, 0.3)'
                        : '1px solid rgba(249, 25, 66, 0.3)'
                    }}
                  >
                    {/* Color-coded Header Card */}
                    <div className="card-headers p-0 mt-n4 mx-3 z-index-2">
                      <div
                        className="shadow-dark border-radius-lg py-4 pe-1 mt-4"
                        style={{
                          background: isSubAdmin
                            ? 'linear-gradient(135deg, #312e81 0%, #4338ca 50%, #6366f1 100%)'
                            : 'linear-gradient(135deg, #4c0519 0%, #881337 50%, #f91942 100%)',
                          boxShadow: isSubAdmin
                            ? '0 10px 25px -5px rgba(99, 102, 241, 0.45)'
                            : '0 10px 25px -5px rgba(249, 25, 66, 0.45)',
                          borderRadius: '16px'
                        }}
                      >
                        <div className='text-center'>
                          <div
                            style={{
                              background: '#ffffff',
                              borderRadius: '16px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '8px 16px',
                              boxShadow: '0 4px 14px rgba(0,0,0,0.15)'
                            }}
                          >
                            <img
                              src='/logo-muulahub.png'
                              alt='Muulahub'
                              style={{ height: "42px", width: "auto", objectFit: "contain" }}
                            />
                          </div>

                          <div className="mt-3">
                            <span
                              style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.22)',
                                color: '#ffffff',
                                border: '1px solid rgba(255, 255, 255, 0.35)',
                                padding: '5px 14px',
                                borderRadius: '20px',
                                fontSize: '11px',
                                fontWeight: '700',
                                letterSpacing: '1px',
                                textTransform: 'uppercase',
                                display: 'inline-block'
                              }}
                            >
                              {isSubAdmin ? '👥 Sub-Admin Team Portal' : '🛡️ Super Admin Console'}
                            </span>
                          </div>

                          <h5 className="text-white mt-2 mb-0 font-weight-bold" style={{ fontSize: '18px' }}>
                            {isSubAdmin ? 'Sub-Admin Sign In' : 'Master Administrator Sign In'}
                          </h5>

                          <p className="text-xs text-white opacity-8 mb-0 mt-1 px-3">
                            {isSubAdmin
                              ? 'Authorized team access for assigned department modules'
                              : 'Master system controls, settings, and governance'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="card-body px-4 pb-4 pt-3">
                      <form onSubmit={handleSubmit} className="text-start">
                        <div className="mb-3">
                          <label
                            style={{
                              fontSize: '12px',
                              fontWeight: '600',
                              color: '#475569',
                              marginBottom: '6px',
                              display: 'block'
                            }}
                          >
                            {isSubAdmin ? 'Team Username or Email' : 'Super Admin Email'}
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            value={email}
                            onChange={handleChangeEmail}
                            required
                            placeholder={isSubAdmin ? "e.g. ops_sarah or sarah@muulahub.com" : "e.g. admin@muulahub.com"}
                            autoComplete="off"
                            style={{
                              borderRadius: '10px',
                              padding: '11px 14px',
                              border: '1px solid #cbd5e1',
                              fontSize: '14px'
                            }}
                          />
                          {emailError && <small className="text-danger">{emailError}</small>}
                        </div>

                        <div className="mb-3">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <label
                              style={{
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#475569',
                                margin: 0
                              }}
                            >
                              Password
                            </label>
                            <Link to="/forgot-password" className="text-secondary text-xs">
                              Forgot password?
                            </Link>
                          </div>
                          <div className="position-relative">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              className="form-control"
                              value={password}
                              onChange={handleChangePassword}
                              required
                              placeholder="••••••••••••"
                              autoComplete="off"
                              maxLength={12}
                              style={{
                                borderRadius: '10px',
                                padding: '11px 14px',
                                border: '1px solid #cbd5e1',
                                fontSize: '14px'
                              }}
                            />
                            <i
                              onClick={() => setShowPassword(!showPassword)}
                              className={`fas ${showPassword ? 'fa-eye' : 'fa-eye-slash'}`}
                              style={{
                                position: "absolute",
                                right: '12px',
                                top: '14px',
                                cursor: 'pointer',
                                zIndex: '10',
                                color: isSubAdmin ? '#6366f1' : '#f91942',
                                fontSize: "14px"
                              }}
                            />
                          </div>
                          {passwordError && <small className="text-danger">{passwordError}</small>}
                        </div>

                        <div className="text-center mt-4">
                          <button
                            type="submit"
                            className="btn py-2 text-white w-100 mb-2"
                            style={{
                              background: isSubAdmin
                                ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
                                : 'linear-gradient(135deg, #f91942 0%, #be123c 100%)',
                              border: 'none',
                              borderRadius: '10px',
                              padding: '12px',
                              fontSize: '14px',
                              fontWeight: '700',
                              letterSpacing: '0.3px',
                              boxShadow: isSubAdmin
                                ? '0 4px 14px rgba(79, 70, 229, 0.4)'
                                : '0 4px 14px rgba(249, 25, 66, 0.4)',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            {isSubAdmin ? 'Sign In to Sub-Admin Panel' : 'Sign In to Super Admin Panel'}
                          </button>
                        </div>

                        {/* Portal Switcher Callout */}
                        <div
                          style={{
                            marginTop: '16px',
                            padding: '10px 14px',
                            background: isSubAdmin ? '#f8fafc' : '#fef2f2',
                            borderRadius: '10px',
                            border: isSubAdmin ? '1px solid #e2e8f0' : '1px solid #fee2e2',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '6px'
                          }}
                        >
                          <span style={{ fontSize: '12px', color: '#64748b' }}>
                            {isSubAdmin ? 'Master Administrator?' : 'Staff / Team Sub-Admin?'}
                          </span>
                          <Link
                            to={isSubAdmin ? "/" : "/subadmin"}
                            style={{
                              fontSize: '12px',
                              fontWeight: '700',
                              color: isSubAdmin ? '#f91942' : '#4f46e5',
                              textDecoration: 'none'
                            }}
                          >
                            {isSubAdmin ? 'Super Admin Portal →' : 'Sub-Admin Portal →'}
                          </Link>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
      <LoadingOverlay loading={loading} />
    </>
  );
};

export default React.memo(Login);
