import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// ==========================================
// Master Detail Layout (3-Column Layout)
// ==========================================

interface MasterDetailLayoutProps {
    children: ReactNode;
    className?: string;
}

export const MasterDetailLayout = ({ children, className }: MasterDetailLayoutProps) => {
    return (
        <div className={cn(
            "flex flex-col md:flex-row bg-background z-10",
            // Desktop: absolute positioning to fill <main>, hiding parent padding
            "md:absolute md:inset-0 md:overflow-hidden",
            className
        )}>
            {children}
        </div>
    );
};

// -- Sidebar (Secondary Menu) --

interface SidebarProps {
    children: ReactNode;
    className?: string;
    title?: string;
}

MasterDetailLayout.Sidebar = ({ children, className, title }: SidebarProps) => {
    return (
        <div className={cn(
            "w-full md:w-56 lg:w-64 shrink-0 border-b md:border-b-0 md:border-r border-border/80 bg-card/40 flex flex-col md:h-full md:overflow-y-auto custom-scrollbar transition-all",
            className
        )}>
            {title && (
                <div className="px-4 py-3 border-b border-border/50 sticky top-0 bg-card/90 backdrop-blur-md z-10 flex items-center justify-between">
                    <h2 className="font-semibold text-[15px] tracking-tight text-foreground">{title}</h2>
                </div>
            )}
            <div className="p-3 lg:p-4 flex-1 flex flex-col gap-3">
                {children}
            </div>
        </div>
    );
};

// -- Main Content Area --

interface ContentProps {
    children: ReactNode;
    className?: string;
}

MasterDetailLayout.Content = ({ children, className }: ContentProps) => {
    return (
        <div className={cn(
            "flex-1 flex flex-col md:h-full md:overflow-hidden bg-background relative",
            className
        )}>
            {children}
        </div>
    );
};

// -- Content Header --

interface HeaderProps {
    children?: ReactNode;
    className?: string;
    title?: string;
    description?: string;
}

MasterDetailLayout.Header = ({ children, className, title, description }: HeaderProps) => {
    return (
        <div className={cn(
            "flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 lg:p-5 border-b border-border/40 bg-background/95 backdrop-blur-sm shrink-0",
            className
        )}>
            <div className="flex-1">
                {title && <h1 className="text-lg lg:text-xl font-semibold tracking-tight text-foreground">{title}</h1>}
                {description && <p className="text-[13px] text-muted-foreground mt-1">{description}</p>}
            </div>
            {(children) && (
                <div className="flex items-center gap-2">
                    {children}
                </div>
            )}
        </div>
    );
};

// -- Content Body --

interface BodyProps {
    children: ReactNode;
    className?: string;
}

MasterDetailLayout.Body = ({ children, className }: BodyProps) => {
    return (
        <div className={cn(
            "p-4 lg:p-5 flex-1 md:overflow-y-auto custom-scrollbar relative",
            className
        )}>
            {children}
        </div>
    );
};

export default MasterDetailLayout;
