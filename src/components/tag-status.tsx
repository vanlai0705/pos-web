import { STATUS } from '@/constants/data';
import { Badge } from './ui/badge';




type StatusProps = {
  status: string
}

export const Status: React.FC<StatusProps> = ({
  status
}) => {
  return <Badge className={status === STATUS.ACTIVE ? "bg-success" : `bg-error`}>{status === STATUS.ACTIVE ? 'Hoạt động' : 'Ngưng hoạt động'}</Badge>;
};
