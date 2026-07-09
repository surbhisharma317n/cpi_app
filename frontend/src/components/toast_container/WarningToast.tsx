import { type Toast } from "react-hot-toast";

export type WarningToastProps = {
toast: Toast;
message: string;
};

export const WarningToast = ({ toast, message }: WarningToastProps) => {
const duration = toast.duration ?? 3000; // safe fallback
const isVisible = toast.visible ?? true;

return (
<div
className={`bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded shadow transition-opacity ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
style={{ transitionDuration: `${duration}ms` }}
>
{message} </div>
);
};
