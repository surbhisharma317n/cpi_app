import React, { useMemo, useState } from "react";

// ------------------ Types ------------------
type Role = "Admin" | "Data Analyst" | "User";

type Activity = {
  id: number;
  date: string;
  type: "Login" | "Data Upload" | "Report";
  description: string;
  status: "Success" | "Failed";
};

type UserProfile = {
  id: string;
  name: string;
  role: Role;
  email: string;
  department: string;
  status: "Active" | "Inactive" | "Blocked";
  lastLogin: string;
  totalLogins: number;
  uploads: number;
  reports: number;
  downloads: number;
  activities: Activity[];
};

// ------------------ Dummy Data ------------------
const user: UserProfile = {
  id: "USR-1023",
  name: "Amit Kumar",
  role: "Admin",
  email: "amit.kumar@example.com",
  department: "Statistics & Analytics",
  status: "Active",
  lastLogin: "12 Jan 2026, 11:30 AM",
  totalLogins: 124,
  uploads: 18,
  reports: 32,
  downloads: 45,
  activities: Array.from({ length: 18 }).map((_, i) => ({
    id: i + 1,
    date: `12-01-2026 1${i}:00`,
    type: i % 3 === 0 ? "Login" : i % 3 === 1 ? "Data Upload" : "Report",
    description: "User performed an action",
    status: i % 5 === 0 ? "Failed" : "Success",
  })),
};

const PAGE_SIZE = 5;

// ------------------ Component ------------------
const UserProfileLayout: React.FC = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [filter, setFilter] = useState<"All" | Activity["type"]>("All");
  const [page, setPage] = useState(1);

  const filteredActivities = useMemo(() => {
    const data =
      filter === "All"
        ? user.activities
        : user.activities.filter((a) => a.type === filter);
    return data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }, [filter, page]);

  const totalPages = Math.ceil(
    (filter === "All"
      ? user.activities.length
      : user.activities.filter((a) => a.type === filter).length) / PAGE_SIZE
  );

  return (
    <div className={darkMode ? "dark" : ""}>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-2xl p-6 shadow">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xl font-bold">
              {user.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-semibold">{user.name}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{user.role}</p>
              <p className="text-xs text-gray-400">Last login: {user.lastLogin}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="px-3 py-1 rounded-lg text-sm bg-gray-200 dark:bg-gray-700"
            >
              {darkMode ? "Light" : "Dark"}
            </button>

            <span
              className={`px-4 py-1 rounded-full text-sm font-medium ${
                user.status === "Active"
                  ? "bg-green-100 text-green-700"
                  : user.status === "Blocked"
                  ? "bg-red-100 text-red-700"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              {user.status}
            </span>
          </div>
        </div>

        {/* Admin Actions */}
        {user.role === "Admin" && (
          <div className="flex gap-3">
            <button className="px-4 py-2 rounded-xl bg-green-600 text-white">Activate</button>
            <button className="px-4 py-2 rounded-xl bg-yellow-500 text-white">Deactivate</button>
            <button className="px-4 py-2 rounded-xl bg-red-600 text-white">Block</button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {["Logins", "Uploads", "Reports", "Downloads"].map((label, i) => {
            const values = [
              user.totalLogins,
              user.uploads,
              user.reports,
              user.downloads,
            ];
            return (
              <div key={label} className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow">
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-2xl font-semibold">{values[i]}</p>
              </div>
            );
          })}
        </div>

        {/* Activity Filters */}
        <div className="flex gap-3">
          {["All", "Login", "Data Upload", "Report"].map((t) => (
            <button
              key={t}
              onClick={() => {
                setFilter(t as any);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-sm ${
                filter === t
                  ? "bg-indigo-600 text-white"
                  : "bg-white dark:bg-gray-800"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Activity Table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Description</th>
                <th className="px-4 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredActivities.map((a) => (
                <tr key={a.id} className="border-t dark:border-gray-700">
                  <td className="px-4 py-2">{a.date}</td>
                  <td className="px-4 py-2">{a.type}</td>
                  <td className="px-4 py-2">{a.description}</td>
                  <td className={`px-4 py-2 ${a.status === "Success" ? "text-green-500" : "text-red-500"}`}>
                    {a.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex justify-between items-center mt-4">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50"
            >
              Prev
            </button>
            <span className="text-sm">Page {page} of {totalPages}</span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileLayout;
