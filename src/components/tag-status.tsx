import { STATUS } from '@/constants/data';
import { Badge } from './ui/badge';




type StatusProps = {
  /** One of the STATUS codes (0 = active, 1 = locked, 2 = deleted) */
  status: number
}

export const Status: React.FC<StatusProps> = ({
  status
}) => {
  return <Badge className={status === STATUS.ACTIVE ? "bg-success" : `bg-error`}>{status === STATUS.ACTIVE ? 'Hoạt động' : 'Ngưng hoạt động'}</Badge>;
};
