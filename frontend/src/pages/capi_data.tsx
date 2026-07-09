// pages/UploadDataPage.tsx
import React, { useState, useEffect } from 'react';
import { FaCalendarAlt,  FaCheck } from 'react-icons/fa';
import FetchTable from '../components/FilterForm/UploadForm';

const CapiData: React.FC = () => {
  const [type] = useState('');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);

  const allMonths = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    const now = new Date();
    const currentMonthIndex = now.getMonth();
    const currentYear = now.getFullYear();
    const lastYear = currentYear - 1;

    setAvailableYears([String(currentYear), String(lastYear)]);

    let months: string[] = [];
    if (type === 'Provisional') {
      for (let i = 1; i <= 2; i++) {
        const index = (currentMonthIndex - i + 12) % 12;
        months.push(allMonths[index]);
      }
    } else if (type === 'Final') {
      const index = (currentMonthIndex - 1 + 12) % 12;
      months.push(allMonths[index]);
    }

    setAvailableMonths(months);
    setMonth('');
  }, [type]);

  const handleCheck = () => {
    const missingFields = [];
    if (!year) missingFields.push("Year");
    if (!month) missingFields.push("Month");
    if (!type) missingFields.push("Type");

    if (missingFields.length > 0) {
      alert(`Please select: ${missingFields.join(", ")}`);
    } else {
      setShowForm(true);
    }
  };

  return (
    <div className="mx-auto">
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        
        CAPI Data
        </h2>

        <div className="flex flex-col sm:flex-row gap-6 flex-wrap mb-8">
          {/* 🔹 Type Dropdown */}
          {/* <div className="flex-1 min-w-[220px]">
            <label className="block font-semibold text-gray-700 mb-2 flex items-center gap-1">
              <FaClock className="text-blue-500" />
              Select Compile Type
            </label>
            <select
              className="w-full border border-gray-300 px-4 py-2 rounded-md focus:ring-2 focus:ring-blue-400 focus:outline-none"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="">-- Type --</option>
              <option value="Provisional">Provisional</option>
              <option value="Final">Final</option>
            </select>
          </div> */}

          {/* 🔹 Month Dropdown */}
          <div className="flex-1 min-w-[220px]">
            <label className="block font-semibold text-gray-700 mb-2 flex items-center gap-1">
              <FaCalendarAlt className="text-blue-500" />
              Select Month
            </label>
            <select
              className="w-full border border-gray-300 px-4 py-2 rounded-md focus:ring-2 focus:ring-blue-400 focus:outline-none"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              disabled={!type}
            >
              <option value="">-- Month --</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* 🔹 Year Dropdown */}
          <div className="flex-1 min-w-[220px]">
            <label className="block font-semibold text-gray-700 mb-2 flex items-center gap-1">
              <FaCalendarAlt className="text-blue-500" />
              Select Year
            </label>
            <select
              className="w-full border border-gray-300 px-4 py-2 rounded-md focus:ring-2 focus:ring-blue-400 focus:outline-none"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              disabled={!type}
            >
              <option value="">-- Year --</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* 🔹 Fetch Button */}
          <div className="flex items-end">
            <button
              onClick={handleCheck}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition duration-300 shadow-md"
            >
              <FaCheck />
              Fetch
            </button>
          </div>
        </div>

        {/* ✅ Show Verification Form */}
        {showForm && (
          <FetchTable type={type} month={month} year={year} />
        )}
      </div>
    </div>
  );
};

export default CapiData;
