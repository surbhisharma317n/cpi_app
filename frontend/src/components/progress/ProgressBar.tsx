type ProgressBarProps = {
  label: string;
  value: number;
  max: number;
  description?: string;
};

const ProgressBar = ({ label, value, max, description }: ProgressBarProps) => {
  const percentage = Math.min((value / max) * 100, 100);
  
  return (
    <div className="space-y-1 group relative">
      <div className="flex justify-between text-sm font-medium text-gray-600">
        <span>{label}</span>
        <span>{value}/{max} ({Math.round(percentage)}%)</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ease-out ${
            label.includes("Collection") ? "bg-green-500" : "bg-yellow-500"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {description && (
        <div className="absolute hidden group-hover:block bg-gray-800 text-white text-xs p-2 rounded mt-1 z-10">
          {description}
        </div>
      )}
    </div>
  );
};

export default ProgressBar