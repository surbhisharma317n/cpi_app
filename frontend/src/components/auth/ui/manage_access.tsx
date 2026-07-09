import React, { useState, useCallback, useEffect, memo } from "react";
import { useAppSelector, type AppDispatch } from "../../../app/store";
import { useDispatch } from "react-redux";
import { updateSidebarRoles } from "../../../features/base_item/sidebarSlice";

interface MenuItem {
  id: number;
  path: string;
  name: string;
  icon: string;
  roles: string[];
  children: MenuItem[];
}

interface RoleFormProps {
  data: MenuItem[];
  onSubmit: (data: MenuItem[]) => void;
  onReset: () => void;
  onClose: () => void;
  submitLabel: string;
}

const roles = [
  "PSDHead",
  "PSDAdmin",
  "admin",
  "editor",
  "viewer",
  "compiler",
  "approver",
  "reviewer",
];

const Chevron: React.FC<{ open: boolean }> = ({ open }) => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d={open ? "M19 9l-7 7-7-7" : "M9 5l7 7-7 7"}
    />
  </svg>
);

// Memoized Row Component
interface RowProps {
  item: MenuItem;
  level: number;
  expanded: Set<number>;
  toggle: (id: number) => void;
  handleRole: (id: number, role: string, checked: boolean) => void;
}

const Row: React.FC<RowProps> = memo(
  ({ item, level, expanded, toggle, handleRole }) => {
    const hasChildren = item.children.length > 0;
    const open = expanded.has(item.id);

    return (
      <>
        {/* Desktop Row */}
        <tr className="border-b hover:bg-gray-50 hidden sm:table-row">
          <td className="px-2 md:px-4 py-2">
            <div
              className="flex items-center"
              style={{ paddingLeft: level * 16 }}
            >
              {hasChildren && (
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  className="mr-2 text-gray-500 hover:text-gray-700"
                >
                  <Chevron open={open} />
                </button>
              )}
              <span className="text-sm">{item.name}</span>
            </div>
          </td>
          {roles.map((r) => (
            <td key={r} className="text-center px-2 py-2">
              <input
                type="checkbox"
                checked={item.roles.includes(r)}
                onChange={(e) => handleRole(item.id, r, e.target.checked)}
                className="h-4 w-4 text-blue-600"
              />
            </td>
          ))}
        </tr>

        {/* Mobile Row */}
        <tr className="sm:hidden">
          <td colSpan={roles.length + 2} className="px-3 py-3 border-b">
            <div className="flex items-center mb-2">
              {hasChildren && (
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  className="mr-2 text-gray-500 hover:text-gray-700"
                >
                  <Chevron open={open} />
                </button>
              )}
              <span className="font-medium">{item.name}</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {roles.map((r) => (
                <label key={r} className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={item.roles.includes(r)}
                    onChange={(e) => handleRole(item.id, r, e.target.checked)}
                    className="h-4 w-4 text-blue-600"
                  />
                  {r}
                </label>
              ))}
            </div>
          </td>
        </tr>

        {/* Render children only if expanded */}
        {hasChildren &&
          open &&
          item.children.map((c) => (
            <Row
              key={c.id}
              item={c}
              level={level + 1}
              expanded={expanded}
              toggle={toggle}
              handleRole={handleRole}
            />
          ))}
      </>
    );
  }
);

const RoleManagementForm: React.FC<RoleFormProps> = ({
  data,

  onClose,
  onReset,
  submitLabel,
}) => {
  const [menu, setMenu] = useState<MenuItem[]>(data);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [loadingLocal, setLoadingLocal] = useState(false);
  const { loading: loadingRedux } = useAppSelector((s) => s.sidebar);
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => setMenu(data), [data]);

  const toggle = useCallback((id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const updateRoles = useCallback(
    (item: MenuItem, id: number, role: string, checked: boolean): MenuItem => ({
      ...item,
      roles:
        item.id === id
          ? checked
            ? [...new Set([...item.roles, role])]
            : item.roles.filter((r) => r !== role)
          : item.roles,
      children: item.children.map((c) => updateRoles(c, id, role, checked)),
    }),
    []
  );

  const handleRole = useCallback(
    (id: number, role: string, checked: boolean) => {
      setMenu((prev) => prev.map((i) => updateRoles(i, id, role, checked)));
    },
    [updateRoles]
  );

  const handleSave = async () => {
    setLoadingLocal(true);
    try {
      await dispatch(updateSidebarRoles(menu)).unwrap(); // ✅ unwrap() to catch errors

      alert("Roles updated successfully ✅");
      onClose();
    } catch (err) {
      alert("Error updating roles ❌");
      console.error(err);
    } finally {
      setLoadingLocal(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b">
            <h3 className="text-base md:text-lg font-semibold">
              Manage Role Access
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto p-4">
            <table className="min-w-full text-xs md:text-sm border border-gray-200">
              <thead className="bg-blue-900 text-white sticky top-0 z-10 hidden sm:table-header-group">
                <tr>
                  <th className="px-2 md:px-4 py-2 text-left">Menu Item</th>
                  {roles?.map((r) => (
                    <th key={r} className="px-2 md:px-4 py-2 text-center">
                      {r}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {menu?.map((i) => (
                  <Row
                    key={i.id}
                    item={i}
                    level={0}
                    expanded={expanded}
                    toggle={toggle}
                    handleRole={handleRole}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 p-4 border-t text-sm">
            <button
              type="button"
              onClick={() => {
                setMenu(data);
                onReset();
              }}
              className="px-3 py-2 rounded bg-gray-200 hover:bg-gray-300 w-full sm:w-auto"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded bg-gray-200 hover:bg-gray-300 w-full sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 w-full sm:w-auto"
              disabled={loadingLocal || loadingRedux}
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoleManagementForm;
