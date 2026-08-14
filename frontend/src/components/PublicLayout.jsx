import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Container, Nav, Navbar } from 'react-bootstrap';
import '../styles/public.css';

const PublicLayout = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div className="public-layout">
      <Navbar bg="white" expand="lg" className="py-3 sticky-top public-navbar" style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <Container>
          <Navbar.Brand as={Link} to="/home" className="d-flex align-items-center fw-bold fs-4 text-dark">
            <img 
               src="/logo-muulahub.png" 
               alt="Muula" 
               height="40" 
               className="me-2" 
               onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/40?text=Logo"; }}
            />
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="mx-auto fw-semibold" style={{ fontSize: '13px' }}>
              <Nav.Link as={Link} to="/home" className={currentPath === '/home' ? 'text-primary' : 'text-dark'}>HOME</Nav.Link>
              <Nav.Link as={Link} to="/about" className={currentPath === '/about' ? 'text-primary' : 'text-dark'}>ABOUT US</Nav.Link>
              <Nav.Link as={Link} to="/terms" className={currentPath === '/terms' ? 'text-primary' : 'text-dark'}>TERMS & CONDITIONS</Nav.Link>
              <Nav.Link as={Link} to="/privacy" className={currentPath === '/privacy' ? 'text-primary' : 'text-dark'}>PRIVACY POLICY</Nav.Link>
              <Nav.Link as={Link} to="/contact" className={currentPath === '/contact' ? 'text-primary' : 'text-dark'}>CONTACT US</Nav.Link>
            </Nav>
            <Link to="/home" className="btn text-white rounded-pill px-4 py-2 fw-semibold shadow-sm" style={{ background: 'var(--grad-primary)', border: 'none', fontSize: '14px' }}>Download App</Link>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <main className="public-main-content" style={{ minHeight: '60vh', backgroundColor: '#fdfdfd' }}>
        <Outlet />
      </main>

      <footer className="public-footer pt-5 pb-3 text-white" style={{ backgroundColor: '#ed345d' }}>
        <Container>
          <div className="row mb-4">
            <div className="col-lg-4 mb-4">
              <img 
                src="/logo-muulahub.png" 
                alt="Muula" 
                height="50" 
                className="mb-3 bg-white p-1 rounded-circle" 
                onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/50?text=M"; }}
              />
              <p className="text-white-50 mt-3" style={{ fontSize: '14px', lineHeight: '1.8' }}>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Viverra nunc ante velit vitae. Est tellus vitae, nullam lobortis enim.
              </p>
              <div className="d-flex gap-4 mt-4">
                <a href="#" className="text-white text-decoration-none"><i className="bi bi-facebook fs-5"></i></a>
                <a href="#" className="text-white text-decoration-none"><i className="bi bi-instagram fs-5"></i></a>
                <a href="#" className="text-white text-decoration-none"><i className="bi bi-twitter fs-5"></i></a>
                <a href="#" className="text-white text-decoration-none"><i className="bi bi-youtube fs-5"></i></a>
              </div>
            </div>
            
            <div className="col-lg-2 offset-lg-1 mb-4">
              <h6 className="fw-bold mb-4">QUICK LINK</h6>
              <ul className="list-unstyled d-flex flex-column gap-3" style={{ fontSize: '14px' }}>
                <li><Link to="/about" className="text-white text-decoration-none opacity-75">About</Link></li>
                <li><Link to="/terms" className="text-white text-decoration-none opacity-75">Terms & Conditions</Link></li>
                <li><Link to="/privacy" className="text-white text-decoration-none opacity-75">Privacy Policy</Link></li>
                <li><Link to="/contact" className="text-white text-decoration-none opacity-75">Contact Us</Link></li>
              </ul>
            </div>
            
            <div className="col-lg-4 offset-lg-1 mb-4">
              <h6 className="fw-bold mb-4">NEWS LETTER</h6>
              <p className="text-white-50 mb-3" style={{ fontSize: '14px' }}>Subscribe our newsletter to get our latest update & news</p>
              <form className="d-flex bg-white rounded overflow-hidden" onSubmit={(e) => e.preventDefault()}>
                <input type="email" className="form-control border-0 px-3 shadow-none" placeholder="Your email address" style={{ height: '48px', fontSize: '14px' }} />
                <button type="submit" className="btn px-4 rounded-0 d-flex align-items-center justify-content-center" style={{ background: '#d81537', color: '#fff', border: 'none' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11ZM6.636 10.07l2.761 4.338L14.13 2.576 6.636 10.07Zm6.787-8.201L1.591 6.602l4.339 2.76 7.494-7.493Z"/>
                  </svg>
                </button>
              </form>
            </div>
          </div>
          
          <div className="border-top pt-4 mt-2 text-center" style={{ borderColor: 'rgba(255,255,255,0.2) !important' }}>
            <p className="mb-0 text-white-50" style={{ fontSize: '14px' }}>&copy; Copyright 2026 Muula. All Right Reserved.</p>
          </div>
        </Container>
      </footer>
    </div>
  );
};

export default PublicLayout;
