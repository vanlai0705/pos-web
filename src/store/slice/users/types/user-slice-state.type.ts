import type { TPosLoginData, TPosUser } from "./pos-types";
import type { TPosMenuItem } from "@/utils/pos-menu-converter";

export type TUserWarehouseSelect = {
  id: number;
  name: string;
};

export type TUserSliceState = {
  auth: {
    data: TPosLoginData | null;
    isLoadding: boolean;
    error: string;
    info: TPosUser | null;
    userWareHouseSelected: TUserWarehouseSelect | null;
    menu: TPosMenuItem[];
  };
};
