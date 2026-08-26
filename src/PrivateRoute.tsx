import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { routeConfig } from './constants/data'
import { useAuth } from './hooks/useAuth'
import { hasAuthTransferHash } from './utils/auth-transfer'
import { stripDisplayedDomain } from './utils/domain-route'

const PrivateRoute = () => {
  const { user } = useAuth();
  const location = useLocation();

  // POS API dùng SessionToken thay vì access_token
  if (!user?.data?.SessionToken) {
    if (hasAuthTransferHash()) {
      return null;
    }

    return <Navigate to="/login" replace />;
  }

  const role = (user?.info as any)?.role;
  const routePathname = stripDisplayedDomain(location.pathname);

  const allowedRoles =
    routeConfig[routePathname] ||
    Object.entries(routeConfig)
      .filter(([path]) => routePathname.startsWith(`${path}/`))
      .sort((a, b) => b[0].length - a[0].length)[0]?.[1];

  if (role && role !== "" && allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
};

export default PrivateRoute;
