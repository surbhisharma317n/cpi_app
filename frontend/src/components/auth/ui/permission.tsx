import { useState } from "react";

type Module = "Upload" | "Compilation" | "Reports" | "User Management";
type Action = "view" | "create" | "edit" | "delete";

const modules: Module[] = ["Upload", "Compilation", "Reports", "User Management"];
const roles = ["admin", "manager", "user"];

type Permissions = Record<string, Record<Module, Record<Action, boolean>>>;

const PermissionsComponents = () => {
  const [permissions, setPermissions] = useState<Permissions>(() => {
    const initial: Permissions = {};
    roles.forEach((role) => {
      initial[role] = {} as Record<Module, Record<Action, boolean>>;
      modules.forEach((mod) => {
        initial[role][mod] = { view: false, create: false, edit: false, delete: false };
      });
    });
    return initial;
  });

  const handleCheckboxChange = (role: string, module: Module, action: Action) => {
    setPermissions((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [module]: {
          ...prev[role][module],
          [action]: !prev[role][module][action],
        },
      },
    }));
  };

  const handleSavePermissions = (role: string) => {
    console.log(`Saved permissions for ${role}:`, permissions[role]);
    alert(`Permissions for role "${role}" saved!`);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-start justify-center pt-12 z-50 overflow-auto">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">User Permissions Control</h2>

          {roles.map((role) => (
            <div key={role} className="mb-10 border border-gray-200 rounded-xl shadow-sm p-6 bg-gray-50">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-xl font-semibold capitalize text-gray-700">{role}</h3>
                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg shadow"
                  onClick={() => handleSavePermissions(role)}
                >
                  Save
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 rounded-lg border border-gray-200">
                  <thead className="bg-blue-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider rounded-tl-lg">
                        Module
                      </th>
                      {(["view", "create", "edit", "delete"] as Action[]).map((action) => (
                        <th
                          key={action}
                          className="px-6 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider"
                        >
                          {action}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {modules.map((module) => (
                      <tr key={module} className="hover:bg-gray-100 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-600">{module}</td>
                        {(["view", "create", "edit", "delete"] as Action[]).map((action) => (
                          <td key={action} className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={permissions[role][module][action]}
                              onChange={() => handleCheckboxChange(role, module, action)}
                              className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition duration-150"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PermissionsComponents;
