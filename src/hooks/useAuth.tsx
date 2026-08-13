import type { TUserWarehouseSelect } from '@/store/slice/users';
import * as action from '@/store/slice/users/app';
import type { TPosUser } from '@/store/slice/users/types/pos-types';
import { useAppDispatch, useAppSelector } from '@/store/hooks'

const useAuth = () => {
  const dispatch = useAppDispatch();

  const setUser = (payload: any) => {
    dispatch(action.setUser(payload));
  };

  const setUserInfo = (payload: TPosUser) => {
    dispatch(action.setUserInfo(payload));
  };

  const setWarehouseSelected = (warehouse: TUserWarehouseSelect | null) => {
    dispatch(action.setWarehouseSelected(warehouse));
  };

  const destroyStatus = () => {
    dispatch(action.destroyStatus());
  };

  const logout = () => {
    dispatch(action.logout());
  };

  const user = useAppSelector(action.selectAuth);
  const warehouseSelected = user.userWareHouseSelected;

  return {
    user,
    warehouseSelected,
    setUser,
    setUserInfo,
    setWarehouseSelected,
    destroyStatus,
    logout,
  };
};

export { useAuth };
