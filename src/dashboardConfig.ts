import AdminDashboard from "./components/AdminDashboard";
import EmployeeDashboard from "./components/EmployeeDashboard";
import ManagerDashboard from "./components/ManagerDashboard";
import NoRole from "./components/NoRole";

export const dashboardConfig = {
  admin: {
    component: AdminDashboard,
  },
  employee: {
    component: EmployeeDashboard,
  },
  manager: {
    component: ManagerDashboard,
  },
  user: {
    component: EmployeeDashboard,
  },
  default: {
    component: NoRole,
  },
};
