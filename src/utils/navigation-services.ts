// navigationService.ts
import { NavigateFunction } from "react-router-dom";

let navigate: NavigateFunction | null = null;

export const setNavigate = (navigateFunction: NavigateFunction) => {
  navigate = navigateFunction;
};

export const navigateTo = (path: string, state?: object) => {
  if (navigate) {
    navigate(path, { state });
  } else {
    console.warn("Navigate function is not set");
  }
};

export const goBack = () => {
  if (navigate) {
    navigate(-1);
  } else {
    console.warn("Navigate function is not set");
  }
};
