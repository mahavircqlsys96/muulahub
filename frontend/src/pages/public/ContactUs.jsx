import React, { useState } from 'react';
import { Container, Row, Col, Form, Button } from 'react-bootstrap';
import axios from 'axios';

const ContactUs = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  
  const [status, setStatus] = useState({ loading: false, success: false, error: '' });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, success: false, error: '' });
    
    try {
      // POST to backend api
      await axios.post(`${import.meta.env.VITE_IMAGE_BASE}mobile/publicContactUs`, formData);
      setStatus({ loading: false, success: true, error: '' });
      setFormData({ name: '', email: '', phone: '', message: '' });
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => setStatus(prev => ({ ...prev, success: false })), 5000);
    } catch (error) {
      console.error('Failed to submit contact form', error);
      setStatus({ 
        loading: false, 
        success: false, 
        error: error.response?.data?.message || 'Something went wrong. Please try again.' 
      });
    }
  };

  return (
    <div className="public-page-container bg-white">
      <div className="page-header py-5 bg-light text-center mb-5">
        <Container>
          <h1 className="fw-bold text-uppercase" style={{ letterSpacing: '2px', color: '#1a1a1a' }}>
            Contact Us
          </h1>
        </Container>
      </div>

      <Container className="py-4 mb-5">
        <Row className="g-5 align-items-center">
          <Col lg={5}>
            <h2 className="fw-bold display-5 mb-3">
              Get in <span style={{ color: '#f91942' }}>Touch</span>
            </h2>
            <p className="text-muted mb-5" style={{ fontSize: '15px', lineHeight: '1.8' }}>
              Enim tempor eget pharetra facilisis sed maecenas adipiscing. Eu leo molestie vel, ornare non id blandit netus.
            </p>

            {status.success && (
              <div className="alert alert-success">Your message has been sent successfully!</div>
            )}
            
            {status.error && (
              <div className="alert alert-danger">{status.error}</div>
            )}

            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-4">
                <Form.Control 
                  type="text" 
                  name="name"
                  placeholder="Name *" 
                  required 
                  className="form-control-custom"
                  value={formData.name}
                  onChange={handleChange}
                />
              </Form.Group>
              
              <Form.Group className="mb-4">
                <Form.Control 
                  type="email" 
                  name="email"
                  placeholder="Email" 
                  className="form-control-custom"
                  value={formData.email}
                  onChange={handleChange}
                />
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Control 
                  type="tel" 
                  name="phone"
                  placeholder="Phone number *" 
                  required 
                  className="form-control-custom"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Control 
                  as="textarea" 
                  rows={4} 
                  name="message"
                  placeholder="Message" 
                  className="form-control-custom"
                  value={formData.message}
                  onChange={handleChange}
                />
              </Form.Group>

              <Button 
                type="submit" 
                className="w-100 py-3 text-white fw-bold mb-5" 
                style={{ background: '#f91942', border: 'none', borderRadius: '8px' }}
                disabled={status.loading}
              >
                {status.loading ? 'SENDING...' : 'SEND'}
              </Button>
            </Form>

            <div className="d-flex justify-content-between mt-4">
              <div className="d-flex align-items-start gap-3">
                <i className="bi bi-telephone text-dark fs-4"></i>
                <div>
                  <h6 className="fw-bold mb-1" style={{ fontSize: '14px' }}>PHONE</h6>
                  <p className="text-muted mb-0" style={{ fontSize: '13px' }}>03 1345 1234</p>
                </div>
              </div>
              
              <div className="d-flex align-items-start gap-3">
                <i className="bi bi-printer text-dark fs-4"></i>
                <div>
                  <h6 className="fw-bold mb-1" style={{ fontSize: '14px' }}>FAX</h6>
                  <p className="text-muted mb-0" style={{ fontSize: '13px' }}>03 5432 1234</p>
                </div>
              </div>

              <div className="d-flex align-items-start gap-3">
                <i className="bi bi-envelope text-dark fs-4"></i>
                <div>
                  <h6 className="fw-bold mb-1" style={{ fontSize: '14px' }}>EMAIL</h6>
                  <p className="text-muted mb-0" style={{ fontSize: '13px' }}>info@muula.com</p>
                </div>
              </div>
            </div>
          </Col>
          
          <Col lg={7}>
            {/* Google Map Embed Placeholder */}
            <div className="w-100 bg-light rounded overflow-hidden shadow-sm" style={{ height: '600px' }}>
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3966.521260322283!2d106.8195613507864!3d-6.194741395493371!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e69f5390917b759%3A0x6b45e67356080477!2sPT%20Kreatif%20Media%20Karya!5e0!3m2!1sen!2sus!4v1672322336338!5m2!1sen!2sus" 
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen="" 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
                title="Muula Location"
              ></iframe>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default ContactUs;
