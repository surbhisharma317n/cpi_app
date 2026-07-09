// components/ui/LoadingSpinner.tsx
interface LoadingSpinnerProps {
  fullScreen?: boolean;
}

export default function LoadingSpinner({ fullScreen = false }: LoadingSpinnerProps) {
  return (
    <div className={`flex items-center justify-center ${fullScreen ? 'h-screen w-screen' : 'h-full w-full'}`}>
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}