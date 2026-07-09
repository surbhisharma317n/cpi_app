"use client";


type Script = {
  id: number | string;
  title: string;
  progress: number;
};

type ProgressModalProps = {
  isOpen: boolean;
  onClose: () => void;
  scripts: Script[];
};

export default function ProgressModal({ isOpen, onClose, scripts }: ProgressModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg w-full max-w-md mx-4 p-6 relative">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Progress Status
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Progress Bars */}
        <div className="space-y-3 mb-2">
          {scripts.map((s) => (
            <div key={s.id} className="w-full">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {s.title}
                </span>
                <span className="text-xs text-gray-500">{s.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${
                    s.progress === 100
                      ? "bg-green-500"
                      : s.progress > 0
                      ? "bg-blue-500"
                      : "bg-gray-400"
                  }`}
                  style={{ width: `${s.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
