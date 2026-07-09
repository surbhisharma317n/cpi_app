import { Outlet, NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';


const links = [
  { to: "/compile/generateindex",              label: "Compilation Program",        end: true },
  { to: "/compile/approval",     label: "Compilation Approval Status",end: false },
  { to: "/compile/viewReport",   label: "View Report"   ,       end: false       },
   { to: "/compile/view_reports",   label: "Compile Report"   ,       end: false       },
   { to: "/compile/view_charts",   label: "View charts"   ,       end: false       },
  { to: "/compile/compileTest",  label: "Experimental Compilation",  end: false  },
] as const;

/** -----------------------------------------------------------------
 *  2.  Re-usable class generator
 * ----------------------------------------------------------------- */
const tabClass = (isActive: boolean) =>
  `relative px-4 py-3 text-sm  font-medium transition-all duration-300 ${
    isActive ? "text-blue-600 bg-gray-300" : "text-blue-900 hover:text-blue-700 hover:bg-gray-200"
  }`;


function CompileLayout() {
  return (
    <div className=" mt-0">
      <motion.h4 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-xl font-bold  text-gray-800"
      >
        Compilation Module
      </motion.h4>
      
      {/* Sub-navigation for compile section */}
      <nav className="relative">
      <div className="flex space-x-1 border-b border-gray-200">
        {links.map(({ to, label, end}) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => tabClass(isActive)}>
            {({ isActive }) => (
              <>
                {label}
                {isActive && (
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                    layoutId="underline"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>

      {/* Content area with smooth transition */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="compile-content"
      >
        <Outlet />
      </motion.div>
    </div>
  );
}

export default CompileLayout;