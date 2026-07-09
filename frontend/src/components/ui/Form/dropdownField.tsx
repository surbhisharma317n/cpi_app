type OptionItem = { value: string; label: string };

type DropDownField = {
  [key: string]: {
    label: string;
    options: OptionItem[];
  };
};
const startYear = 2024;
const endYear = new Date().getFullYear() + 1;

const dropDownField: DropDownField = {
  month: {
    label: "Month",
    options: [
      { value: "01", label: "January" },
      { value: "02", label: "February" },
      { value: "03", label: "March" },
      { value: "04", label: "April" },
      { value: "05", label: "May" },
      { value: "06", label: "June" },
      { value: "07", label: "July" },
      { value: "08", label: "August" },
      { value: "09", label: "September" },
      { value: "10", label: "October" },
      { value: "11", label: "November" },
      { value: "12", label: "December" },
    ],
  },

  year: {
    label: "Year",
    options: Array.from({ length: endYear - startYear + 1 }, (_, i) =>
      (startYear + i).toString()
    ).map((y) => ({ value: y, label: y })),
  },

  compile_type: {
    label: "Compile Type",
    options: [
      { value: "Provisional", label: "Provisional" },
      { value: "Final", label: "Final" },
    ],
  },
};
export default dropDownField;
