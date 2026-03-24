import type { ReactNode } from 'react';

export interface PanelStatItem {
  key: string;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: string;
  onClick?: () => void;
}

interface PanelStatsGridProps {
  items: PanelStatItem[];
  columns?: 3 | 4;
  accentClassName?: string;
}

export const PanelStatsGrid = ({ items, columns = 4, accentClassName = '' }: PanelStatsGridProps) => (
  <div className={`admin-stats grid-${columns}`}>
    {items.map((item) => {
      const className = ['admin-stat-card', item.tone, item.onClick ? 'vendor-stat-button' : '', accentClassName]
        .filter(Boolean)
        .join(' ');

      const content = (
        <>
          <div className="admin-stat-label">{item.label}</div>
          <div className="admin-stat-value">{item.value}</div>
          {item.sub ? <div className="admin-stat-sub">{item.sub}</div> : null}
        </>
      );

      if (!item.onClick) {
        return <div key={item.key} className={className}>{content}</div>;
      }

      return (
        <button key={item.key} type="button" className={className} onClick={item.onClick}>
          {content}
        </button>
      );
    })}
  </div>
);

export interface PanelTabItem {
  key: string;
  label: string;
  count?: ReactNode;
}

interface PanelTabsProps {
  items: PanelTabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  accentClassName?: string;
}

export const PanelTabs = ({ items, activeKey, onChange, accentClassName = '' }: PanelTabsProps) => (
  <div className="admin-tabs">
    {items.map((item) => (
      <button
        key={item.key}
        className={`admin-tab ${activeKey === item.key ? `active ${accentClassName}`.trim() : ''}`}
        onClick={() => onChange(item.key)}
      >
        <span>{item.label}</span>
        {item.count !== undefined ? <span className="admin-tab-count">{item.count}</span> : null}
      </button>
    ))}
  </div>
);

interface PanelViewSummaryProps {
  chips: Array<{ key: string; label: ReactNode }>;
  clearLabel: string;
  onClear: () => void;
}

export const PanelViewSummary = ({ chips, clearLabel, onClear }: PanelViewSummaryProps) => {
  if (chips.length === 0) return null;

  return (
    <div className="admin-view-summary">
      {chips.map((chip) => (
        <span key={chip.key} className="summary-chip">{chip.label}</span>
      ))}
      <button className="summary-clear" onClick={onClear}>{clearLabel}</button>
    </div>
  );
};
