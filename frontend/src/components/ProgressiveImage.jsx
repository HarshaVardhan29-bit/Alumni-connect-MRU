import { useState, useEffect } from 'react';

/**
 * Progressive Image Component
 * Shows a blur placeholder while loading, then fades in the full image
 */
export default function ProgressiveImage({ 
  src, 
  placeholder, 
  alt = '', 
  className = '',
  style = {},
  onClick,
  loading = 'lazy'
}) {
  const [imgSrc, setImgSrc] = useState(placeholder || src);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const img = new Image();
    img.src = src;
    
    img.onload = () => {
      setImgSrc(src);
      setIsLoading(false);
    };

    img.onerror = () => {
      setIsLoading(false);
    };
  }, [src]);

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      style={{
        ...style,
        filter: isLoading ? 'blur(10px)' : 'none',
        transition: 'filter 0.3s ease-out',
      }}
      onClick={onClick}
      loading={loading}
    />
  );
}
