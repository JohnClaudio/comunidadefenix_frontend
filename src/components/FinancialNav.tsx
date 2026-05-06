import React from 'react';
import { NavLink } from 'react-router-dom';
import { BarChart3, Building2, Receipt, Calculator, Search } from 'lucide-react';

const tabs = [
  { label: 'Resultados Afiliado', path: '/dashboard/financeiro/afiliado', icon: BarChart3 },
  { label: 'Resultados Empresa', path: '/dashboard/financeiro/empresa', icon: Building2 },
  { label: 'Receitas e Despesas', path: '/dashboard/financeiro/lancamentos', icon: Receipt },
  { label: 'Cálculo de Viabilidade', path: '/dashboard/financeiro/viabilidade', icon: Calculator },
  { label: 'Garimpagem', path: '/dashboard/financeiro/garimpagem', icon: Search },
];

const FinancialNav: React.FC = () => {
  return (
    <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1 scrollbar-thin">
      {tabs.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          className={({ isActive }) => `
            flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider
            whitespace-nowrap transition-all duration-200
            ${isActive
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
              : 'bg-[hsl(var(--fin-input-bg))] text-muted-foreground hover:bg-muted hover:text-foreground border border-[hsl(var(--fin-border))]'
            }
          `}
        >
          <tab.icon size={14} />
          <span className="hidden sm:inline">{tab.label}</span>
        </NavLink>
      ))}
    </div>
  );
};

export default FinancialNav;
