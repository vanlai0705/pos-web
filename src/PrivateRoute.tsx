import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { routeConfig } from './constants/data';
import { useAuth } from './hooks/useAuth';

const PrivateRoute = () => {
  const { user } = useAuth();
  const location = useLocation();

  // POS API dùng SessionToken thay vì access_token
  if (!user?.data?.SessionToken) {
    return <Navigate to="/login" replace />;
  }

  const role = user?.info?.role;

  const allowedRoles =
    routeConfig[location.pathname] ||
    Object.entries(routeConfig)
      .filter(([path]) => location.pathname.startsWith(`${path}/`))
      .sort((a, b) => b[0].length - a[0].length)[0]?.[1];

  if (role && role !== "" && allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
};

export default PrivateRoute;
