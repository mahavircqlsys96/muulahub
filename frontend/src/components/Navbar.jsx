import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { imageBaseUrl } from "../utils/apiInstance";
import Swal from "sweetalert2";
import { jwtDecode } from "jwt-decode";
import "./Navbar.css";
import { useSelector, useDispatch } from "react-redux";
import { get_user_by_id } from "../utils/thunkApis";

const Navbar = ({ toggleSidebar, closeSidebar, windowWidth }) => {

  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const user = useSelector((state) => state.users.user);
  const token = localStorage.getItem("token");

  // ❌ REMOVE THIS
  // const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // ✅ fetch user
  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!token) return;

      try {
        const decode = jwtDecode(token);
        const id = decode?.data?.id;
        await dispatch(get_user_by_id(id));
      } catch (error) {}
    };

    fetchUserDetails();
  }, [dispatch, token]);

  // ✅ dropdown close outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const logout = async () => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You will be logged out of your account.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ff7a1a",
      cancelButtonColor: "#ed2121",
      confirmButtonText: "Yes, log out!",
    });

    if (result.isConfirmed) {
      localStorage.removeItem("token");
      localStorage.setItem("logoutmessage", "true");
      navigate("/");
      setDropdownOpen(false);
    }
  };

  const pathToTitleMap = {
    "/dashboard": "Dashboard",
    "/usersList": "Users",
    "/usersView": "User Details",
    "/providers": "Providers",
    "/categories": "Service Categories",
    "/services": "Services",
    "/bookings": "Bookings",
    "/payments": "Payments",
    "/withdrawals": "Withdrawals",
    "/posts": "Posts",
    "/reports": "Reports",
    "/notifications": "Notifications",
    "/contactUs": "Support Tickets",
    "/privacypolicy": "Privacy Policy",
    "/aboutus": "About Us",
    "/terms&conditions": "Terms & Conditions",
    "/profile": "Profile",
    "/changepassword": "Change Password",
  };

  const currentPath = location.pathname;

  const currentTitle =
    pathToTitleMap[currentPath] ||
    (currentPath.startsWith("/usersView")
      ? "User Details"
      : currentPath.startsWith("/providers/")
      ? "Provider Details"
      : currentPath.startsWith("/bookings/")
      ? "Booking Details"
      : currentPath.startsWith("/viewContactUs")
      ? "Support Ticket"
      : "");

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

  const handleLinkClick = () => {
    closeSidebar();
    setDropdownOpen(false);
  };

  return (
    <nav className="parkez-navbar navbar navbar-main navbar-expand-lg px-0 mx-4 mt-3 border-radius-xl position-sticky top-0" style={{ zIndex: 100 }}>
      <div className="container-fluid d-flex justify-content-between align-items-center">

        <div className="d-flex align-items-center">
          <button
            onClick={toggleSidebar}
            className="navbar-toggler d-flex align-items-center justify-content-center p-2 me-2"
            type="button"
            style={{ 
              border: "none", 
              background: "rgba(255,255,255,0.1)", 
              borderRadius: "8px",
              cursor: "pointer",
              color: "inherit"
            }}
          >
            <i className="material-icons" style={{ fontSize: "28px" }}>menu</i>
          </button>

          <h2 className="font-weight-bolder mb-0 ms-1">
            {currentTitle}
          </h2>
        </div>

        <ul className="navbar-nav navbar-right d-flex align-items-center">
          <li className="d-flex align-items-center ms-auto position-relative">

            <h6 className="mb-0 me-2">
              {user?.name}
            </h6>

            <div className="dropdown" ref={dropdownRef}>
              <button
                type="button"
                onClick={toggleDropdown}
                className="nav-link d-flex align-items-center"
                style={{ background: "none", border: "none" }}
              >
                <img
                  alt="profile"
                  src={
                    user?.profile_picture || user?.profileImage
                      ? `${imageBaseUrl}${user.profile_picture || user.profileImage}`
                      : "/user.png"
                  }
                  style={{
                    height: "50px",
                    width: "50px",
                    cursor: "pointer",
                    objectFit: "cover",
                  }}
                  className="rounded-circle"
                />
              </button>

              {dropdownOpen && (
                <div className="dropdown-menu dropdown-menu-end show">
                  <Link to="/profile" className="dropdown-item" onClick={handleLinkClick}>
                    Profile
                  </Link>

                  <Link to="/changepassword" className="dropdown-item" onClick={handleLinkClick}>
                    Change Password
                  </Link>

                  <button onClick={logout} className="dropdown-item text-danger">
                    Logout
                  </button>
                </div>
              )}

            </div>
          </li>
        </ul>

      </div>
    </nav>
  );
};

export default Navbar;