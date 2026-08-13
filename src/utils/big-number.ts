import BigNumber from "bignumber.js";
export const bnDividedBy = (
  thisNumber: string | number,
  thatNumber: string | number,
  decimals?: number
) => {
  const result = new BigNumber(thisNumber).dividedBy(new BigNumber(thatNumber));
  return decimals ? result.toFixed(decimals) : result.toString();
};

export const bnMultipliedBy = (
  thisNumber: string | number,
  thatNumber: string | number,
  decimals?: number,
) => {
  const result = new BigNumber(thisNumber).times(new BigNumber(thatNumber));
  return decimals ? result.toFixed(decimals) : result.toString();
};
