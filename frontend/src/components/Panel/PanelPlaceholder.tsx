import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface PlaceholderAction {
  label: string;
  to: string;
}

interface PanelPlaceholderProps {
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  actions?: PlaceholderAction[];
}

const PanelPlaceholder = ({ eyebrow, title, description, bullets, actions = [] }: PanelPlaceholderProps) => {
  return (
    <section className="admin-panel">
      <div className="admin-panel-head">
        <div>
          <span className="admin-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>{eyebrow}</span>
          <h2 style={{ marginTop: 8 }}>{title}</h2>
        </div>
      </div>
      <p className="admin-muted" style={{ maxWidth: 720, lineHeight: 1.7 }}>{description}</p>
      <div className="top-products" style={{ marginTop: 20 }}>
        {bullets.map((item) => (
          <div key={item} className="top-product" style={{ alignItems: 'flex-start' }}>
            <div className="top-product-meta">
              <p className="admin-bold">{item}</p>
            </div>
          </div>
        ))}
      </div>
      {actions.length > 0 && (
        <div className="action-bar-tiles" style={{ marginTop: 20 }}>
          {actions.map((action) => (
            <Link key={action.to} to={action.to} className="action-bar-tile">
              {action.label}
              <ChevronRight size={16} />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
};

export default PanelPlaceholder;
