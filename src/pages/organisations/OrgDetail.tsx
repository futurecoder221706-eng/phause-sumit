import { Link, useLocation, useParams } from 'react-router-dom';
import { PageHead } from '../../components/shell/PageHead';
import type { OrganisationRecord } from './Org';

interface OrganisationLocationState {
  organisation?: OrganisationRecord;
}

function BooleanBadge({ value }: { value: boolean }) {
  return (
    <span className={`ax-badge ax-badge--soft ax-badge--pill ${value ? 'ax-badge--success' : 'ax-badge--warning'}`}>
      <span className="ax-badge__dot" />
      {value ? 'True' : 'False'}
    </span>
  );
}

function DetailItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-1)' }}>
      <dt style={{ fontSize: 'var(--ax-text-xs)', color: 'var(--ax-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </dt>
      <dd style={{ margin: 0, color: 'var(--ax-text-strong)', fontSize: 'var(--ax-text-sm)' }}>
        {children}
      </dd>
    </div>
  );
}

export function OrgDetail() {
  const { organisationId } = useParams();
  const location = useLocation();
  const { organisation } = (location.state as OrganisationLocationState | null) ?? {};

  return (
    <>
      <PageHead
        title={organisation?.name ?? 'Organisation details'}
        subtitle={organisation ? 'Complete organisation record and authorization details.' : 'The requested organisation could not be loaded.'}
        actions={
          <Link className="ax-btn ax-btn--secondary" to="/organisations/org">
            <span className="ax-btn__label">Back to organisations</span>
          </Link>
        }
      />

      {!organisation ? (
        <section className="ax-card" role="alert">
          <div className="ax-card__body">
            <h2 className="ax-card__title">Organisation not available</h2>
            <p className="ax-card__subtitle" style={{ marginBlockStart: 'var(--ax-space-2)' }}>
              No organisation data was supplied for {organisationId ?? 'this record'}. Return to the organisation list and open it again.
            </p>
          </div>
        </section>
      ) : (
        <div className="ax-dash-grid">
          <section className="ax-card ax-col--12" role="region" aria-label="Organisation details">
            <div className="ax-card__header">
              <div className="ax-card__titles">
                <span className="ax-card__eyebrow">Organisation record</span>
                <h2 className="ax-card__title">{organisation.name}</h2>
                <p className="ax-card__subtitle">{organisation.id}</p>
              </div>
              <BooleanBadge value={organisation.authAccept} />
            </div>

            <div className="ax-card__body">
              <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--ax-space-6)', margin: 0 }}>
                <DetailItem label="Organisation ID"><span className="ax-num">{organisation.id}</span></DetailItem>
                <DetailItem label="Name">{organisation.name}</DetailItem>
                <DetailItem label="Plan">{organisation.plan} months</DetailItem>
                <DetailItem label="Region">{organisation.region}</DetailItem>
                <DetailItem label="Authorization accepted"><BooleanBadge value={organisation.authAccept} /></DetailItem>
                <DetailItem label="Disclaimer enabled"><BooleanBadge value={organisation.disclaimerEnabled} /></DetailItem>
                <DetailItem label="Authorization signature">{organisation.authSignature}</DetailItem>
                <DetailItem label="Authorization date">{new Date(organisation.authAt).toLocaleString()}</DetailItem>
              </dl>
            </div>
          </section>

          <section className="ax-card ax-col--6" role="region" aria-label="Verified email domains">
            <div className="ax-card__header">
              <div className="ax-card__titles">
                <h2 className="ax-card__title">Verified email domains</h2>
                <p className="ax-card__subtitle">Approved domains for this organisation.</p>
              </div>
            </div>
            <div className="ax-card__body">
              <div className="ax-cluster" style={{ gap: 'var(--ax-space-2)', flexWrap: 'wrap' }}>
                {organisation.verifyDomain.map((domain) => (
                  <span key={domain} className="ax-badge ax-badge--soft ax-badge--pill">{domain}</span>
                ))}
              </div>
            </div>
          </section>

          <section className="ax-card ax-col--6" role="region" aria-label="Authorization reference">
            <div className="ax-card__header">
              <div className="ax-card__titles">
                <h2 className="ax-card__title">Authorization reference</h2>
                <p className="ax-card__subtitle">Supporting document for the organisation authorization.</p>
              </div>
            </div>
            <div className="ax-card__body">
              <a className="ax-link" href={organisation.authRef.url} target="_blank" rel="noreferrer">
                {organisation.authRef.label}
              </a>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export default OrgDetail;
