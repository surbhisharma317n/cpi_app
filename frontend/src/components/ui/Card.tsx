// Card.tsx
import React, { type ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className }) => {
  return (
    <div className={`bg-white shadow-md rounded-2xl p-4 ${className}`}>
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div className={`mb-2 ${className}`}>{children}</div>
);

export const CardTitle: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <h3 className={`text-lg font-semibold ${className}`}>{children}</h3>
);

export const CardContent: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div className={`mt-2 ${className}`}>{children}</div>
);
