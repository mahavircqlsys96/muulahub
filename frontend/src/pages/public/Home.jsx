import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Accordion, Card, Button, Form } from 'react-bootstrap';
import axios from 'axios';

const Home = () => {
  const [activeFaq, setActiveFaq] = useState("0");
  const [aboutContent, setAboutContent] = useState('');
  
  // Contact Us state
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [status, setStatus] = useState({ loading: false, success: false, error: '' });

  useEffect(() => {
    const fetchAbout = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_IMAGE_BASE}mobile/getCms?type=about_us`);
        if (response.data && response.data.body) {
          setAboutContent(response.data.body.content || '');
        } else if (response.data && response.data.content) {
          setAboutContent(response.data.content);
        }
      } catch (error) {
        console.error('Failed to fetch About Us', error);
      }
    };
    fetchAbout();
  }, []);

  const handleContactChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, success: false, error: '' });
    try {
      await axios.post(`${import.meta.env.VITE_IMAGE_BASE}mobile/publicContactUs`, formData);
      setStatus({ loading: false, success: true, error: '' });
      setFormData({ name: '', email: '', phone: '', message: '' });
      setTimeout(() => setStatus(prev => ({ ...prev, success: false })), 5000);
    } catch (error) {
      setStatus({ 
        loading: false, 
        success: false, 
        error: error.response?.data?.message || 'Something went wrong. Please try again.' 
      });
    }
  };

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section text-center">
        <Container>
          <Row className="justify-content-center">
            <Col lg={8} md={10}>
              <h1 className="hero-title mb-4">
                Go Live. <span>Get Seen.</span><br />Get Hired.
              </h1>
              <p className="hero-subtitle mb-5">
                Where you collaborate and display your creative talent to<br />the right audience, all in one place.
              </p>
              <div className="d-flex justify-content-center gap-3 mb-5">
                <a href="#"><img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Google Play" className="app-store-btn" /></a>
                <a href="#"><img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" alt="App Store" className="app-store-btn" /></a>
              </div>
            </Col>
          </Row>
          
          <div className="hero-image-container mt-5">
             <img src="/landingPage1.png" alt="Muula App Screenshots" className="img-fluid" style={{ maxWidth: '800px' }} />
          </div>
        </Container>
      </section>

      {/* About Us Section */}
      <section className="py-5 mt-5">
        <Container>
          <Row className="align-items-center">
            <Col lg={6} className="mb-4 mb-lg-0">
               <img src="/landingPage1 (2).png" alt="About Muula" className="img-fluid rounded shadow-sm" />
            </Col>
            <Col lg={5} className="offset-lg-1">
              <h2 className="section-title">About Us</h2>
              <div 
                className="text-muted mb-4 cms-content" 
                style={{ lineHeight: '1.8', maxHeight: '300px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 8, WebkitBoxOrient: 'vertical' }}
                dangerouslySetInnerHTML={{ __html: aboutContent || 'Loading about us content...' }}
              />
              <Button href="/about" className="rounded-pill px-4" style={{ background: 'var(--grad-primary)', border: 'none' }}>Read More</Button>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Why Download Section */}
      <section className="py-5 bg-light mt-4">
        <Container className="py-4">
          <div className="text-center mb-5">
            <h2 className="section-title">Why Download Muula App?</h2>
            <p className="section-subtitle">Discover the features that make Muula the best app for creative talent</p>
          </div>
          
          <Row>
            <Col md={4} className="mb-4">
              <div className="feature-card h-100 p-4 bg-white rounded shadow-sm">
                <div className="feature-icon mb-3">
                  <i className="bi bi-search" style={{ color: '#f91942', fontSize: '2rem' }}></i>
                </div>
                <h5 className="fw-bold mb-3">Search</h5>
                <p className="text-muted mb-0">Easily find creative talents matching your project needs with our advanced search capabilities.</p>
              </div>
            </Col>
            <Col md={4} className="mb-4">
              <div className="feature-card h-100 p-4 bg-white rounded shadow-sm">
                <div className="feature-icon mb-3">
                  <i className="bi bi-calendar-check" style={{ color: '#f91942', fontSize: '2rem' }}></i>
                </div>
                <h5 className="fw-bold mb-3">Booking</h5>
                <p className="text-muted mb-0">Book talents directly through the app securely and manage all your appointments in one place.</p>
              </div>
            </Col>
            <Col md={4} className="mb-4">
              <div className="feature-card h-100 p-4 bg-white rounded shadow-sm">
                <div className="feature-icon mb-3">
                  <i className="bi bi-chat-video" style={{ color: '#f91942', fontSize: '2rem' }}></i>
                </div>
                <h5 className="fw-bold mb-3">Live Video</h5>
                <p className="text-muted mb-0">Host or join live video sessions to demonstrate skills or interview potential hires effortlessly.</p>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Testimonials */}
      <section className="py-5">
        <Container className="py-4 text-center">
          <div className="d-inline-block px-4 py-2 rounded-pill text-white mb-4 fw-semibold shadow-sm" style={{ background: '#f91942' }}>
            What Users Say About Us
          </div>
          <h2 className="section-title text-center mb-5">Don't just take our word for it, hear from our users</h2>
          
          <Row>
            {[1, 2, 3].map((item) => (
              <Col md={4} key={item}>
                <div className="testimonial-card text-start position-relative p-4 bg-white rounded shadow-sm border border-light">
                  <div className="d-flex text-warning mb-2">
                    <i className="bi bi-star-fill"></i>
                    <i className="bi bi-star-fill"></i>
                    <i className="bi bi-star-fill"></i>
                    <i className="bi bi-star-fill"></i>
                    <i className="bi bi-star-fill"></i>
                  </div>
                  <h6 className="fw-bold mt-3">Incredible Experience!</h6>
                  <p className="testimonial-text mt-3 mb-4 text-muted fst-italic">
                    "Muula has completely transformed how I find clients. Highly recommended for any creative professional looking to grow!"
                  </p>
                  <div className="d-flex align-items-center mt-auto">
                    <img src={`https://via.placeholder.com/50?text=U${item}`} alt="User" className="rounded-circle me-3" style={{ width: '45px', height: '45px', objectFit: 'cover' }} />
                    <div>
                      <h6 className="mb-0 fw-bold">Sarah Jenkins</h6>
                      <small className="text-muted">Makeup Artist</small>
                    </div>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* FAQ */}
      <section className="py-5 bg-light">
        <Container className="py-4">
          <div className="text-center mb-5">
             <h2 className="section-title">FREQUENTLY ASKED QUESTIONS</h2>
             <p className="section-subtitle mb-0">Find answers to the most common questions about Muula App.</p>
          </div>
          
          <Row className="justify-content-center">
            <Col md={8}>
              <Accordion activeKey={activeFaq} onSelect={(k) => setActiveFaq(k)} className="faq-accordion">
                <Accordion.Item eventKey="0" className="bg-transparent border-0 mb-3">
                  <Accordion.Header className="shadow-sm rounded bg-white">How do I create an account?</Accordion.Header>
                  <Accordion.Body className="bg-white rounded mt-1 shadow-sm text-muted">
                    Creating an account is simple. Download the app, click on "Sign Up", enter your email or phone number, and follow the verification steps. You can also sign up using your Google or Apple account.
                  </Accordion.Body>
                </Accordion.Item>
                <Accordion.Item eventKey="1" className="bg-transparent border-0 mb-3">
                  <Accordion.Header className="shadow-sm rounded bg-white">Is Muula App free to download?</Accordion.Header>
                  <Accordion.Body className="bg-white rounded mt-1 shadow-sm text-muted">
                    Yes, downloading the app is completely free. We also offer a free basic tier for users. Premium features are available through subscription plans.
                  </Accordion.Body>
                </Accordion.Item>
                <Accordion.Item eventKey="2" className="bg-transparent border-0 mb-3">
                  <Accordion.Header className="shadow-sm rounded bg-white">How secure is my payment information?</Accordion.Header>
                  <Accordion.Body className="bg-white rounded mt-1 shadow-sm text-muted">
                    We use industry-standard encryption and partner with leading payment processors to ensure your financial data is always secure. We do not store your credit card details directly on our servers.
                  </Accordion.Body>
                </Accordion.Item>
                <Accordion.Item eventKey="3" className="bg-transparent border-0 mb-3">
                  <Accordion.Header className="shadow-sm rounded bg-white">Can I switch my profile from user to provider?</Accordion.Header>
                  <Accordion.Body className="bg-white rounded mt-1 shadow-sm text-muted">
                    Yes, you can easily toggle between a normal user profile and a provider profile from your account settings menu in the app.
                  </Accordion.Body>
                </Accordion.Item>
              </Accordion>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Contact Us Section */}
      <section className="py-5" style={{ backgroundColor: '#ffffff' }}>
        <Container className="py-4">
          <Row className="g-5 align-items-start">
            <Col lg={5}>
              <h2 className="fw-bold mb-3">Contact Us</h2>
              <p className="text-muted mb-5" style={{ fontSize: '15px', lineHeight: '1.8' }}>
                For any inquiries, please reach out to us. We are always here to help you. Fill out the form or use the contact details below.
              </p>

              <div className="d-flex align-items-center gap-3 mb-4">
                <div className="d-flex align-items-center justify-content-center rounded-circle" style={{ width: '45px', height: '45px', backgroundColor: 'rgba(249,25,66,0.1)' }}>
                  <i className="bi bi-telephone" style={{ color: '#f91942', fontSize: '18px' }}></i>
                </div>
                <div>
                  <h6 className="fw-bold mb-1" style={{ fontSize: '14px' }}>Phone Number</h6>
                  <p className="text-muted mb-0" style={{ fontSize: '13px' }}>03 1245 1234</p>
                </div>
              </div>
              
              <div className="d-flex align-items-center gap-3 mb-4">
                <div className="d-flex align-items-center justify-content-center rounded-circle" style={{ width: '45px', height: '45px', backgroundColor: 'rgba(249,25,66,0.1)' }}>
                  <i className="bi bi-printer" style={{ color: '#f91942', fontSize: '18px' }}></i>
                </div>
                <div>
                  <h6 className="fw-bold mb-1" style={{ fontSize: '14px' }}>Fax</h6>
                  <p className="text-muted mb-0" style={{ fontSize: '13px' }}>03 1245 1234</p>
                </div>
              </div>

              <div className="d-flex align-items-center gap-3 mb-4">
                <div className="d-flex align-items-center justify-content-center rounded-circle" style={{ width: '45px', height: '45px', backgroundColor: 'rgba(249,25,66,0.1)' }}>
                  <i className="bi bi-envelope" style={{ color: '#f91942', fontSize: '18px' }}></i>
                </div>
                <div>
                  <h6 className="fw-bold mb-1" style={{ fontSize: '14px' }}>Email Address</h6>
                  <p className="text-muted mb-0" style={{ fontSize: '13px' }}>info@muula.com</p>
                </div>
              </div>
            </Col>
            
            <Col lg={6} className="offset-lg-1">
              <div className="bg-white p-4 rounded shadow-sm border border-light">
                {status.success && (
                  <div className="alert alert-success">Your message has been sent successfully!</div>
                )}
                {status.error && (
                  <div className="alert alert-danger">{status.error}</div>
                )}
                <Form onSubmit={handleContactSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Control 
                      type="text" 
                      name="name"
                      placeholder="Name" 
                      required 
                      className="bg-light border-0 py-3 px-3"
                      value={formData.name}
                      onChange={handleContactChange}
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Control 
                      type="email" 
                      name="email"
                      placeholder="Email Address" 
                      required
                      className="bg-light border-0 py-3 px-3"
                      value={formData.email}
                      onChange={handleContactChange}
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Control 
                      type="tel" 
                      name="phone"
                      placeholder="Phone Number" 
                      required
                      className="bg-light border-0 py-3 px-3"
                      value={formData.phone}
                      onChange={handleContactChange}
                    />
                  </Form.Group>
                  <Form.Group className="mb-4">
                    <Form.Control 
                      as="textarea" 
                      rows={5} 
                      name="message"
                      placeholder="Message" 
                      required
                      className="bg-light border-0 py-3 px-3"
                      value={formData.message}
                      onChange={handleContactChange}
                    />
                  </Form.Group>
                  <Button 
                    type="submit" 
                    className="w-100 py-3 text-white fw-semibold" 
                    style={{ background: '#f91942', border: 'none', borderRadius: '8px' }}
                    disabled={status.loading}
                  >
                    {status.loading ? 'SENDING...' : 'Send Message'}
                  </Button>
                </Form>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

    </div>
  );
};

export default Home;
