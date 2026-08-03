import { STATUS } from '@/constants/data';
import { StatusBadge } from './ui/status-badge';




type StatusProps = {
  /** One of the STATUS codes (0 = active, 1 = locked, 2 = deleted) */
  status: number
}

export const Status: React.FC<StatusProps> = ({
  status
}) => {
  return <StatusBadge statusId={status} label={status === STATUS.ACTIVE ? 'Hoạt động' : 'Ngưng hoạt động'} />;
};
