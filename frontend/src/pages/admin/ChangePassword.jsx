import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiInstance from '../../utils/apiInstance';
import { toast, ToastContainer } from 'react-toastify';

const ChangePassword = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [oldPasswordError, setOldPasswordError] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const [oldPasswordVisible, setOldPasswordVisible] = useState(false);
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

  const validateOldPassword = (password) => {
    if (password.length < 5 || password.length > 12) {
      setOldPasswordError('Password must be between 5 to 12 characters');
    } else {
      setOldPasswordError('');
    }
  };
  const handlePasswordChange = (e) => {
    setOldPassword(e.target.value.trim());
    validateOldPassword(e.target.value.trim());
  }


  const validateNewPassword = (password) => {
    if (password.length < 5 || password.length > 12) {
      setNewPasswordError('New Password must be 5-12 characters');
    } else {
      setNewPasswordError('');
    }
  };
  const handleNewPasswordChange = (e) => {
    setNewPassword(e.target.value.trim());
    validateNewPassword(e.target.value.trim());
  }


  const validateConfirmPassword = (password) => {
    if (password !== newPassword) {
      setConfirmPasswordError('Confirm password mis-matches with new password');
    } else {
      setConfirmPasswordError('');
    }
  };
  const handleConfirmPasswordChange = (e) => {
    setConfirmPassword(e.target.value.trim());
    validateConfirmPassword(e.target.value.trim());
  }



  const reset = async (e) => {
    e.preventDefault();
    if (!newPassword || !oldPassword || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }


    setLoading(true);
    try {
      await apiInstance.put(`/updatePassword`, { oldPassword, newPassword });
      localStorage.setItem('resetpass', 'true');
      localStorage.removeItem('token');
      toast.success("Your password updated successfully");
      navigate("/", { state: { message: "Password updated successfully" } });

    } catch (error) {
      toast.error((error.response?.data?.message || 'An error has occurred, Please try again after some time.'));
    } finally {
      setLoading(false);
    }
  };

  const toggleOldPasswordVisibility = () => setOldPasswordVisible(!oldPasswordVisible);
  const toggleNewPasswordVisibility = () => setNewPasswordVisible(!newPasswordVisible);
  const toggleConfirmPasswordVisibility = () => setConfirmPasswordVisible(!confirmPasswordVisible);

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={2000}
        hideProgressBar={true}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      <div className="container-fluid ">
        <div className="row">
          <div className="col-12">
            <div className="card my-4">


              <div className='row'>
                <div className='col-sm-6 d-flex text-center content-center' >
                  <img src='/assets/img/forgot-password-reset-illustration-download-in-svg-png-gif-file-formats--restore-cyber-security-business-technology-pack-illustrations-5889578.png' alt='decorative-image' style={{ width: "100%", height: "auto", maxHeight: '400px', objectFit: 'contain' }} />
                </div>
                <div className="col-sm-6">
                  <form onSubmit={reset} className='mt-4 ' style={{ position: 'relative' }}>
                    {loading && (
                      <div
                        className="d-flex justify-content-center align-items-center"
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: "rgba(255, 255, 255, 0.7)",
                          zIndex: 1000,
                        }}
                      >
                        <div className="spinner-border text-info" role="status" style={{ width: '50px', height: '50px' }}>
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      </div>
                    )}
                    {/* Current Password */}
                    <div className="form-group mx-3 mb-3">
                      <label htmlFor="password">Current Password</label>
                      <div className="input-group" style={{ position: 'relative' }}>
                        <input
                          id="password"
                          type={oldPasswordVisible ? "text" : "password"}
                          className="form-control "
                          value={oldPassword}
                          onChange={handlePasswordChange}
                          required
                          maxLength={12}
                          style={{
                            paddingLeft: '10px',
                            color: 'white'
                          }}
                        />
                        <i
                          onClick={toggleOldPasswordVisibility}
                          className="material-icons"
                          style={{
                            position: "absolute",
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: '10',
                            cursor: 'pointer',
                            color: '#f91942',
                            fontSize: "20px"
                          }}
                        >
                          {oldPasswordVisible ? 'visibility' : 'visibility_off'}
                        </i>
                      </div>
                      {oldPasswordError && <div className='text-danger' style={{ fontSize: '13px' }}>{oldPasswordError}</div>}
                    </div>

                    {/* New Password */}
                    <div className="form-group mx-3 mb-2">
                      <label htmlFor="newPassword">New Password</label>
                      <div className="input-group" style={{ position: 'relative' }}>
                        <input
                          id="newPassword"
                          type={newPasswordVisible ? "text" : "password"}
                          className="form-control "
                          value={newPassword}
                          onChange={handleNewPasswordChange}
                          style={{
                            paddingLeft: '10px',
                            color: 'white'
                          }}
                          required
                          maxLength={12}
                        />
                        <i
                          onClick={toggleNewPasswordVisibility}
                          className="material-icons"
                          style={{
                            position: "absolute",
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: '10',
                            cursor: 'pointer',
                            color: '#f91942',
                            fontSize: "20px"
                          }}
                        >
                          {newPasswordVisible ? 'visibility' : 'visibility_off'}
                        </i>
                      </div>
                      {newPasswordError && <div className='text-danger' style={{ fontSize: '13px' }}>{newPasswordError}</div>}
                    </div>

                    {/* Confirm Password */}
                    <div className="form-group mx-3 mb-4">
                      <label htmlFor="confirmPassword">Confirm Password</label>
                      <div className="input-group" style={{ position: 'relative' }}>
                        <input
                          id="confirmPassword"
                          type={confirmPasswordVisible ? "text" : "password"}
                          className="form-control "
                          value={confirmPassword}
                          onChange={handleConfirmPasswordChange}
                          style={{
                            paddingLeft: '10px',
                            color: 'white'
                          }}
                          required
                          maxLength={12}
                        />
                        <i
                          onClick={toggleConfirmPasswordVisibility}
                          className="material-icons"
                          style={{
                            position: "absolute",
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: '10',
                            cursor: 'pointer',
                            color: '#f91942',
                            fontSize: "20px"
                          }}
                        >
                          {confirmPasswordVisible ? 'visibility' : 'visibility_off'}
                        </i>
                      </div>
                      {confirmPasswordError && <div className='text-danger' style={{ fontSize: '13px' }}>{confirmPasswordError}</div>}
                    </div>

                    <button type="submit" className="btn text-white mx-3" style={{ background: 'linear-gradient(90deg, #f91942, #ff4d6d)', border: 'none' }}>
                      Reset Password
                    </button>

                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChangePassword;