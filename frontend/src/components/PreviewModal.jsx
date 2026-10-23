import { useEffect, useState } from 'react';
import { fetchBlob } from '../api.js';

export default function PreviewModal({ attachment, onClose }) {
  const [objectUrl, setObjectUrl] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let url;
    let cancelled = false;
    fetchBlob(attachment.url)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setObjectUrl(url);
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [attachment.url]);

  const isImage = attachment.mimeType.startsWith('image/');
  const isEmbeddable = attachment.mimeType === 'application/pdf' || attachment.mimeType === 'text/plain';

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal wide">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h2 style={{ fontSize: 16 }}>{attachment.originalName}</h2>
          <button type="button" onClick={onClose}>Fechar</button>
        </div>

        <div className="preview">
          {error && <p>{error}</p>}
          {!error && !objectUrl && <p>Carregando…</p>}
          {objectUrl && isImage && <img src={objectUrl} alt={attachment.originalName} />}
          {objectUrl && isEmbeddable && <iframe src={objectUrl} title={attachment.originalName} />}
          {objectUrl && !isImage && !isEmbeddable && (
            <>
              <p>Sem preview para este tipo de arquivo.</p>
              <p><a href={objectUrl} download={attachment.originalName}>⬇ Baixar {attachment.originalName}</a></p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
