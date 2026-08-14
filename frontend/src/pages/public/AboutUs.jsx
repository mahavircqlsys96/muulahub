import React, { useState, useEffect } from 'react';
import { Container } from 'react-bootstrap';
import axios from 'axios';

const AboutUs = () => {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('About Us');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        // Assuming API takes slug as query param, e.g., /getCms?slug=about_us
        // or /getCms/about_us based on backend route router.get('/getCms', ...)
        const response = await axios.get(`${import.meta.env.VITE_IMAGE_BASE}mobile/getCms?type=about_us`);
        
        if (response.data && response.data.body) {
          setContent(response.data.body.content || '');
          setTitle(response.data.body.title || 'About Us');
        } else if (response.data && response.data.content) {
          setContent(response.data.content);
          setTitle(response.data.title || 'About Us');
        }
      } catch (error) {
        console.error('Failed to fetch About Us content', error);
        setContent('<p>Content is currently unavailable.</p>');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, []);

  return (
    <div className="public-page-container bg-white">
      <div className="page-header py-5 bg-light text-center">
        <Container>
          <h1 className="fw-bold text-uppercase" style={{ letterSpacing: '2px', color: '#1a1a1a' }}>
            {title}
          </h1>
        </Container>
      </div>
      
      <Container className="py-5">
        <div className="content-wrapper mx-auto" style={{ maxWidth: '900px' }}>
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <div 
              className="cms-content text-muted" 
              style={{ lineHeight: '1.8', fontSize: '15px' }}
              dangerouslySetInnerHTML={{ __html: content }} 
            />
          )}
        </div>
      </Container>
    </div>
  );
};

export default AboutUs;
