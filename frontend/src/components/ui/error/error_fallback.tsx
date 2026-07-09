import { useRouteError } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";

export default function ErrorFallback({ error, resetError }: any) {
  // For route errors
  const routeError: any = useRouteError();
  const finalError = error || routeError;
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-200 dark:from-gray-900 dark:to-gray-800">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center"
      >
        {/* Animated Warning Icon */}
        <motion.div
          animate={{ rotate: [0, -10, 10, 0] }}
          transition={{ repeat: Infinity, duration: 3 }}
          className="text-5xl"
        >
          ⚠️
        </motion.div>

        <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mt-3">
          Oops! Something went wrong
        </h1>

        <p className="mt-2 text-gray-600 dark:text-gray-300">
          {finalError?.statusText || finalError?.message || "Unexpected error"}
        </p>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={() =>
              resetError ? resetError() : (window.location.href = "/")
            }
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            🔄 Retry / Go Home
          </button>

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            {showDetails ? "Hide Details" : "Show Details"}
          </button>

          <a
            href="/support"
            className="w-full inline-block bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
          >
            📩 Contact Support
          </a>
        </div>

        {/* Error Details Panel */}
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.3 }}
            className="mt-4 p-3 rounded-md bg-gray-100 dark:bg-gray-700 text-sm text-left overflow-auto max-h-40"
          >
            <pre className="whitespace-pre-wrap break-words">
              {JSON.stringify(finalError, null, 2)}
            </pre>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
