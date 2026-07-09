import { useForm } from 'react-hook-form';
import { useAppDispatch } from '../../app/hooks';
import { compileData, setCompilationParams } from '../../features/compilationSlice';


interface FormValues {
  compile_type:string,
  month: string;
  year: string;
  iteration:string
}

export default function CompilationForm({ setIsLoading }: { setIsLoading: (loading: boolean) => void }) {
  const dispatch = useAppDispatch();
  
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      compile_type:'',
      month: '',
      year: '',
      iteration:''
    }
  });

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      // Dispatch action to set params in Redux store
      dispatch(setCompilationParams(data));
      
      // Dispatch async thunk to perform compilation
      await dispatch(compileData(data)).unwrap();
      
      console.log('Compilation successful');
    } catch (error) {
      console.error('Compilation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Validation function (now handled in Redux)
  const validateField = (value: string, fieldName: string) => {
    if (!value) {
      return `${fieldName} is required`;
    }
    return undefined;
  };

  return (
   <form 
  id="price_filter" 
  onSubmit={handleSubmit(onSubmit)}
  className="mx-auto p-4 bg-white rounded-lg shadow-md"
>
  <div className="flex flex-col md:flex-row gap-4 items-end">
    {/* Month Select */}
    <div className="flex-1 w-full">
      <label htmlFor="compile_type" className="block text-sm font-medium text-gray-700 mb-1">
        Compile Type
      </label>
      <select
        id="compile_type"
        className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
          errors.compile_type ? 'border-red-500' : 'border-gray-300'
        }`}
        {...register('compile_type', {
          validate: (value) => validateField(value, 'compile_type')
        })}
      >
        <option value="">Select compile_type</option>
        {['provisional','final'].map(compile_type => (
          <option key={compile_type} value={compile_type}>{compile_type}</option>
        ))}
      </select>
      {errors.compile_type && (
        <p className="mt-1 text-sm text-red-600">{errors.compile_type.message}</p>
      )}
    </div>
    <div className="flex-1 w-full">
      <label htmlFor="month" className="block text-sm font-medium text-gray-700 mb-1">
        Month
      </label>
      <select
        id="month"
        className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
          errors.month ? 'border-red-500' : 'border-gray-300'
        }`}
        {...register('month', {
          validate: (value) => validateField(value, 'Month')
        })}
      >
        <option value="">Select Month</option>
        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(month => (
          <option key={month} value={month}>{month}</option>
        ))}
      </select>
      {errors.month && (
        <p className="mt-1 text-sm text-red-600">{errors.month.message}</p>
      )}
    </div>

    {/* Year Select */}
    <div className="flex-1 w-full">
      <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">
        Year
      </label>
      <select
        id="year"
        className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
          errors.year ? 'border-red-500' : 'border-gray-300'
        }`}
        {...register('year', {
          validate: (value) => validateField(value, 'Year')
        })}
      >
        <option value="">Select Year</option>
        {['2024', '2025'].map(year => (
          <option key={year} value={year}>{year}</option>
        ))}
      </select>
      {errors.year && (
        <p className="mt-1 text-sm text-red-600">{errors.year.message}</p>
      )}
    </div>
       {/* Year Select */}
    <div className="flex-1 w-full">
      <label htmlFor="iteration" className="block text-sm font-medium text-gray-700 mb-1">
        Iteration
      </label>
      <select
        id="iteration"
        className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
          errors.iteration ? 'border-red-500' : 'border-gray-300'
        }`}
        {...register('iteration', {
          validate: (value) => validateField(value, 'iteration')
        })}
      >
        <option value="">Select iteration</option>
        {['provisional', 'Final'].map(iteration => (
          <option key={iteration} value={iteration}>{iteration}</option>
        ))}
      </select>
      {errors.iteration && (
        <p className="mt-1 text-sm text-red-600">{errors.iteration.message}</p>
      )}
    </div>

    {/* Submit Button */}
    <div className="w-full md:w-auto">
      <button
        type="submit"
        id="submitBtn"
        className={`w-full md:w-auto px-6 py-2 rounded-md font-medium text-white transition-colors ${
          Object.keys(errors).length > 0 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-700'
        } flex items-center justify-center`}
        title="Please click for Compilation"
        disabled={Object.keys(errors).length > 0}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
        Compile
      </button>
    </div>
  </div>
</form>
  );
}