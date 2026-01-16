import AdminDashboard from "./components/AdminDashboard";
import EmployeeDashboard from "./components/EmployeeDashboard";
import NoRole from "./components/NoRole";

export const dashboardConfig = {
  admin: {
    component: AdminDashboard,
  },
  user: {
    component: EmployeeDashboard,
  },
  default: {
    component: NoRole,
  },
};
