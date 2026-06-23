import React from 'react';

/** Same card chrome as legacy admin tables */
const DataTableShell = ({ title, toolbar, children }) => (
  <div className="container-fluid">
    <div className="row">
      <div className="col-12">
        <div className="card my-4">
          <div className="card-header p-0 position-relative mt-n4 mx-3 z-index-2">
            <div className="bg-info shadow-dark border-radius-lg d-flex justify-content-between align-items-center">
              <h6 className="text-white text-capitalize ps-3">{title}</h6>
            </div>
          </div>
          <div className="section-body">
            <div className="card">
              <div className="card-body">
                {toolbar}
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default DataTableShell;
