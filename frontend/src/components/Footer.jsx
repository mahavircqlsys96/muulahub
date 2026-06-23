import React from 'react';
import { Link } from 'react-router-dom';

const Footer = React.memo(() => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="parkez-footer footer py-4">
      <div className="container-fluid">
        <div className="row align-items-center justify-content-lg-between">
          <div className="col-lg-6 mb-lg-0 mb-4 d-none">
            <div className="copyright text-center text-sm text-muted text-lg-start">
              copyright © {currentYear} &nbsp;
              <Link
                to="#"
                className="font-weight-bold"
                rel="noopener noreferrer"
              >
                Muulahub           </Link>
              , All Rights Reserved            </div>
          </div>
        </div>
      </div>
    </footer>
  );
});

export default Footer;
