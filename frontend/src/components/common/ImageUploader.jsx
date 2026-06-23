import React, { useState } from 'react';

const ImageUploader = ({ label = 'Image', onFile, accept = 'image/*', previewUrl }) => {
  const [preview, setPreview] = useState(previewUrl || null);

  const onChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    onFile?.(f);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(f);
  };

  return (
    <div className="mb-3">
      {label && <label className="form-label">{label}</label>}
      <input type="file" accept={accept} className="form-control" onChange={onChange} />
      {preview && (
        <img src={preview} alt="preview" className="mt-2 rounded" style={{ maxHeight: 160, maxWidth: '100%' }} />
      )}
    </div>
  );
};

export default ImageUploader;
