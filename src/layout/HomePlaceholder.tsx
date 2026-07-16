import { PageHeader } from '../ui/PageHeader';

/**
 * Foundation-stage landing. The real overview dashboard (Part F) replaces this
 * route's component at integration.
 */
export function HomePlaceholder() {
  return (
    <>
      <PageHeader
        title="Overview"
        description="Control Plane administration."
      />
      <p className="muted">The overview dashboard loads here.</p>
    </>
  );
}
