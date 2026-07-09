import React, { useState } from "react";
import ErrorFallback from "./error_fallback";


const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [error, setError] = useState<Error | null>(null);



  try {
    if (error) {
      return <ErrorFallback   />;
    }
    return <>{children}</>;
  } catch (err) {
    setError(err as Error);
    return <ErrorFallback   />;
  }
};

export default ErrorBoundary;
