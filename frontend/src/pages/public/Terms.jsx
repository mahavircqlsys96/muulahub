import React, { useState, useEffect } from 'react';
import { Container } from 'react-bootstrap';
import axios from 'axios';

const Terms = () => {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('Terms & Conditions');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${import.meta.env.VITE_IMAGE_BASE}mobile/getCms?type=terms_conditions`);
        
        if (response.data && response.data.body) {
          setContent(response.data.body.content || '');
          setTitle(response.data.body.title || 'Terms & Conditions');
        } else if (response.data && response.data.content) {
          setContent(response.data.content);
          setTitle(response.data.title || 'Terms & Conditions');
        }
      } catch (error) {
        console.error('Failed to fetch Terms content', error);
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

export default Terms;
