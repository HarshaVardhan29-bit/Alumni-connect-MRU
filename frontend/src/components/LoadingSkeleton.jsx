/**
 * Loading Skeleton Components
 * Show placeholders while content is loading
 */

export function PostSkeleton() {
  return (
    <div className="xpost" style={{ opacity: 0.6 }}>
      <div className="xpost-av-col">
        <div className="skeleton skeleton-circle" style={{ width: 42, height: 42 }} />
      </div>
      <div className="xpost-content" style={{ flex: 1 }}>
        <div className="skeleton skeleton-text" style={{ width: '40%', height: 16, marginBottom: 8 }} />
        <div className="skeleton skeleton-text" style={{ width: '90%', height: 14, marginBottom: 6 }} />
        <div className="skeleton skeleton-text" style={{ width: '75%', height: 14, marginBottom: 6 }} />
        <div className="skeleton skeleton-text" style={{ width: '60%', height: 14 }} />
      </div>
    </div>
  );
}

export function UserCardSkeleton() {
  return (
    <div className="user-card" style={{ opacity: 0.6 }}>
      <div className="skeleton skeleton-circle" style={{ width: 60, height: 60, margin: '0 auto 12px' }} />
      <div className="skeleton skeleton-text" style={{ width: '70%', height: 16, margin: '0 auto 8px' }} />
      <div className="skeleton skeleton-text" style={{ width: '50%', height: 14, margin: '0 auto' }} />
    </div>
  );
}

export function MessageSkeleton() {
  return (
    <div style={{ padding: '1rem', opacity: 0.6 }}>
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
        <div className="skeleton skeleton-circle" style={{ width: 40, height: 40 }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton skeleton-text" style={{ width: '30%', height: 14, marginBottom: 6 }} />
          <div className="skeleton skeleton-text" style={{ width: '80%', height: 12 }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <div className="skeleton skeleton-circle" style={{ width: 40, height: 40 }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton skeleton-text" style={{ width: '30%', height: 14, marginBottom: 6 }} />
          <div className="skeleton skeleton-text" style={{ width: '60%', height: 12 }} />
        </div>
      </div>
    </div>
  );
}

// Add skeleton styles to global CSS
const skeletonStyles = `
.skeleton {
  background: linear-gradient(
    90deg,
    var(--surface-2) 0%,
    var(--surface-3) 50%,
    var(--surface-2) 100%
  );
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s ease-in-out infinite;
  border-radius: 4px;
}

.skeleton-circle {
  border-radius: 50%;
}

.skeleton-text {
  height: 14px;
  border-radius: 4px;
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
`;

// Inject styles if not already present
if (typeof document !== 'undefined' && !document.getElementById('skeleton-styles')) {
  const style = document.createElement('style');
  style.id = 'skeleton-styles';
  style.textContent = skeletonStyles;
  document.head.appendChild(style);
}

export default { PostSkeleton, UserCardSkeleton, MessageSkeleton };
