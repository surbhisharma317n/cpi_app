// // components/auth/Captcha/index.tsx
// import { UseFormRegister } from 'react-hook-form';

// interface CaptchaProps {
//   code: string;
//   onRefresh: () => void;
//   register: UseFormRegister<any>;
//   error?: {
//     message?: string;
//   };
// }

// export default function useCaptcha({ code, onRefresh, register, error }: CaptchaProps) {
//   return (
//     <div className="mb-6">
//     <div className="flex items-center mb-2">
//         <div className="flex-grow flex items-center justify-center h-[45px] border-2 border-blue-900 bg-blue-900 font-bold text-2xl tracking-widest rounded text-white relative">
//           <span className="italic px-1 relative">
//             {code}
//           </span>
//           <div className="absolute top-1/2 left-1/4 right-1/4 h-0.5 bg-white transform -translate-y-1/2 pointer-events-none"></div>
//         </div>
//         <button
//           type="button"
//           onClick={onRefresh}
//           className="ml-1 bg-blue-900 text-white px-4 py-1 text-xl rounded font-medium"
//         >
//           ↻
//         </button>
//       </div>
//       <input
//         type="text"
//         {...register('captcha', { required: 'Captcha is required' })}
//         className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//         placeholder="Enter above captcha"
//         maxLength={6}
//       />
//       {error && (
//         <p className="text-red-500 text-sm mt-1">{error.message}</p>
//       )}
     
      
//     </div>
//   );
// }