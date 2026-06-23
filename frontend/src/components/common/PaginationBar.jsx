import React from 'react';

const ACCENT = '#3b82f6';

const PaginationBar = ({ currentPage, totalPages, onChange }) => {
  const total = Math.max(1, Number(totalPages) || 1);
  const cur = Math.min(Math.max(1, Number(currentPage) || 1), total);

  const pageNumbers = [];
  if (total <= 4) {
    for (let i = 1; i <= total; i++) pageNumbers.push(i);
  } else if (cur <= 2) {
    pageNumbers.push(1, 2, '...', total);
  } else if (cur >= total - 1) {
    pageNumbers.push(1, '...', total - 1, total);
  } else {
    pageNumbers.push(1, '...', cur, total);
  }

  return (
    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3 w-100">
      <div className="small text-muted" aria-live="polite">
        Page {cur} of {total}
      </div>
      {total > 1 && (
        <nav aria-label="Pagination" className="d-flex justify-content-end" style={{ background: 'none' }}>
          <ul className="pagination mb-0">
            {cur > 1 && (
              <li className="page-item">
                <button
                  type="button"
                  className="page-link"
                  style={{ color: ACCENT }}
                  onClick={() => onChange(cur - 1)}
                  aria-label="Previous page"
                >
                  <i className="fas fa-chevron-left" aria-hidden="true" />
                </button>
              </li>
            )}
            {pageNumbers.map((page, idx) => (
              <li key={idx} className={`page-item ${page === cur ? 'active' : ''}`}>
                {page === '...' ? (
                  <span className="page-link" style={{ color: ACCENT }}>
                    …
                  </span>
                ) : (
                  <button
                    type="button"
                    className="page-link"
                    style={{
                      color: page === cur ? 'white' : ACCENT,
                      backgroundColor: page === cur ? ACCENT : 'transparent',
                      borderColor: page === cur ? ACCENT : '#dee2e6',
                    }}
                    onClick={() => onChange(page)}
                  >
                    {page}
                  </button>
                )}
              </li>
            ))}
            {cur < total && (
              <li className="page-item">
                <button
                  type="button"
                  className="page-link"
                  style={{ color: ACCENT }}
                  onClick={() => onChange(cur + 1)}
                  aria-label="Next page"
                >
                  <i className="fas fa-chevron-right" aria-hidden="true" />
                </button>
              </li>
            )}
          </ul>
        </nav>
      )}
    </div>
  );
};

export default PaginationBar;
